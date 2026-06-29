-- =============================================================================
-- migrate_encaminhar_cpf.sql   (ENCAMINHAR via CPF — médico digita o CPF)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- Roda DEPOIS de migrate_medico_avaliar.sql (reusa aquela versão de fn_credita_medico).
--
-- O médico pode ENCAMINHAR um paciente sem o link/QR: digita o CPF e isso registra a
-- intenção (CPF → CRM). Quando ESSE paciente se cadastrar e pagar, o crédito de
-- encaminhamento (US$10) vai pro médico — fn_credita_medico passa a olhar esta tabela
-- como mais uma fonte do "médico de origem" (a mais recente prevalece, como já era).
-- =============================================================================

-- 1) Tabela de encaminhamentos por CPF ---------------------------------------
CREATE TABLE IF NOT EXISTS public.encaminhamentos_medico (
  cpf_paciente text PRIMARY KEY,
  medico_crm   text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- 2) RPC: médico registra o encaminhamento por CPF ---------------------------
CREATE OR REPLACE FUNCTION public.medico_encaminhar_cpf(p_crm text, p_token text, p_cpf text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text; v_crm text; v_ja boolean;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  v_crm := upper(btrim(coalesce(p_crm,'')));
  v_cpf := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;

  -- Paciente já cadastrado? (front pode avisar "esse paciente já faz parte do Projeto")
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE cpf = v_cpf) INTO v_ja;

  -- Registra a intenção (a mais recente prevalece — coerente com o ORDER BY DESC do crédito).
  INSERT INTO public.encaminhamentos_medico (cpf_paciente, medico_crm, created_at)
  VALUES (v_cpf, v_crm, now())
  ON CONFLICT (cpf_paciente) DO UPDATE SET medico_crm = EXCLUDED.medico_crm, created_at = now();

  RETURN jsonb_build_object('ok', true, 'cpf', v_cpf, 'ja_cadastrado', v_ja);
END;
$function$;

-- 3) fn_credita_medico — agora também olha encaminhamentos_medico (CPF→CRM) ----
-- (idêntica à de migrate_medico_avaliar.sql, só com a 3ª fonte no SELECT do v_medico.)
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
    UNION ALL
    SELECT medico_crm, created_at FROM public.encaminhamentos_medico
      WHERE cpf_paciente = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
  ) s ORDER BY created_at DESC LIMIT 1;

  v_orig := COALESCE(NULLIF(v_ind, ''), NULLIF(v_medico, ''));
  IF v_orig IS NULL OR btrim(v_orig) = '' THEN RETURN NEW; END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
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
