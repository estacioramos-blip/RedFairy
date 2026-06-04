-- ============================================================
-- migrate_crms_sem_conta.sql  (DEC-012 — Recrutamento de afiliados)
--
-- RPC só-admin que lista os CRMs que JÁ aparecem em triagens/avaliacoes
-- (medico_crm) mas NÃO têm conta na tabela `medicos`. São médicos usando a
-- plataforma sem se cadastrar — oportunidade direta de recrutamento 4DOC.
--
-- Por CRM: nº de pacientes triados (distinct CPF) e nº que converteriam
-- (cadastraram + pagaram, atribuídos a esse CRM pela regra "1º que triou").
-- CPF normalizado (só dígitos). medico_crm já vem no formato "1234/BA".
--
-- Idempotente: CREATE OR REPLACE. Termina com NOTIFY pgrst.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_crms_sem_conta(p_crm text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  resultado jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  WITH
  screenings AS (
    SELECT regexp_replace(coalesce(cpf,''), '\D', '', 'g') AS cpf, medico_crm, created_at
      FROM public.triagens
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND coalesce(cpf,'') <> ''
    UNION ALL
    SELECT regexp_replace(coalesce(cpf,''), '\D', '', 'g') AS cpf, medico_crm, created_at
      FROM public.avaliacoes
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND coalesce(cpf,'') <> ''
  ),
  fantasmas AS (
    SELECT DISTINCT medico_crm
      FROM screenings
     WHERE medico_crm NOT IN (SELECT crm FROM public.medicos WHERE crm IS NOT NULL)
  ),
  first_doc AS (
    SELECT DISTINCT ON (cpf) cpf, medico_crm
      FROM screenings ORDER BY cpf, created_at ASC
  ),
  convertidos AS (
    SELECT DISTINCT regexp_replace(coalesce(p.cpf,''), '\D', '', 'g') AS cpf
      FROM public.profiles p
      JOIN public.assinaturas a ON a.user_id = p.id AND a.status = 'ativa'
     WHERE coalesce(p.cpf,'') <> ''
  ),
  triados AS (
    SELECT medico_crm AS crm, count(DISTINCT cpf) AS n FROM screenings GROUP BY medico_crm
  ),
  conv AS (
    SELECT fd.medico_crm AS crm, count(*) AS n
      FROM first_doc fd JOIN convertidos c ON c.cpf = fd.cpf
     GROUP BY fd.medico_crm
  )
  SELECT jsonb_build_object(
    'ok', true,
    'crms', COALESCE(jsonb_agg(jsonb_build_object(
      'crm',           f.medico_crm,
      'n_triados',     COALESCE(t.n, 0),
      'n_convertidos', COALESCE(cv.n, 0)
    ) ORDER BY COALESCE(cv.n, 0) DESC, COALESCE(t.n, 0) DESC, f.medico_crm), '[]'::jsonb)
  )
  INTO resultado
  FROM fantasmas f
  LEFT JOIN triados t  ON t.crm  = f.medico_crm
  LEFT JOIN conv    cv ON cv.crm = f.medico_crm;

  RETURN resultado;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_crms_sem_conta(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
