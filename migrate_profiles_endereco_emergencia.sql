-- ============================================================================
-- migrate_profiles_endereco_emergencia.sql
-- Fase 1 do "Botão de Emergência" do bariátrico:
--   - Endereço do paciente (preenchido pelo ViaCEP no cadastro)
--   - Contato de emergência (nome + celular + parentesco)
--
-- Rodar no Supabase → SQL Editor. Colunas anuláveis, retrocompatível: o app já
-- grava esses campos num UPDATE tolerante; ANTES de rodar isto o cadastro
-- continua funcionando (só não salva endereço/emergência).
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cep         text,
  ADD COLUMN IF NOT EXISTS logradouro  text,
  ADD COLUMN IF NOT EXISTS numero      text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro      text,
  ADD COLUMN IF NOT EXISTS cidade      text,
  ADD COLUMN IF NOT EXISTS uf          text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_nome       text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_celular    text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_parentesco text;
