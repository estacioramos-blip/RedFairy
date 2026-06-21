-- =============================================================================
-- migrate_oba_ige.sql
-- =============================================================================
-- Adiciona a coluna ige_total em oba_anamnese (novo exame do OBA: IgE Total).
-- Sem ela, salvar os exames do OBA falha (cada exame é gravado como coluna).
--
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole -> Run.
-- =============================================================================

ALTER TABLE public.oba_anamnese
  ADD COLUMN IF NOT EXISTS ige_total numeric;
