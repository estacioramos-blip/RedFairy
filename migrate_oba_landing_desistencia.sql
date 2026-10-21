-- ============================================================================
-- migrate_oba_landing_desistencia.sql — mede quantas visitas passam dos 4s
-- ============================================================================
--
-- O QUE ERA
-- Quando o site da landing não monta em 4s (MS_ESPERA_DC no intro-ab.js), a
-- faixa desiste calada: sem impressão e sem nenhum evento. Quem passou dos 4s
-- e não clicou não deixava rastro, e a pergunta "o site está lento para
-- muita gente?" não tinha resposta. Só 2 sessões apareciam, e só porque
-- clicaram (cliques sem impressão, ago-out/2026).
--
-- O QUE FICA
--   1. O tipo 'desistencia' passa a ser aceito em oba_landing_eventos.
--   2. View oba_landing_desistencia: por variante, sessões com faixa,
--      sessões com desistência e a taxa. Conta só a partir de 22/10/2026
--      00:00 (Brasília) — o primeiro dia INTEIRO com o script novo no ar
--      (push em 21/10). Contar de antes disso poria no denominador
--      impressões de quando a desistência ainda não era registrada, e a taxa
--      sairia falsamente baixa.
--      ⚠ A taxa é sobre quem FICOU até os 4s. Quem fecha a página antes
--      disso não registra nada — nem impressão, nem desistência.
--
-- ⚠ ORDEM: rodar ESTA migration ANTES do push do intro-ab.js. Ao contrário,
--   o navegador manda 'desistencia', a constraint recusa (erro 400) e o dado
--   se perde até a migration rodar.
--
-- Sessões com faixa e sessões com desistência não se misturam: a desistência
-- grava obaIntroVista (commit 3b2b0cf), então a sessão não volta a mostrar
-- a faixa.
--
-- Regra do GRANT (CLAUDE.md, 21/10/2026): a view é nova, nasce com
-- security_invoker = on e NÃO é aberta ao anon nem ao authenticated — é
-- leitura do Estácio no SQL Editor. O REVOKE é explícito porque, até
-- 30/10/2026, o Supabase ainda dá SELECT por padrão a objeto novo.
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- ── 1. Aceitar o tipo novo ──────────────────────────────────────────────────
ALTER TABLE public.oba_landing_eventos DROP CONSTRAINT IF EXISTS oba_landing_tipo_valido;
ALTER TABLE public.oba_landing_eventos ADD CONSTRAINT oba_landing_tipo_valido
  CHECK (tipo = ANY (ARRAY['impressao'::text, 'clique'::text, 'desistencia'::text]));

-- ── 2. Leitura ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.oba_landing_desistencia
WITH (security_invoker = on) AS
WITH desde AS (SELECT timestamptz '2026-10-22 00:00:00-03' AS t),
sessoes AS (
  SELECT e.variante, e.sessao_id,
         bool_or(e.tipo = 'impressao')   AS viu_faixa,
         bool_or(e.tipo = 'desistencia') AS desistiu
    FROM public.oba_landing_eventos e, desde
   WHERE e.criado_em >= desde.t
   GROUP BY e.variante, e.sessao_id
)
SELECT variante,
       count(*) FILTER (WHERE viu_faixa OR desistiu)  AS sessoes,
       count(*) FILTER (WHERE viu_faixa)              AS com_faixa,
       count(*) FILTER (WHERE desistiu)               AS desistencias,
       round(100.0 * count(*) FILTER (WHERE desistiu)
             / NULLIF(count(*) FILTER (WHERE viu_faixa OR desistiu), 0), 1) AS desistencia_pct
  FROM sessoes
 GROUP BY variante
 ORDER BY variante;

-- Sem GRANT DE PROPÓSITO: ninguém lê esta view pelo site ou pelo app. Leitura
-- só pelo SQL Editor (postgres, dono da view e da tabela).
REVOKE ALL ON public.oba_landing_desistencia FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Conferência (rodar depois) ──────────────────────────────────────────────
-- Esperado: aceita_desistencia=true, view_invoker=true, anon_le=false
-- SELECT
--   (SELECT pg_get_constraintdef(oid) ~ 'desistencia' FROM pg_constraint
--     WHERE conname = 'oba_landing_tipo_valido')                              AS aceita_desistencia,
--   (SELECT 'security_invoker=on' = ANY (reloptions) FROM pg_class
--     WHERE relname = 'oba_landing_desistencia')                              AS view_invoker,
--   has_table_privilege('anon', 'public.oba_landing_desistencia', 'SELECT')   AS anon_le;
--
-- Leitura, depois de alguns dias de visitas:
--   SELECT * FROM public.oba_landing_desistencia;
