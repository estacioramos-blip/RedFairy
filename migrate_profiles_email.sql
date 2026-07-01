-- =============================================================================
-- migrate_profiles_email.sql   (coluna de e-mail do paciente)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- profiles não tinha coluna de e-mail. O CompletarPerfil coleta o e-mail (e ele é
-- usado como opção de PIX "MEU E-MAIL É O MEU PIX"), então precisamos guardá-lo.
-- O código já salva o e-mail de forma TOLERANTE (não quebra se a coluna faltar);
-- depois deste ALTER, o e-mail passa a ser gravado de verdade.
-- =============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
