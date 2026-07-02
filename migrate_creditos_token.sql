-- =============================================================================
-- migrate_creditos_token.sql   (M4 — painel de créditos do indicador com TOKEN)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- ⚠ Rodar DEPOIS do deploy do app (o front novo já envia p_token; o front antigo
--   sem token passa a receber "Sessao invalida" — janela curta, ambiente de teste).
--
-- ANTES: listar_creditos_indicador(codigo) aceitava só o código — que é PÚBLICO no
-- link/QR (formato previsível INDxxxxxx). Qualquer um podia enumerar códigos e ver
-- os metadados do painel (contagens, CPFs mascarados, datas). A própria migração
-- original anotava: "Endurecer depois com token de sessão." — é isto aqui.
--
-- AGORA: exige token válido de UM dos dois donos legítimos:
--   (a) INDICADOR logado (indicadores.session_token_hash — login_indicador), ou
--   (b) PACIENTE-indicador logado (profiles.session_token_hash do CPF dono do
--       código — o paciente acessa o painel pela sessão de paciente, sem senha
--       própria de indicador).
--
-- BÔNUS (bug de exibição): a versão antiga lia comissao_usd_nao_afiliado PRIMEIRO
-- para exibir a comissão — mas essa chave foi REPROPOSITADA (migrate_medico_avaliar:
-- agora é o US$15 do AVALIAR do médico). O painel mostrava US$15 enquanto o crédito
-- real (fn_credita_medico) paga comissao_usd_por_conversao (US$10). Agora exibe a
-- mesma chave que paga.
-- =============================================================================

-- A assinatura muda (1 arg → 2 args): DROP evita que a versão SEM token continue
-- exposta como overload.
DROP FUNCTION IF EXISTS public.listar_creditos_indicador(text);

CREATE OR REPLACE FUNCTION public.listar_creditos_indicador(p_codigo text, p_token text DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_ok   boolean;
  v_usd  numeric;
  v_pre  jsonb;
  v_cred jsonb;
BEGIN
  IF coalesce(p_token, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida. Entre de novo.');
  END IF;

  -- (a) indicador logado  OU  (b) paciente-indicador (sessão de paciente do CPF dono do código)
  SELECT EXISTS (
    SELECT 1 FROM public.indicadores i
     WHERE i.codigo = p_codigo
       AND i.session_token_hash = encode(digest(p_token, 'sha256'), 'hex')
       AND i.session_token_exp > now()
  ) OR EXISTS (
    SELECT 1
      FROM public.indicadores i
      JOIN public.profiles pr
        ON regexp_replace(coalesce(pr.cpf,''), '\D', '', 'g') =
           regexp_replace(coalesce(i.cpf,''),  '\D', '', 'g')
     WHERE i.codigo = p_codigo
       AND pr.session_token_hash = encode(digest(p_token, 'sha256'), 'hex')
       AND pr.session_token_exp > now()
  ) INTO v_ok;

  IF NOT v_ok THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida. Entre de novo.');
  END IF;

  -- Comissão EXIBIDA = a mesma chave que PAGA (comissao_usd_por_conversao).
  -- (comissao_usd_nao_afiliado foi repropositada p/ o AVALIAR do médico — não ler aqui.)
  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'cpf',  '…' || right(regexp_replace(cpf_paciente, '\D', '', 'g'), 3),
           'data', created_at) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_pre FROM public.indicacoes_precadastro WHERE indicador_codigo = p_codigo;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'cpf',  '…' || right(regexp_replace(cpf_paciente, '\D', '', 'g'), 3),
           'pago', pago,
           'data', created_at) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_cred FROM public.creditos_indicador WHERE indicador_codigo = p_codigo;

  RETURN jsonb_build_object('ok', true, 'comissao_usd', v_usd, 'precadastros', v_pre, 'creditos', v_cred);
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_creditos_indicador(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
