-- =============================================================================
-- migrate_oba_ddimero.sql
-- =============================================================================
-- Adiciona a coluna d_dimero em oba_anamnese (novo exame do OBA: D-Dímero).
-- Sem ela, salvar os exames do OBA falha (o app grava cada exame como coluna).
--
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole -> Run.
-- =============================================================================

ALTER TABLE public.oba_anamnese
  ADD COLUMN IF NOT EXISTS d_dimero numeric;
