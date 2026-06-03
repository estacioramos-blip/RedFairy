-- ============================================================
-- migrate_admin_medicos.sql  (DEC-011 — Painel de Médicos no admin, fase 1)
--
-- RPC de LEITURA só-admin que lista os médicos cadastrados com estatísticas
-- de afiliado/conversão. Não altera nenhuma tabela — é puro SELECT agregado.
--
-- Regras de negócio (definidas com o Estácio):
--   • afiliado          = cep + cpf + pix_chave todos preenchidos
--   • n_triados         = nº de pacientes DISTINTOS (CPF) que o médico triou,
--                         contando triagens E avaliacoes (campo medico_crm).
--   • n_convertidos     = pacientes que se CADASTRARAM (profiles) E PAGARAM
--                         (assinaturas.status='ativa'), atribuídos ao PRIMEIRO
--                         médico que triou aquele CPF. Este é o "crédito"
--                         (contador de conversões) da fase 1.
--
-- medico_crm e medicos.crm usam o MESMO formato ("6302/BA"), então o join é direto.
-- SECURITY DEFINER + token_admin_ok: roda como owner e só responde a admin.
-- Idempotente: CREATE OR REPLACE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_listar_medicos(p_crm text, p_token text)
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
  -- triagens + avaliacoes que têm médico e paciente
  screenings AS (
    SELECT cpf, medico_crm, created_at
      FROM public.triagens
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
    UNION ALL
    SELECT cpf, medico_crm, created_at
      FROM public.avaliacoes
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
  ),
  -- primeiro médico que triou cada paciente (menor created_at)
  first_doc AS (
    SELECT DISTINCT ON (cpf) cpf, medico_crm
      FROM screenings
     ORDER BY cpf, created_at ASC
  ),
  -- pacientes convertidos: cadastrados E com assinatura ativa
  convertidos AS (
    SELECT DISTINCT p.cpf
      FROM public.profiles p
      JOIN public.assinaturas a ON a.user_id = p.id AND a.status = 'ativa'
     WHERE p.cpf IS NOT NULL
  ),
  -- nº de pacientes distintos triados por médico
  triados AS (
    SELECT medico_crm AS crm, count(DISTINCT cpf) AS n
      FROM screenings GROUP BY medico_crm
  ),
  -- conversões atribuídas ao primeiro médico de cada paciente
  conv AS (
    SELECT fd.medico_crm AS crm, count(*) AS n
      FROM first_doc fd
      JOIN convertidos c ON c.cpf = fd.cpf
     GROUP BY fd.medico_crm
  )
  SELECT jsonb_build_object(
    'ok', true,
    'medicos', COALESCE(jsonb_agg(jsonb_build_object(
      'id',            m.id,
      'nome',          m.nome,
      'crm',           m.crm,
      'uf',            m.uf,
      'celular',       m.celular,
      'email',         m.email,
      'cep',           m.cep,
      'is_admin',      m.is_admin,
      'afiliado',      (m.cep IS NOT NULL AND btrim(m.cep) <> ''
                        AND m.cpf IS NOT NULL AND btrim(m.cpf) <> ''
                        AND m.pix_chave IS NOT NULL AND btrim(m.pix_chave) <> ''),
      'n_triados',     COALESCE(t.n, 0),
      'n_convertidos', COALESCE(cv.n, 0)
    ) ORDER BY COALESCE(cv.n, 0) DESC, COALESCE(t.n, 0) DESC, m.nome), '[]'::jsonb)
  )
  INTO resultado
  FROM public.medicos m
  LEFT JOIN triados t  ON t.crm  = m.crm
  LEFT JOIN conv    cv ON cv.crm = m.crm;

  RETURN resultado;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_listar_medicos(text, text) TO anon, authenticated;
