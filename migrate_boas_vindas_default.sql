-- =============================================================================
-- migrate_boas_vindas_default.sql
-- =============================================================================
-- RASCUNHO PARA REVISÃO (rodar no Supabase Dashboard -> SQL Editor).
--
-- Problema: o paciente NOVO pulava a tela de boas-vindas (onde fica o "instalar o ÍCONE")
-- e caía direto na avaliação. Causa: register_paciente NÃO seta boas_vindas_vista, então
-- usava o DEFAULT da coluna (true) → o sistema achava que ele já tinha visto.
--
-- Correção: default = FALSE. Todo perfil NOVO começa "ainda não viu a boas-vindas" → a
-- tela aparece (com o instalar ícone) e, ao CONTINUAR, leva ao OBA (bariátrico) ou à 1ª
-- avaliação (não-bariátrico). NÃO altera perfis existentes (só o default de novos inserts).
-- =============================================================================

ALTER TABLE public.profiles ALTER COLUMN boas_vindas_vista SET DEFAULT false;

-- (conferência opcional) ver o default atual:
-- SELECT column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='profiles' AND column_name='boas_vindas_vista';
