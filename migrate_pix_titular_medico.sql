-- =============================================================================
-- migrate_pix_titular_medico.sql   (Fase B — titular da conta PIX do MÉDICO)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- Mesma lógica do indicador (titular / PF-PJ / CNPJ), agora na tabela medicos.
-- O médico salva o PIX direto (UPDATE medicos no front), então basta as colunas.
-- =============================================================================

ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS pix_titular    text;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS pix_titular_pj boolean DEFAULT false;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS pix_cnpj       text;
