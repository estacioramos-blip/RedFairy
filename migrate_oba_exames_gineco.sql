-- =============================================================================
-- migrate_oba_exames_gineco.sql
-- =============================================================================
-- Novos exames do OBA (cada exame e' gravado como COLUNA em oba_anamnese; sem a
-- coluna, salvar os exames FALHA):
--   t4_livre    (T4 Livre)      -- todos
--   prolactina  (Prolactina)    -- todos
--   beta_hcg    (Beta-hCG)      -- mulher 12-50
--   ca125       (CA 125)        -- mulher >=40 ou condicoes ginecologicas
--   ca153       (CA 15.3)       -- mulher com cancer/cistos de mama ou >=40
--
-- (Coombs Direto NAO tem coluna: e' exame SUGERIDO no relatorio, via obaEngine.)
--
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole -> Run.
-- =============================================================================

ALTER TABLE public.oba_anamnese
  ADD COLUMN IF NOT EXISTS t4_livre   numeric,
  ADD COLUMN IF NOT EXISTS prolactina numeric,
  ADD COLUMN IF NOT EXISTS beta_hcg   numeric,
  ADD COLUMN IF NOT EXISTS ca125      numeric,
  ADD COLUMN IF NOT EXISTS ca153      numeric;
