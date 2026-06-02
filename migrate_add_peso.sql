-- ============================================================
-- migrate_add_peso.sql
--
-- Adiciona a coluna `peso` (kg) em:
--   - avaliacoes  (triagem feita pelo MÉDICO, via Calculator.jsx)
--   - triagens    (triagem feita pelo PACIENTE, via TriagemModal.jsx)
--
-- Motivo (DEC-006): a Fórmula de Ganzoni para dose de ferro endovenoso
-- usa o peso do paciente. Campo OPCIONAL — só é necessário quando há
-- indicação de ferro EV; pode ficar NULL.
--
-- NUMERIC(5,1): até 9999.9 kg com 1 casa decimal (ex.: 72.5). Sobra de
-- folga; mantém precisão de meio quilo sem ruído de ponto flutuante.
-- ============================================================

ALTER TABLE avaliacoes
  ADD COLUMN IF NOT EXISTS peso NUMERIC(5,1);

ALTER TABLE triagens
  ADD COLUMN IF NOT EXISTS peso NUMERIC(5,1);
