-- ============================================================
-- migrate_comissao_fase3.sql  (DEC-011 — Comissão Pix, fase 3)
--
-- Monetiza os créditos: cada conversão (paciente que o médico triou e que
-- DEPOIS se cadastrou + pagou) vale um valor fixo em DÓLAR (config
-- comissao_usd_por_conversao, default 10). O equivalente em R$ usa a cotação
-- USD->BRL (config cotacao_dolar, atualizada manualmente no admin).
--
-- Controle de liquidação: cada linha do ledger ganha pago/data_pagamento.
-- "A pagar" = créditos não pagos × comissao_usd (× cotação = R$). O admin
-- liquida (marca como pago) por médico via admin_liquidar_comissao.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING / CREATE OR
-- REPLACE. Termina com NOTIFY pgrst (recarrega o cache do PostgREST).
-- ============================================================

-- 1) Liquidação no ledger ------------------------------------------------------
ALTER TABLE public.creditos_medico ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT false;
ALTER TABLE public.creditos_medico ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMPTZ;

-- 2) Config: valor da comissão (USD) + cotação do dólar ------------------------
INSERT INTO public.config (chave, valor, descricao) VALUES
  ('comissao_usd_por_conversao', '10', 'Valor em DÓLAR pago ao médico por paciente convertido (triado + cadastrado + pago)'),
  ('cotacao_dolar', '5.00', 'Cotação USD->BRL usada para converter a comissão dos médicos em reais (atualizar manualmente)')
ON CONFLICT (chave) DO NOTHING;

-- 3) admin_liquidar_comissao — marca como pagas as comissões de um médico ------
CREATE OR REPLACE FUNCTION public.admin_liquidar_comissao(
  p_crm text, p_token text, p_medico_crm text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  n int;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  WITH upd AS (
    UPDATE public.creditos_medico
       SET pago = true, data_pagamento = now()
     WHERE medico_crm = p_medico_crm AND NOT pago
    RETURNING 1
  )
  SELECT count(*) INTO n FROM upd;

  RETURN jsonb_build_object('ok', true, 'liquidados', n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_liquidar_comissao(text, text, text) TO anon, authenticated;

-- 4) admin_listar_medicos — agora com comissão (pendentes/pagos) + config ------
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

-- Recarrega o cache de schema do PostgREST (DDL: colunas/config/funções novas).
NOTIFY pgrst, 'reload schema';
