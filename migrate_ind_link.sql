-- =============================================================================
-- migrate_ind_link.sql   (B2 — link do INDICADOR com param próprio ?ind=)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- Roda DEPOIS de migrate_reserva_3_meses.sql (preserva a validade de 3 meses).
--
-- CONTEXTO (auditoria 02/07/2026, achado B2): o ?ref= servia a DOIS papéis — CRM do
-- médico e código INDxxxxxx do indicador. O código do indicador vazava pro campo
-- medico_crm (triagens/avaliacoes), a UI rotulava o indicador como "médico" na escolha
-- "VOCÊ FOI INDICADO POR", e qualquer string inválida em medico_crm gerava crédito
-- órfão que TRAVAVA a atribuição futura do CPF (ON CONFLICT DO NOTHING).
--
-- O frontend agora: gera ?ind=CODIGO pro indicador (links antigos ?ref=INDxxxxxx
-- seguem funcionando — o App detecta pelo formato), guarda em chave própria
-- (rf_ind_codigo) e cria a reserva PENDENTE via indicador_reservar_cpf no
-- login/cadastro do indicado. Ou seja: o link do indicador entra na MESMA régua da
-- reserva por CPF (rótulo certo, validade de 3 meses, crédito via confirmação).
--
-- Este SQL ajusta o lado do banco:
--   1) opcoes_indicacao: código de indicador que tenha vazado pra medico_crm (links
--      antigos, dados legados) vira a opção INDICADOR (rótulo certo), e a opção
--      MÉDICO só sai com formato de CRM (NNNN/UF).
--   2) fn_credita_medico: só credita como MÉDICO se o valor tem formato de CRM —
--      lixo não gera mais crédito órfão nem trava o CPF. (Código de indicador que
--      chegue por medico_crm legado continua creditando o indicador certo, como já
--      fazia, pelo EXISTS em indicadores.)
-- =============================================================================

-- 1) opcoes_indicacao ----------------------------------------------------------
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

  -- referenciador mais recente (triagem/avaliação OU reserva DENTRO da validade)
  SELECT ref INTO v_crm FROM (
    SELECT medico_crm AS ref, created_at FROM public.triagens
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM public.avaliacoes
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM public.encaminhamentos_medico
      WHERE cpf_paciente = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
        AND created_at > now() - interval '3 months'          -- reserva vale 3 meses
  ) s ORDER BY created_at DESC LIMIT 1;

  -- indicador: reserva pendente (não confirmada) mais recente, DENTRO da validade
  SELECT indicador_codigo INTO v_icod FROM public.indicacoes_precadastro
    WHERE cpf_paciente = v_cpf AND confirmado = false
      AND created_at > now() - interval '3 months'            -- reserva vale 3 meses
    ORDER BY created_at DESC LIMIT 1;

  -- (B2) LEGADO: código de indicador que vazou pra medico_crm (links antigos ?ref=IND...)
  -- NÃO é médico — vira a opção INDICADOR (se não há reserva pendente mais recente).
  IF v_crm IS NOT NULL AND EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_crm) THEN
    IF v_icod IS NULL THEN v_icod := v_crm; END IF;
    v_crm := NULL;
  END IF;
  -- (B2) A opção MÉDICO só sai com formato de CRM (NNNN/UF) — lixo não vira "CRM XYZ".
  IF v_crm IS NOT NULL AND v_crm !~ '^[0-9]+\s*/\s*[A-Z]{2}$' THEN
    v_crm := NULL;
  END IF;

  IF v_crm IS NOT NULL THEN
    SELECT nome INTO v_mnome FROM public.medicos WHERE crm = v_crm;
  END IF;
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

-- 2) fn_credita_medico ----------------------------------------------------------
-- (idêntica à de migrate_reserva_3_meses.sql, + o portão de formato antes do crédito
--  de MÉDICO: v_orig sem formato de CRM não credita nem trava o CPF.)
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
        AND created_at > now() - interval '3 months'          -- reserva vale 3 meses
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

  -- (B2) PORTÃO DE FORMATO: só credita como MÉDICO se v_orig parece um CRM (NNNN/UF).
  -- Sem isto, uma string inválida gerava crédito órfão (invisível no ADM) e o
  -- ON CONFLICT (cpf_paciente) DO NOTHING travava a atribuição futura do CPF pra sempre.
  -- (CRM que ainda não tem conta CONTINUA creditando — checagem é de formato, não de cadastro.)
  IF v_orig !~ '^[0-9]+\s*/\s*[A-Z]{2}$' THEN RETURN NEW; END IF;

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
