-- =============================================================================
-- migrate_reserva_3_meses.sql   (RESERVA de CPF expira em 3 MESES — os 3 papéis)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- Roda DEPOIS de migrate_encaminhar_cpf.sql e migrate_indicador_atribuicao_v4.sql.
--
-- REGRA (Estácio, 02/07/2026): a reserva de um CPF — feita por BARIÁTRICO (paciente-
-- indicador), por MÉDICO (RECOMENDAR/ENCAMINHAR por CPF) ou por INDICADOR — só vale
-- por 3 MESES a partir da data da reserva.
--
--   • Reserva PENDENTE com mais de 3 meses: deixa de aparecer na escolha do paciente
--     (opcoes_indicacao), não pode mais ser confirmada (confirmar_indicacao) e não
--     gera crédito (fn_credita_medico ignora encaminhamentos_medico vencidos).
--   • RE-RESERVAR renova os 3 meses: os RPCs de reserva já fazem UPDATE created_at=now()
--     quando a mesma dupla (reservador+CPF) reserva de novo — nada a mudar neles.
--   • Reserva CONFIRMADA (paciente se cadastrou e escolheu quem o indicou) NÃO expira:
--     já virou indicação de fato; o crédito sai quando ele pagar.
--   • Atribuição por QR/link no ato do cadastro (triagens/avaliacoes.medico_crm) não é
--     reserva — fica fora da regra.
--
-- As linhas vencidas NÃO são apagadas (ficam como histórico); apenas deixam de contar.
-- =============================================================================

-- 1) opcoes_indicacao — ignora reservas com mais de 3 meses ---------------------
-- (idêntica à de migrate_indicador_atribuicao_v4.sql, só com o filtro de validade
--  em encaminhamentos_medico e em indicacoes_precadastro.)
CREATE OR REPLACE FUNCTION public.opcoes_indicacao(p_cpf text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf   text := translate(coalesce(p_cpf,''), '.- /()', '');
  v_crm   text;
  v_mnome text;
  v_icod  text;
  v_inome text;
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok', false); END IF;

  -- médico referenciador mais recente (triagem/avaliação OU reserva DENTRO da validade)
  SELECT ref INTO v_crm FROM (
    SELECT medico_crm AS ref, created_at FROM public.triagens
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM public.avaliacoes
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM public.encaminhamentos_medico
      WHERE cpf_paciente = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
        AND created_at > now() - interval '3 months'          -- ← reserva vale 3 meses
  ) s ORDER BY created_at DESC LIMIT 1;
  IF v_crm IS NOT NULL THEN
    SELECT nome INTO v_mnome FROM public.medicos WHERE crm = v_crm;
  END IF;

  -- indicador: reserva pendente (não confirmada) mais recente, DENTRO da validade
  SELECT indicador_codigo INTO v_icod FROM public.indicacoes_precadastro
    WHERE cpf_paciente = v_cpf AND confirmado = false
      AND created_at > now() - interval '3 months'            -- ← reserva vale 3 meses
    ORDER BY created_at DESC LIMIT 1;
  IF v_icod IS NOT NULL THEN
    SELECT nome INTO v_inome FROM public.indicadores WHERE codigo = v_icod;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'medico',    CASE WHEN v_crm  IS NOT NULL
                      THEN jsonb_build_object('crm', v_crm, 'nome', COALESCE(NULLIF(v_mnome,''), 'CRM ' || v_crm))
                      ELSE NULL END,
    'indicador', CASE WHEN v_icod IS NOT NULL
                      THEN jsonb_build_object('codigo', v_icod, 'nome', COALESCE(NULLIF(v_inome,''), 'um indicador'))
                      ELSE NULL END
  );
END;
$function$;

-- 2) confirmar_indicacao — reserva vencida não pode mais ser confirmada ---------
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
   WHERE cpf_paciente = v_cpf AND indicador_codigo = p_codigo
     AND created_at > now() - interval '3 months';            -- ← reserva vale 3 meses
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 3) fn_credita_medico — reserva do médico vencida não gera crédito -------------
-- (idêntica à de migrate_encaminhar_cpf.sql, só com o filtro de validade no membro
--  encaminhamentos_medico do SELECT de v_medico. O v_ind continua confirmado=true,
--  sem prazo: reserva confirmada já virou indicação.)
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
        AND created_at > now() - interval '3 months'          -- ← reserva vale 3 meses
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
