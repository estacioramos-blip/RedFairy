-- migrate_oba_exames_faltantes.sql
-- ---------------------------------------------------------------------------
-- Auditoria pre-lancamento (jul/2026): o OBAModal grava, na etapa de exames,
-- uma coluna por exame de `todosExames`. Sete dessas colunas NAO existiam em
-- oba_anamnese. Como o codigo grava tudo num UNICO update, o Postgres rejeitava
-- o statement inteiro (coluna inexistente) e NENHUM exame era salvo -- silencioso,
-- para TODO paciente OBA (ureia/pth/calcio_ionico/magnesio estao no bloco base,
-- entao atingia todos, nao so os >=45).
--
-- Tipo: numeric (igual a todas as demais colunas de exame). Idempotente.
-- ---------------------------------------------------------------------------
ALTER TABLE public.oba_anamnese
  ADD COLUMN IF NOT EXISTS ureia          numeric,
  ADD COLUMN IF NOT EXISTS pth            numeric,
  ADD COLUMN IF NOT EXISTS calcio_ionico  numeric,
  ADD COLUMN IF NOT EXISTS magnesio       numeric,
  ADD COLUMN IF NOT EXISTS proteina_total numeric,
  ADD COLUMN IF NOT EXISTS albumina       numeric,
  ADD COLUMN IF NOT EXISTS globulina      numeric;
