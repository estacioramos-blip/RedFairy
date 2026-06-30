-- =============================================================================
-- migrate_paciente_encaminhador.sql
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- Roda DEPOIS de migrate_encaminhar_cpf.sql (usa encaminhamentos_medico).
--
-- Com a Triagem aposentada, o vínculo paciente↔médico (p/ crédito) deixa de
-- vir da triagem. Duas RPCs SECURITY DEFINER (o PACIENTE não tem token de médico):
--   1) paciente_set_encaminhador(cpf, crm) — no cadastro, o paciente que chegou por
--      ?ref linka o CRM do médico (não sobrescreve uma recomendação já existente).
--   2) cpf_recomendado_por(cpf) — diz se o CPF já foi recomendado e por qual CRM
--      (dispara o modal "Opa!" da Situação 2).
-- =============================================================================

-- 1) Paciente registra o encaminhador (sem token de médico) ------------------
CREATE OR REPLACE FUNCTION public.paciente_set_encaminhador(p_cpf text, p_crm text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text; v_crm text;
BEGIN
  v_cpf := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_crm := upper(btrim(coalesce(p_crm, '')));
  IF length(v_cpf) <> 11 OR v_crm = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'dados invalidos');
  END IF;
  -- Só vincula a um médico que existe.
  IF NOT EXISTS (SELECT 1 FROM public.medicos WHERE crm = v_crm) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'medico nao encontrado');
  END IF;
  -- NÃO sobrescreve: se o médico já RECOMENDOU este CPF (medico_encaminhar_cpf),
  -- aquele vínculo prevalece. Só insere se ainda não houver.
  INSERT INTO public.encaminhamentos_medico (cpf_paciente, medico_crm, created_at)
  VALUES (v_cpf, v_crm, now())
  ON CONFLICT (cpf_paciente) DO NOTHING;
  RETURN jsonb_build_object('ok', true);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.paciente_set_encaminhador(text, text) TO anon, authenticated;

-- 2) "Esse CPF foi recomendado por qual CRM?" --------------------------------
CREATE OR REPLACE FUNCTION public.cpf_recomendado_por(p_cpf text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  WITH e AS (
    SELECT medico_crm
    FROM public.encaminhamentos_medico
    WHERE cpf_paciente = regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g')
    ORDER BY created_at DESC
    LIMIT 1
  )
  SELECT jsonb_build_object('ok', EXISTS (SELECT 1 FROM e), 'crm', (SELECT medico_crm FROM e))
$function$;
GRANT EXECUTE ON FUNCTION public.cpf_recomendado_por(text) TO anon, authenticated;
