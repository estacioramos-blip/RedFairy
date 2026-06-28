-- =============================================================================
-- migrate_medico_avaliar.sql   (NOVO MODO MÉDICO — ENCAMINHAR x AVALIAR)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
--
-- Mudança arquitetural: o MÉDICO passa a ter DUAS funções:
--   1) ENCAMINHAR  → US$10 por paciente (já existe; via fn_credita_medico/creditos_medico).
--   2) AVALIAR     → US$15 por paciente avaliado (NOVO; 1 por médico+paciente).
--      No fim, 2 campos OPCIONAIS: (a) Opinião Médica → anexa ao relatório do OBA do
--      paciente; (b) Sugestão de melhoria → Telegram da ADM (reusa tg_enviar).
--
-- Créditos (config): comissao_usd_por_conversao = US$10 (encaminhar + INDICADOR) ·
--                    comissao_usd_nao_afiliado  = US$15 (avaliar).
--   (o indicador, que lia nao_afiliado, passa a ler por_conversao = 10.)
-- =============================================================================

-- 1) VALORES ------------------------------------------------------------------
UPDATE public.config SET valor = '10' WHERE chave = 'comissao_usd_por_conversao';
UPDATE public.config SET valor = '15' WHERE chave = 'comissao_usd_nao_afiliado';

-- 2) OPINIÃO MÉDICA (anexo do relatório do OBA) -------------------------------
-- 1 opinião por paciente (a mais recente prevalece). Lida pelo OBAModal por CPF.
CREATE TABLE IF NOT EXISTS public.opiniao_medica (
  cpf_paciente text PRIMARY KEY,
  medico_crm   text,
  texto        text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- 3) CRÉDITOS DE AVALIAÇÃO (separado do creditos_medico de encaminhamento) -----
-- 1 crédito de avaliação por médico+paciente (não repete). elegivel=true na hora.
CREATE TABLE IF NOT EXISTS public.creditos_avaliacao (
  id              bigserial PRIMARY KEY,
  medico_crm      text NOT NULL,
  cpf_paciente    text NOT NULL,
  valor           integer,
  elegivel        boolean DEFAULT true,
  pago            boolean DEFAULT false,
  data_pagamento  timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (medico_crm, cpf_paciente)
);

-- 4) fn_credita_medico — INDICADOR passa a ler comissao_usd_por_conversao (=10) --
-- (única mudança: v_usd_ind. O resto é idêntico ao atual.)
CREATE OR REPLACE FUNCTION public.fn_credita_medico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  text; v_medico text; v_ind text; v_orig text; v_rows int;
  v_nome text; v_pix text; v_usd numeric; v_usd_ind numeric; v_cot numeric;
  v_cpfd text; v_msg text; v_elegivel boolean;
BEGIN
  IF NEW.status <> 'ativa' THEN RETURN NEW; END IF;
  SELECT cpf INTO v_cpf FROM public.profiles WHERE id = NEW.user_id;
  IF v_cpf IS NULL THEN RETURN NEW; END IF;

  SELECT indicador_codigo INTO v_ind FROM public.indicacoes_precadastro
    WHERE cpf_paciente = v_cpf AND confirmado = true
    ORDER BY created_at DESC LIMIT 1;

  SELECT ref INTO v_medico FROM (
    SELECT medico_crm AS ref, created_at FROM public.triagens
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM public.avaliacoes
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
  ) s ORDER BY created_at DESC LIMIT 1;

  v_orig := COALESCE(NULLIF(v_ind, ''), NULLIF(v_medico, ''));
  IF v_orig IS NULL OR btrim(v_orig) = '' THEN RETURN NEW; END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  -- INDICADOR agora também = comissao_usd_por_conversao (US$10).
  v_usd_ind := v_usd;
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);
  v_cpfd := regexp_replace(coalesce(v_cpf,''), '\D', '', 'g');
  v_cpfd := CASE WHEN length(v_cpfd) = 11
                 THEN '***.' || substr(v_cpfd,4,3) || '.' || substr(v_cpfd,7,3) || '-**'
                 ELSE coalesce(v_cpf,'-') END;

  IF EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_orig) THEN
    INSERT INTO public.creditos_indicador (indicador_codigo, cpf_paciente, assinatura_id, elegivel)
    VALUES (v_orig, v_cpf, NEW.id, true)
    ON CONFLICT (cpf_paciente) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RETURN NEW; END IF;
    SELECT nome, COALESCE(NULLIF(pix_chave,''), usdc_wallet) INTO v_nome, v_pix
      FROM public.indicadores WHERE codigo = v_orig;
    v_msg := '💸 Nova indicação paga (INDICADOR)!' || E'\n' ||
             'Indicador: ' || COALESCE(NULLIF(v_nome,''), v_orig) || ' (' || v_orig || ')' || E'\n' ||
             'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
             'Pagar: US$ ' || to_char(v_usd_ind, 'FM999990.00') ||
             CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd_ind * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
             'Receber em: ' || COALESCE(NULLIF(v_pix,''), '(sem PIX/USDC cadastrado)');
    PERFORM public.tg_enviar(v_msg);
    RETURN NEW;
  END IF;

  UPDATE public.profiles SET medico_origem = v_orig WHERE id = NEW.user_id;
  v_elegivel := public.medico_tem_avaliacao_completa(v_orig);
  INSERT INTO public.creditos_medico (medico_crm, cpf_paciente, assinatura_id, elegivel)
  VALUES (v_orig, v_cpf, NEW.id, v_elegivel)
  ON CONFLICT (cpf_paciente) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN NEW; END IF;
  IF NOT v_elegivel THEN RETURN NEW; END IF;

  SELECT nome, pix_chave INTO v_nome, v_pix FROM public.medicos WHERE crm = v_orig;
  v_msg := '💰 Nova comissão (ENCAMINHAMENTO)!' || E'\n' ||
           'Médico: ' || COALESCE(NULLIF(v_nome,''), v_orig) || ' (CRM ' || v_orig || ')' || E'\n' ||
           'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
           'Pagar: US$ ' || to_char(v_usd, 'FM999990.00') ||
           CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
           'PIX: ' || COALESCE(NULLIF(v_pix,''), '(médico sem chave PIX cadastrada)');
  PERFORM public.tg_enviar(v_msg);
  RETURN NEW;
END;
$function$;

-- 5) RPC medico_avaliar_paciente ---------------------------------------------
-- Credita US$15 (1×/médico+paciente), grava a opinião e manda a sugestão à ADM.
CREATE OR REPLACE FUNCTION public.medico_avaliar_paciente(
  p_crm text, p_token text, p_cpf text, p_opiniao text, p_sugestao text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text; v_crm text; v_usd numeric; v_cot numeric;
  v_nome text; v_pix text; v_rows int; v_cpfd text; v_msg text; v_novo boolean := false;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  v_crm := upper(btrim(coalesce(p_crm,'')));
  v_cpf := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_nao_afiliado'), 15);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);

  -- Crédito da avaliação (idempotente: 1 por médico+paciente).
  INSERT INTO public.creditos_avaliacao (medico_crm, cpf_paciente, valor, elegivel)
  VALUES (v_crm, v_cpf, v_usd::int, true)
  ON CONFLICT (medico_crm, cpf_paciente) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_novo := (v_rows > 0);

  -- Opinião médica (anexo do relatório do OBA) — a mais recente prevalece.
  IF coalesce(btrim(p_opiniao),'') <> '' THEN
    INSERT INTO public.opiniao_medica (cpf_paciente, medico_crm, texto, created_at)
    VALUES (v_cpf, v_crm, btrim(p_opiniao), now())
    ON CONFLICT (cpf_paciente) DO UPDATE
      SET texto = EXCLUDED.texto, medico_crm = EXCLUDED.medico_crm, created_at = now();
  END IF;

  v_cpfd := '***.' || substr(v_cpf,4,3) || '.' || substr(v_cpf,7,3) || '-**';

  -- Telegram: crédito da avaliação (só quando é novo).
  IF v_novo THEN
    SELECT nome, pix_chave INTO v_nome, v_pix FROM public.medicos WHERE crm = v_crm;
    v_msg := '🩺 Nova AVALIAÇÃO médica!' || E'\n' ||
             'Médico: ' || COALESCE(NULLIF(v_nome,''), v_crm) || ' (CRM ' || v_crm || ')' || E'\n' ||
             'Avaliou o paciente ' || v_cpfd || '.' || E'\n' ||
             'Pagar: US$ ' || to_char(v_usd, 'FM999990.00') ||
             CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
             'PIX: ' || COALESCE(NULLIF(v_pix,''), '(médico sem chave PIX cadastrada)');
    PERFORM public.tg_enviar(v_msg);
  END IF;

  -- Telegram: sugestão de melhoria (sempre que houver).
  IF coalesce(btrim(p_sugestao),'') <> '' THEN
    PERFORM public.tg_enviar('💡 SUGESTÃO DE MELHORIA (CRM ' || v_crm || ', paciente ' || v_cpfd || '):' || E'\n' || btrim(p_sugestao));
  END IF;

  RETURN jsonb_build_object('ok', true, 'credito_novo', v_novo, 'valor_usd', v_usd);
END;
$function$;

-- 6) listar_creditos_medico — agora com os DOIS tipos (encaminhar + avaliar) ---
CREATE OR REPLACE FUNCTION public.listar_creditos_medico(p_crm text, p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cad int; v_rec int; v_arec int; v_pend int;
  v_av int; v_av_rec int; v_av_arec int;
  v_usd numeric; v_usd_av numeric; v_cot numeric; v_pix text; v_crm text;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  v_crm := upper(btrim(coalesce(p_crm,'')));

  -- ENCAMINHAMENTO (creditos_medico)
  SELECT count(*),
         count(*) FILTER (WHERE pago),
         count(*) FILTER (WHERE elegivel AND NOT pago),
         count(*) FILTER (WHERE NOT elegivel AND NOT pago)
    INTO v_cad, v_rec, v_arec, v_pend
    FROM public.creditos_medico WHERE medico_crm = v_crm;

  -- AVALIAÇÃO (creditos_avaliacao)
  SELECT count(*), count(*) FILTER (WHERE pago), count(*) FILTER (WHERE NOT pago)
    INTO v_av, v_av_rec, v_av_arec
    FROM public.creditos_avaliacao WHERE medico_crm = v_crm;

  v_usd    := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  v_usd_av := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_nao_afiliado'), 15);
  v_cot    := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);
  SELECT pix_chave INTO v_pix FROM public.medicos WHERE crm = v_crm;

  RETURN jsonb_build_object('ok', true,
    'cadastrados', COALESCE(v_cad,0), 'recebidos', COALESCE(v_rec,0),
    'a_receber', COALESCE(v_arec,0), 'pendentes_elegib', COALESCE(v_pend,0),
    'avaliacoes', COALESCE(v_av,0), 'aval_recebidas', COALESCE(v_av_rec,0),
    'aval_a_receber', COALESCE(v_av_arec,0),
    'valor_usd', v_usd, 'valor_usd_avaliacao', v_usd_av,
    'cotacao', v_cot, 'pix', COALESCE(v_pix,''));
END;
$function$;

-- (conferência)
-- SELECT chave, valor FROM public.config WHERE chave LIKE 'comissao%';
