-- ============================================================================
-- migrate_pendencias_tecnicas_ago08.sql
--
-- Cinco pendências TÉCNICAS que sobraram da simulação das réguas de dinheiro
-- (06/08). Nenhuma delas é decisão de negócio — as três que são (conferência do
-- PIX antes da comissão, renovação encerrar a assinatura anterior, e o corte de
-- Hb da maleMatrix id 3) ficaram de fora, esperando o Estácio.
--
-- Cada item foi confirmado LENDO o corpo da função no banco, não por regex.
-- ============================================================================


-- ── 1) `admin_liquidar_comissao`: arma velha ainda carregada ────────────────
--
-- Paga `creditos_medico` ignorando TUDO que as réguas novas criaram: não checa
-- `elegivel`, não checa `medicos.validado`, não checa `credito_lastreado`, e
-- deixa `valor_brl` NULL (o que faria `caixa_estornar` somar zero num estorno
-- futuro). É a versão de antes da tesouraria existir.
--
-- Hoje ela é inalcançável — conferido: `anon` sem EXECUTE, e o botão saiu do
-- Admin ("a baixa é só na Tesouraria"). Mas a irmã `admin_liquidar_indicador`
-- já foi desarmada em 05/08 pelo mesmo motivo, e esta ficou. A única coisa
-- separando a plataforma de um pagamento sem régua é um GRANT — e neste projeto
-- um REVOKE já vazou uma vez por esquecer o `FROM PUBLIC`.
--
-- Recusa e aponta o caminho certo. Não apaguei: a assinatura fica de pé e
-- voltar atrás é trocar o corpo.
CREATE OR REPLACE FUNCTION public.admin_liquidar_comissao(p_crm text, p_token text, p_medico_crm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN jsonb_build_object('ok', false, 'erro',
    'Baixa de comissao e feita apenas no CAIXA (Tesouraria), que confere validacao, elegibilidade e lastro. Use caixa_pagar_medico.');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_liquidar_comissao(text, text, text) FROM PUBLIC, anon, authenticated;


-- ── 2) `caixa_abater` estendia TODAS as assinaturas ativas ──────────────────
--
--     UPDATE assinaturas SET data_fim = ... + interval '12 months'
--      WHERE user_id = v_uid AND status = 'ativa';     -- sem LIMIT
--
-- `assinatura_registrar_pagamento` INSERE linha nova a cada pagamento e nunca
-- encerra a anterior — então um paciente que renovou tem 2+ linhas 'ativa'. Um
-- único abatimento de anuidade estendia CADA UMA por 12 meses: R$ 200 de
-- crédito viravam 24 meses de acesso em vez de 12.
--
-- Agora estende UMA linha: a que vale hoje (a de maior `data_fim`, preferindo
-- uma ainda válida) — a mesma que `assinatura_minha` mostra ao paciente.
CREATE OR REPLACE FUNCTION public.caixa_abater(p_token text, p_cpf text, p_tipo text, p_valor numeric, p_obs text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_cod text; v_c jsonb; v_saldo numeric; v_cot numeric; v_uid uuid; v_ass uuid; v_rows int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  IF p_tipo NOT IN ('anuidade','documento','pix') THEN RETURN jsonb_build_object('ok', false, 'erro', 'Tipo invalido'); END IF;
  IF coalesce(p_valor,0) <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Valor invalido'); END IF;

  SELECT codigo INTO v_cod FROM public.indicadores
   WHERE regexp_replace(coalesce(cpf,''), '\D','','g') = v_cpf
     AND COALESCE(tipo,'') = 'paciente' LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente nao e indicador'); END IF;

  PERFORM pg_advisory_xact_lock(hashtext('indic:' || v_cod));

  v_c     := public.indicador_conta(v_cod);
  v_saldo := (v_c->>'saldo_brl')::numeric;
  v_cot   := (v_c->>'cotacao')::numeric;
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;

  IF p_valor > v_saldo + 0.01 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Saldo insuficiente (saldo: R$ ' || to_char(v_saldo,'FM999990.00') || ')');
  END IF;

  IF p_tipo = 'anuidade' THEN
    SELECT id INTO v_uid FROM public.profiles WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1;
    IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente nao encontrado'); END IF;

    -- UMA linha só. Mesma ordenação do `assinatura_minha`: a válida primeiro.
    SELECT a.id INTO v_ass FROM public.assinaturas a
     WHERE a.user_id = v_uid AND a.status = 'ativa'
     ORDER BY (a.data_fim IS NULL OR a.data_fim >= now()) DESC, a.data_fim DESC NULLS LAST
     LIMIT 1;
    IF v_ass IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente sem assinatura ativa para estender'); END IF;

    UPDATE public.assinaturas
       SET data_fim = GREATEST(COALESCE(data_fim, now()), now()) + interval '12 months', updated_at = now()
     WHERE id = v_ass;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Nao foi possivel estender a assinatura'); END IF;
  END IF;

  INSERT INTO public.abatimentos_paciente (cpf_paciente, tipo, valor_brl, cotacao, obs)
  VALUES (v_cpf, p_tipo, round(p_valor,2), v_cot, NULLIF(btrim(coalesce(p_obs,'')),''));
  RETURN jsonb_build_object('ok', true, 'saldo_novo', round(v_saldo - p_valor, 2));
END; $function$;

GRANT EXECUTE ON FUNCTION public.caixa_abater(text, text, text, numeric, text) TO anon, authenticated;


-- ── 3) `caixa_pagar_medico`: validava normalizado, pagava cru ───────────────
--
--   SELECT validado ... WHERE crm = upper(btrim(p_crm))   -- normalizado
--   UPDATE creditos_medico ... WHERE medico_crm = p_crm    -- CRU
--
-- Um CRM com caixa ou espaço diferente passava na validação e o UPDATE pegava
-- ZERO linhas — devolvendo `ok: true` com n=0, como se tivesse pago. Hoje o CRM
-- vem do `caixa_a_pagar` (já normalizado), então o risco é baixo; mas "pagou 0 e
-- disse ok" é o tipo de silêncio que esta auditoria inteira existe para tirar.
CREATE OR REPLACE FUNCTION public.caixa_pagar_medico(p_token text, p_crm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_crm text; v_usd_enc numeric; v_usd_av numeric; v_cot numeric; v_n1 int; v_n2 int; v_val boolean;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;

  v_crm := upper(btrim(coalesce(p_crm,'')));   -- ⬅ uma forma só, usada em tudo

  SELECT validado INTO v_val FROM public.medicos WHERE crm = v_crm;
  IF v_val IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Medico ainda nao validado. Peca a selfie com a carteira profissional pelo WhatsApp e valide em Admin > Medicos antes de pagar.');
  END IF;

  v_usd_enc := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_nao_afiliado'), 15);
  v_cot     := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;

  UPDATE public.creditos_medico
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_enc, cotacao=v_cot, valor_brl=round(v_usd_enc*v_cot,2)
   WHERE upper(btrim(medico_crm)) = v_crm AND elegivel AND NOT pago
     AND public.credito_lastreado(assinatura_id);
  GET DIAGNOSTICS v_n1 = ROW_COUNT;

  UPDATE public.creditos_avaliacao
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_av, cotacao=v_cot, valor_brl=round(v_usd_av*v_cot,2)
   WHERE upper(btrim(medico_crm)) = v_crm AND elegivel AND NOT pago;
  GET DIAGNOSTICS v_n2 = ROW_COUNT;

  -- Nada a pagar não é sucesso: antes devolvia ok com n=0 e o tesoureiro achava
  -- que tinha quitado.
  IF (v_n1 + v_n2) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Nenhum credito elegivel e lastreado para este CRM. Confira a aba A PAGAR.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'n_enc', v_n1, 'n_av', v_n2,
    'total_brl', round((v_n1*v_usd_enc + v_n2*v_usd_av)*v_cot, 2), 'cotacao', v_cot);
END; $function$;

GRANT EXECUTE ON FUNCTION public.caixa_pagar_medico(text, text) TO anon, authenticated;


-- ── 4) `profiles` sem UNIQUE(cpf) ───────────────────────────────────────────
--
-- `register_paciente` confere duplicidade com um `EXISTS` antes de inserir —
-- que não protege contra dois cadastros simultâneos do mesmo CPF. E TUDO que
-- resolve paciente por CPF usa `LIMIT 1`: assinatura, abatimento, paywall,
-- pendências. Com dois perfis do mesmo CPF, metade do sistema olharia um e
-- metade o outro, de forma imprevisível.
--
-- Índice único sobre o CPF NORMALIZADO (a coluna aceita formatado e cru).
-- Parcial: linha sem CPF não conflita com outra sem CPF.
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_cpf_normalizado
  ON public.profiles ((regexp_replace(coalesce(cpf,''), '\D', '', 'g')))
  WHERE cpf IS NOT NULL AND btrim(cpf) <> '';


-- ── 5) Créditos pendentes não destravavam pelo caminho do OBA ───────────────
--
-- `fn_libera_creditos_pendentes` marca `creditos_medico.elegivel = true` quando
-- o médico faz a primeira avaliação COMPLETA (com ferritina). Estava só em
-- AFTER INSERT — mas `avaliacoes_salvar` no modo 'upsert' faz UPDATE quando já
-- existe linha na mesma data. O fluxo do Calculator usa 'inserir' (dispara), o
-- do OBAModal usa 'upsert' (não dispara).
--
-- Efeito: o médico completa a ferritina pelo OBA, a avaliação fica completa, e
-- os créditos de indicação dele continuam retidos — sem nada explicando por quê.
--
-- Idempotente por natureza: só mexe em linhas com `elegivel = false`.
CREATE OR REPLACE TRIGGER trg_libera_creditos_upd
  AFTER UPDATE ON public.avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_libera_creditos_pendentes();

NOTIFY pgrst, 'reload schema';
