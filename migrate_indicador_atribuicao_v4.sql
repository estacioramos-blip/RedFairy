-- =============================================================================
-- migrate_indicador_atribuicao_v4.sql   (Fase 2 — escolha médico × indicador)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- Roda DEPOIS de migrate_encaminhar_cpf.sql e migrate_indicador_reservar.sql.
--
-- Dois ajustes pra a escolha "VOCÊ FOI INDICADO POR" funcionar com as reservas novas:
--   1) opcoes_indicacao: passa a detectar o MÉDICO também por encaminhamentos_medico
--      (RESERVAR/RECOMENDAR/QR) — antes só via triagens/avaliacoes (e a triagem foi aposentada).
--   2) indicador_reservar_cpf: a reserva do indicador fica PENDENTE (confirmado=false),
--      pra o paciente escolher. confirmar_indicacao() a torna confirmada quando escolhida.
--
-- Regra de crédito (fn_credita_medico, já existente): indicador CONFIRMADO (confirmado=true)
-- prevalece; senão, o médico (encaminhamentos_medico) recebe. Ou seja: escolher o indicador
-- confirma a reserva dele; escolher o médico deixa a do indicador pendente → médico recebe.
-- =============================================================================

-- 1) opcoes_indicacao — médico também via encaminhamentos_medico -----------------
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

  -- médico referenciador mais recente (triagem/avaliação OU encaminhamento/reserva/QR)
  SELECT ref INTO v_crm FROM (
    SELECT medico_crm AS ref, created_at FROM public.triagens
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM public.avaliacoes
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM public.encaminhamentos_medico
      WHERE cpf_paciente = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
  ) s ORDER BY created_at DESC LIMIT 1;
  IF v_crm IS NOT NULL THEN
    SELECT nome INTO v_mnome FROM public.medicos WHERE crm = v_crm;
  END IF;

  -- indicador: reserva pendente (não confirmada) mais recente
  SELECT indicador_codigo INTO v_icod FROM public.indicacoes_precadastro
    WHERE cpf_paciente = v_cpf AND confirmado = false
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

-- 2) indicador_reservar_cpf — reserva PENDENTE (confirmado=false) ----------------
CREATE OR REPLACE FUNCTION public.indicador_reservar_cpf(p_codigo text, p_cpf text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text; v_cod text; v_ja boolean;
BEGIN
  v_cod := btrim(coalesce(p_codigo, ''));
  v_cpf := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_cod) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Indicador nao encontrado');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE cpf = v_cpf) INTO v_ja;

  -- Reserva PENDENTE: o paciente confirma (e escolhe, se houver médico) no cadastro.
  IF EXISTS (SELECT 1 FROM public.indicacoes_precadastro WHERE cpf_paciente = v_cpf AND indicador_codigo = v_cod) THEN
    UPDATE public.indicacoes_precadastro
       SET created_at = now()
     WHERE cpf_paciente = v_cpf AND indicador_codigo = v_cod;
  ELSE
    INSERT INTO public.indicacoes_precadastro (cpf_paciente, indicador_codigo, confirmado)
    VALUES (v_cpf, v_cod, false);
  END IF;

  RETURN jsonb_build_object('ok', true, 'ja_cadastrado', v_ja);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.indicador_reservar_cpf(text, text) TO anon, authenticated;
