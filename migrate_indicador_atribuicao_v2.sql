-- =============================================================================
-- migrate_indicador_atribuicao_v2.sql   (Fase 2 — confirmação + médico sobrepõe)
-- =============================================================================
-- RASCUNHO PARA REVISÃO (o Estácio roda no Supabase Dashboard -> SQL Editor).
--
-- Regras NOVAS (em cima da Fase 1c):
--   1) A reserva de um INDICADOR só gera crédito se o PACIENTE CONFIRMAR a indicação
--      (coluna confirmado=true). Isso evita que alguém com uma lista grande de CPFs
--      bariátricos "tranque" a indicação de outras pessoas.
--   2) Uma indicação vinda de um MÉDICO (QR / triagem / avaliação) SOBREPÕE a reserva
--      do indicador: o médico prevalece (não importa quem é mais recente).
--
-- Prioridade na hora do pagamento (assinatura vira 'ativa'):
--   (1) médico_crm mais recente (triagens ∪ avaliacoes)  -> crédito do MÉDICO
--   (2) senão, reserva de indicador CONFIRMADA mais recente -> crédito do INDICADOR
--   (3) senão, nada.
-- =============================================================================

-- 1) Confirmação na reserva do indicador --------------------------------------
ALTER TABLE public.indicacoes_precadastro
  ADD COLUMN IF NOT EXISTS confirmado boolean NOT NULL DEFAULT false;

-- 2) RPC: indicador de uma reserva PENDENTE (para o paciente ver e confirmar) ---
--    Retorna a reserva NÃO confirmada mais recente do CPF (ou tem=false).
CREATE OR REPLACE FUNCTION public.indicador_da_reserva(p_cpf text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf  text := translate(coalesce(p_cpf,''), '.- /()', '');
  v_cod  text;
  v_nome text;
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT p.indicador_codigo INTO v_cod
    FROM public.indicacoes_precadastro p
    WHERE p.cpf_paciente = v_cpf AND p.confirmado = false
    ORDER BY p.created_at DESC LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok', true, 'tem', false); END IF;
  SELECT nome INTO v_nome FROM public.indicadores WHERE codigo = v_cod;
  RETURN jsonb_build_object('ok', true, 'tem', true,
                            'codigo', v_cod,
                            'nome', COALESCE(NULLIF(v_nome,''), 'um indicador'));
END;
$$;

-- 3) RPC: paciente CONFIRMA a indicação (marca confirmado=true) ----------------
CREATE OR REPLACE FUNCTION public.confirmar_indicacao(p_cpf text, p_codigo text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := translate(coalesce(p_cpf,''), '.- /()', '');
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok', false); END IF;
  UPDATE public.indicacoes_precadastro
     SET confirmado = true
   WHERE cpf_paciente = v_cpf AND indicador_codigo = p_codigo;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 4) Trigger: médico SOBREPÕE indicador; reserva só conta se CONFIRMADA ---------
CREATE OR REPLACE FUNCTION public.fn_credita_medico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  text;
  v_medico text;
  v_ind  text;
  v_orig text;
  v_rows int;
  v_nome text;
  v_pix  text;
  v_usd  numeric;
  v_usd_ind numeric;
  v_cot  numeric;
  v_cpfd text;
  v_msg  text;
  v_elegivel boolean;
BEGIN
  IF NEW.status <> 'ativa' THEN RETURN NEW; END IF;

  SELECT cpf INTO v_cpf FROM public.profiles WHERE id = NEW.user_id;
  IF v_cpf IS NULL THEN RETURN NEW; END IF;

  -- (1) MÉDICO referenciador (QR/triagem/avaliação), mais recente.
  SELECT ref INTO v_medico FROM (
    SELECT medico_crm AS ref, created_at FROM public.triagens
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM public.avaliacoes
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
  ) s
  ORDER BY created_at DESC
  LIMIT 1;

  -- (2) Reserva de INDICADOR **confirmada**, mais recente.
  SELECT indicador_codigo INTO v_ind FROM public.indicacoes_precadastro
    WHERE cpf_paciente = v_cpf AND confirmado = true
    ORDER BY created_at DESC
    LIMIT 1;

  -- Médico sobrepõe a reserva do indicador.
  v_orig := COALESCE(NULLIF(v_medico, ''), v_ind);
  IF v_orig IS NULL OR btrim(v_orig) = '' THEN RETURN NEW; END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  v_usd_ind := COALESCE(
    (SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_nao_afiliado'),
    (SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'),
    10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);
  v_cpfd := regexp_replace(coalesce(v_cpf,''), '\D', '', 'g');
  v_cpfd := CASE WHEN length(v_cpfd) = 11
                 THEN '***.' || substr(v_cpfd,4,3) || '.' || substr(v_cpfd,7,3) || '-**'
                 ELSE coalesce(v_cpf,'-') END;

  -- ── INDICADOR (código próprio) — só chega aqui se NÃO houve médico ──────────
  IF EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_orig) THEN
    INSERT INTO public.creditos_indicador (indicador_codigo, cpf_paciente, assinatura_id, elegivel)
    VALUES (v_orig, v_cpf, NEW.id, true)
    ON CONFLICT (cpf_paciente) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RETURN NEW; END IF;
    SELECT nome, COALESCE(NULLIF(pix_chave,''), usdc_wallet)
      INTO v_nome, v_pix FROM public.indicadores WHERE codigo = v_orig;
    v_msg := '💸 Nova indicação paga (INDICADOR)!' || E'\n' ||
             'Indicador: ' || COALESCE(NULLIF(v_nome,''), v_orig) || ' (' || v_orig || ')' || E'\n' ||
             'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
             'Pagar: US$ ' || to_char(v_usd_ind, 'FM999990.00') ||
             CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd_ind * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
             'Receber em: ' || COALESCE(NULLIF(v_pix,''), '(sem PIX/USDC cadastrado)');
    PERFORM public.tg_enviar(v_msg);
    RETURN NEW;
  END IF;

  -- ── MÉDICO (default — preserva CRM que indicou sem ter conta) ────────────────
  UPDATE public.profiles SET medico_origem = v_orig WHERE id = NEW.user_id;
  v_elegivel := public.medico_tem_avaliacao_completa(v_orig);

  INSERT INTO public.creditos_medico (medico_crm, cpf_paciente, assinatura_id, elegivel)
  VALUES (v_orig, v_cpf, NEW.id, v_elegivel)
  ON CONFLICT (cpf_paciente) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN NEW; END IF;
  IF NOT v_elegivel THEN RETURN NEW; END IF;

  SELECT nome, pix_chave INTO v_nome, v_pix FROM public.medicos WHERE crm = v_orig;
  v_msg := '💰 Nova comissão 4DOC!' || E'\n' ||
           'Médico: ' || COALESCE(NULLIF(v_nome,''), v_orig) || ' (CRM ' || v_orig || ')' || E'\n' ||
           'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
           'Pagar: US$ ' || to_char(v_usd, 'FM999990.00') ||
           CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
           'PIX: ' || COALESCE(NULLIF(v_pix,''), '(médico sem chave PIX cadastrada)');
  PERFORM public.tg_enviar(v_msg);
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.indicador_da_reserva(text)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_indicacao(text, text)   TO anon, authenticated;
