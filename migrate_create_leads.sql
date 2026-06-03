-- ============================================================
-- migrate_create_leads.sql
--
-- Cria a tabela `leads_comerciais` que o ResultCard usa (insere leads de
-- obstipação/fibromialgia). Ela nunca existiu no banco — os inserts vinham
-- falhando em silêncio (try/catch vazio em ResultCard.registrar).
--
-- Colunas conforme o insert do cliente: nome, celular, tipo, status, created_at.
-- Idempotente: CREATE TABLE IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS leads_comerciais (
  id          BIGSERIAL PRIMARY KEY,
  nome        TEXT,
  celular     TEXT,
  tipo        TEXT,
  status      TEXT DEFAULT 'pendente',
  created_at  TIMESTAMPTZ DEFAULT now()
);
