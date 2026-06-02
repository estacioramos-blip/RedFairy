-- ============================================================
-- migrate_add_medicamentos.sql
--
-- Catálogo de medicamentos de ferro ENDOVENOSO (DEC-007).
--
-- A plataforma sempre prescreve DUAS receitas por caso com indicação de
-- ferro EV — uma de cada classe — usando a marca ATIVA daquela classe:
--   • alta_dose       → Ferinject  ×  Monofer        (1–2 infusões)
--   • dose_fracionada → Noripurum × Ferropurum × Sucrofer (sacarato, SUS)
--
-- A marca ativa por classe é a alavanca do Programa 4DOC patrocinado.
-- prescricoes_emitidas / cota_total ficam prontos para a rotação por cota
-- (não usada ainda — MVP é "uma marca ativa por classe", troca manual).
--
-- RLS: não habilitado (consistente com as demais tabelas — ver DEC-002).
-- Idempotente: CREATE TABLE IF NOT EXISTS + UNIQUE(nome_comercial) + ON CONFLICT.
-- ============================================================

CREATE TABLE IF NOT EXISTS medicamentos (
  id                   BIGSERIAL PRIMARY KEY,
  nome_comercial       TEXT NOT NULL UNIQUE,
  principio_ativo      TEXT NOT NULL,
  fabricante           TEXT,
  classe               TEXT NOT NULL CHECK (classe IN ('alta_dose','dose_fracionada')),
  concentracao_mg_ml   NUMERIC(6,2),         -- mg de ferro por mL
  frascos_mg           TEXT,                 -- tamanhos disponíveis, ex.: "500, 1000"
  dose_max_sessao_mg   INTEGER,              -- teto por sessão (clínico)
  diluicao             TEXT,                 -- ex.: "250 mL SF 0,9%"
  tempo_infusao        TEXT,                 -- ex.: "15–30 min"
  intervalo_sessoes    TEXT,                 -- ex.: "7 dias" / "48–72 h"
  ativo                BOOLEAN DEFAULT false, -- a marca selecionada da sua classe
  prescricoes_emitidas INTEGER DEFAULT 0,    -- contador (cota futura)
  cota_total           INTEGER,              -- meta de prescrições (cota futura)
  observacoes          TEXT,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- Seed inicial (parâmetros clínicos padrão — editáveis no admin).
-- Uma marca ATIVA por classe: Ferinject (alta dose) e Noripurum (fracionada).
-- ------------------------------------------------------------
INSERT INTO medicamentos
  (nome_comercial, principio_ativo, fabricante, classe, concentracao_mg_ml, frascos_mg,
   dose_max_sessao_mg, diluicao, tempo_infusao, intervalo_sessoes, ativo, observacoes)
VALUES
  ('Ferinject', 'carboximaltose férrica', 'Takeda/Vifor', 'alta_dose',
   50, '500', 1000, '250 mL SF 0,9%', '15–30 min', '7 dias', true,
   'Pode infundir até 1.000 mg (2 frascos) em sessão única. Risco de hipofosfatemia.'),

  ('Monofer', 'derisomaltose férrica', 'Pfizer', 'alta_dose',
   100, '500, 1000', 1000, '100–500 mL SF 0,9%', '≥ 15–30 min', '—', false,
   'Dose total possível em infusão única (até 20 mg/kg). NÃO causa hipofosfatemia.'),

  ('Noripurum EV', 'sacarato de hidróxido férrico', 'Takeda', 'dose_fracionada',
   20, '100', 200, '100 mL SF 0,9%', '30–60 min', '48–72 h', true,
   'Sacarato — disponível no SUS. ~200 mg por sessão, várias sessões.'),

  ('Ferropurum', 'sacarato de hidróxido férrico', 'Blau Farmacêutica', 'dose_fracionada',
   20, '100', 200, '100 mL SF 0,9%', '30–60 min', '48–72 h', false,
   'Sacarato (iron sucrose). ~200 mg por sessão.'),

  ('Sucrofer', 'sacarato de hidróxido férrico', 'União Química', 'dose_fracionada',
   20, '100', 200, '100 mL SF 0,9%', '30–60 min', '48–72 h', false,
   'Sacarato (iron sucrose). ~200 mg por sessão.')
ON CONFLICT (nome_comercial) DO NOTHING;
