-- ============================================================
-- migrate_rls_fase2_triagens_rpcs.sql (RLS Fase 2, tabela 1/4: triagens)
--
-- Substitui os SELECT diretos em `triagens` (hoje acessíveis por qualquer um
-- via anon key, sem login) por 2 RPCs:
--
--   1) lookup_triagens_cpf(p_cpf) — PÚBLICA, sem token. Só campos NÃO-clínicos
--      (sexo/nascimento/bariátrica/gestante/semanas + contagem) — mesmo nível
--      de exposição que a RPC já existente lookup_cpf_triagem. Precisa ficar
--      pública porque é usada no FUNIL ANÔNIMO (visitante sem conta ainda,
--      decidindo "já te conheço"/"bateu o limite de 2 triagens grátis") —
--      nesse momento não existe token nenhum, nem de paciente nem de médico.
--   2) triagens_por_cpf(...) — gateada por token (médico OU o próprio
--      paciente). Devolve as linhas INTEIRAS (inclui hemoglobina/vcm/rdw) —
--      só pra quem já tem conta/credencial, nunca pro visitante anônimo.
--
-- O INSERT continua público (mesmo funil anônimo) — protegido só na migration
-- de ENABLE (migrate_rls_fase2_triagens_enable.sql), não aqui.
--
-- RODAR ESTA MIGRATION PRIMEIRO. Só depois de todo o código já usar as 2 RPCs
-- é que a de ENABLE deve rodar (regra de ouro: RPC antes de RLS). Reusa as
-- funções-crachá já existentes (migrate_token_sessao.sql).
-- ============================================================

CREATE OR REPLACE FUNCTION public.lookup_triagens_cpf(p_cpf text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_count int;
  v_ultima jsonb;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;

  SELECT count(*) INTO v_count
    FROM public.triagens t
   WHERE regexp_replace(coalesce(t.cpf, ''), '\D', '', 'g') = v_cpf;

  SELECT jsonb_build_object(
           'sexo', t.sexo, 'data_nascimento', t.data_nascimento,
           'bariatrica', t.bariatrica, 'gestante', t.gestante,
           'semanas_gestacao', t.semanas_gestacao, 'created_at', t.created_at
         )
    INTO v_ultima
    FROM public.triagens t
   WHERE regexp_replace(coalesce(t.cpf, ''), '\D', '', 'g') = v_cpf
   ORDER BY t.created_at DESC
   LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'count', v_count, 'ultima', v_ultima);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.lookup_triagens_cpf(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.triagens_por_cpf(
  p_cpf text,
  p_crm text DEFAULT NULL,
  p_med_token text DEFAULT NULL,
  p_pac_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  resultado jsonb;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;

  -- Ambígua: autoriza médico (qualquer CPF) OU o próprio paciente (só o dele).
  IF NOT (public.token_medico_ok(p_crm, p_med_token) OR public.token_paciente_ok(v_cpf, p_pac_token)) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO resultado
    FROM public.triagens t
   WHERE regexp_replace(coalesce(t.cpf, ''), '\D', '', 'g') = v_cpf;

  RETURN jsonb_build_object('ok', true, 'triagens', resultado);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.triagens_por_cpf(text, text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
