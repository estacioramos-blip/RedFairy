-- ============================================================
-- migrate_prescricoes.sql  (DEC-012 — Analytics de prescrições p/ negociação 4DOC)
--
-- RPC só-admin que conta as INDICAÇÕES de tratamento registradas nas avaliações
-- e atribui à MARCA ATIVA de cada categoria (a que a plataforma prescreve). É a
-- alavanca de negociação com os fabricantes ("sua marca recebeu N prescrições").
--
-- Fonte real: flags de tratamento na tabela `avaliacoes`. O contador
-- `prescricoes_emitidas` (catálogo) NÃO é usado — era um mecanismo paralelo furado.
--
-- Mapeamento flag -> categoria do catálogo (o Estácio pode revisar):
--   ferro_injetavel -> Ferro EV (medicamentos, AS DUAS classes ativas recebem)
--   ferro_oral      -> suplementos categoria 'ferro_oral'
--   vitb12_im       -> 'b12_injetavel'
--   vitb12_sl       -> 'b12_sublingual'
--   vitamina_b12    -> 'b12_oral'
--   bariatrica      -> 'polivitaminico_bariatrico'
--
-- ⚠️ Atribui à marca ATIVA atual (se trocar a marca ativa, o histórico migra).
-- Rastreio por marca ao longo do tempo = fase 2 (log no atendimento).
--
-- Idempotente: CREATE OR REPLACE. Termina com NOTIFY pgrst.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_prescricoes(p_crm text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  resultado jsonb;
  f_ferro_ev   int;
  f_ferro_oral int;
  f_b12_im     int;
  f_b12_sl     int;
  f_b12_oral   int;
  f_bari       int;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT
    count(*) FILTER (WHERE ferro_injetavel IS TRUE),
    count(*) FILTER (WHERE ferro_oral      IS TRUE),
    count(*) FILTER (WHERE vitb12_im       IS TRUE),
    count(*) FILTER (WHERE vitb12_sl       IS TRUE),
    count(*) FILTER (WHERE vitamina_b12    IS TRUE),
    count(*) FILTER (WHERE bariatrica      IS TRUE)
  INTO f_ferro_ev, f_ferro_oral, f_b12_im, f_b12_sl, f_b12_oral, f_bari
  FROM public.avaliacoes;

  WITH marcas AS (
    SELECT nome_comercial AS marca, fabricante,
           'Ferro EV (' || classe || ')' AS categoria, f_ferro_ev AS n
      FROM public.medicamentos WHERE ativo IS TRUE
    UNION ALL
    SELECT nome_comercial, fabricante, categoria,
           CASE categoria
             WHEN 'ferro_oral'                THEN f_ferro_oral
             WHEN 'b12_injetavel'             THEN f_b12_im
             WHEN 'b12_sublingual'            THEN f_b12_sl
             WHEN 'b12_oral'                  THEN f_b12_oral
             WHEN 'polivitaminico_bariatrico' THEN f_bari
             ELSE 0
           END
      FROM public.suplementos WHERE ativo IS TRUE
  ),
  meses AS (
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes,
           sum( (ferro_injetavel IS TRUE)::int + (ferro_oral IS TRUE)::int
              + (vitb12_im IS TRUE)::int + (vitb12_sl IS TRUE)::int
              + (vitamina_b12 IS TRUE)::int + (bariatrica IS TRUE)::int ) AS n
      FROM public.avaliacoes
     WHERE created_at IS NOT NULL
     GROUP BY 1
  )
  SELECT jsonb_build_object(
    'ok', true,
    'por_marca', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'marca', marca, 'fabricante', fabricante, 'categoria', categoria, 'n', n
      ) ORDER BY n DESC, marca) FROM marcas), '[]'::jsonb),
    'por_mes', COALESCE((SELECT jsonb_agg(jsonb_build_object('mes', mes, 'n', n) ORDER BY mes) FROM meses), '[]'::jsonb)
  ) INTO resultado;

  RETURN resultado;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_prescricoes(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
