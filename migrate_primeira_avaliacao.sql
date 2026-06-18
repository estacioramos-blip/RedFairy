-- ============================================================
-- migrate_primeira_avaliacao.sql
--
-- Marca se o paciente JA CONCLUIU a 1a avaliacao (clicou AVALIAR ao menos 1 vez).
--
-- Resolve dois pontos:
--  (1) BUG do loop: o sistema decidia "1a avaliacao pendente" pela Ferritina
--      (ferritina != null). Como a 1a avaliacao pode ser so triagem do eritron
--      (sem Ferritina), ela nunca era considerada "feita" e o paciente caia de
--      novo em "Continuando a sua primeira avaliacao". Agora usamos esta flag.
--  (2) Base do PAYWALL da 2a avaliacao (Fase 2): "1a feita" + sem assinatura
--      ativa => cobra para novas avaliacoes.
--
-- Idempotente.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primeira_avaliacao_feita boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
