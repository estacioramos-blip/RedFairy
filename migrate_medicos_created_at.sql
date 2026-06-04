-- ============================================================
-- migrate_medicos_created_at.sql  (DEC-011 — gráfico de crescimento)
--
-- admin_listar_medicos passa a devolver created_at de cada médico, pro
-- gráfico de crescimento de afiliados no 4DOC (cumulativo por mês).
-- Só adiciona o campo; resto idêntico à versão da fase 3.
--
-- Idempotente: CREATE OR REPLACE. Termina com NOTIFY pgrst.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_listar_medicos(p_crm text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  resultado jsonb;
  v_comissao_usd numeric;
  v_cotacao      numeric;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  v_comissao_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  v_cotacao      := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);

  WITH
  screenings AS (
    SELECT cpf, medico_crm FROM public.triagens
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
    UNION ALL
    SELECT cpf, medico_crm FROM public.avaliacoes
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
  ),
  triados AS (
    SELECT medico_crm AS crm, count(DISTINCT cpf) AS n FROM screenings GROUP BY medico_crm
  ),
  conv AS (
    SELECT medico_crm AS crm,
           count(*)                          AS n,
           count(*) FILTER (WHERE NOT pago)  AS pendentes,
           count(*) FILTER (WHERE pago)      AS pagos
      FROM public.creditos_medico GROUP BY medico_crm
  )
  SELECT jsonb_build_object(
    'ok', true,
    'comissao_usd', v_comissao_usd,
    'cotacao_dolar', v_cotacao,
    'medicos', COALESCE(jsonb_agg(jsonb_build_object(
      'id',                 m.id,
      'nome',               m.nome,
      'crm',                m.crm,
      'uf',                 m.uf,
      'celular',            m.celular,
      'email',              m.email,
      'cep',                m.cep,
      'pix_chave',          m.pix_chave,
      'is_admin',           m.is_admin,
      'created_at',         m.created_at,
      'afiliado',           (m.cep IS NOT NULL AND btrim(m.cep) <> ''
                             AND m.cpf IS NOT NULL AND btrim(m.cpf) <> ''
                             AND m.pix_chave IS NOT NULL AND btrim(m.pix_chave) <> ''),
      'n_triados',          COALESCE(t.n, 0),
      'n_convertidos',      COALESCE(cv.n, 0),
      'creditos_pendentes', COALESCE(cv.pendentes, 0),
      'creditos_pagos',     COALESCE(cv.pagos, 0)
    ) ORDER BY COALESCE(cv.pendentes, 0) DESC, COALESCE(cv.n, 0) DESC, m.nome), '[]'::jsonb)
  )
  INTO resultado
  FROM public.medicos m
  LEFT JOIN triados t  ON t.crm  = m.crm
  LEFT JOIN conv    cv ON cv.crm = m.crm;

  RETURN resultado;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_listar_medicos(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
