-- ============================================================
-- migrate_suplementos.sql  (DEC-010)
--
-- Catálogo de SUPLEMENTOS orais/injetáveis — amplia a prescrição da
-- plataforma para além do ferro ENDOVENOSO (que vive na tabela `medicamentos`,
-- DEC-007). Tabela ÚNICA, organizada por `categoria`:
--   • polivitaminico_bariatrico  (esta migração popula esta categoria)
--   • b12_injetavel              (aguarda curadoria)
--   • b12_sublingual             (aguarda curadoria)
--   • b12_oral                   (aguarda curadoria)
--   • ferro_oral                 (aguarda curadoria)
--
-- Por que tabela única e não uma por tipo: B12/ferro oral/polivitamínico têm a
-- mesma "forma" de dado (nome, posologia, via, apresentação...). Uma tabela com
-- `categoria` evita repetir schema/admin/queries; nova categoria = novo valor no
-- CHECK. O ferro EV fica SEPARADO em `medicamentos` porque é dose por peso +
-- infusão (um mundo à parte).
--
-- `ativo` = a marca PREFERIDA da categoria (a mesma alavanca do Programa 4DOC
-- patrocinado do ferro EV). prescricoes_emitidas/cota_total ficam prontos para a
-- rotação por cota (não usada ainda).
--
-- RLS: NÃO habilitado nesta migração (consistente com como `medicamentos` nasceu
-- — DEC-002). Quando voltar ao RLS, dar o mesmo tratamento da Fase 1: leitura
-- pública + escrita só via RPC admin (`token_admin_ok`).
--
-- Idempotente: CREATE TABLE IF NOT EXISTS + UNIQUE(nome_comercial,categoria) +
-- ON CONFLICT DO NOTHING.
-- ============================================================

CREATE TABLE IF NOT EXISTS suplementos (
  id                   BIGSERIAL PRIMARY KEY,
  nome_comercial       TEXT NOT NULL,
  fabricante           TEXT,
  categoria            TEXT NOT NULL CHECK (categoria IN (
                         'polivitaminico_bariatrico',
                         'b12_injetavel',
                         'b12_sublingual',
                         'b12_oral',
                         'ferro_oral')),
  principio_ativo      TEXT,
  concentracao         TEXT,                 -- ex.: "1000 mcg", "50 mg/mL"
  posologia            TEXT,                 -- ex.: "1 comprimido ao dia"
  via                  TEXT,                 -- ex.: "oral", "sublingual", "intramuscular"
  apresentacao         TEXT,                 -- ex.: "30 comprimidos"
  composicao           TEXT,                 -- resumo / lista de nutrientes
  observacoes          TEXT,
  ativo                BOOLEAN DEFAULT false, -- marca preferida da categoria (alavanca 4DOC)
  prescricoes_emitidas INTEGER DEFAULT 0,    -- contador (cota futura)
  cota_total           INTEGER,              -- meta de prescrições (cota futura)
  created_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (nome_comercial, categoria)
);

-- ------------------------------------------------------------
-- Seed — 1ª categoria: polivitamínicos bariátricos.
-- Marca ATIVA da categoria: Baristar.
-- ------------------------------------------------------------
INSERT INTO suplementos
  (nome_comercial, fabricante, categoria, principio_ativo, posologia, via,
   apresentacao, composicao, observacoes, ativo)
VALUES
  ('Baristar', 'Catalent / Medley', 'polivitaminico_bariatrico',
   'polivitamínico + multimineral', '2 cápsulas ao dia', 'oral',
   '30 e 100 cápsulas gelatinosas moles (sabor baunilha)',
   '(por 2 cáps) Vit A 600mcg, D3 5mcg, C 45mg, E 10mg, B1 1,2mg, B2 1,3mg, '
   || 'B3 16mg, B6 1,3mg, ácido fólico 240mcg, B12 2,4mcg, biotina 30mcg, '
   || 'ácido pantotênico 5mg, K 65mcg; Cálcio 250mg, Ferro 14mg, Magnésio 65mg, '
   || 'Zinco 7mg, Iodo 130mcg, Cobre 900mcg, Selênio 34mcg, Molibdênio 45mcg, '
   || 'Cromo 35mcg, Manganês 2,3mg',
   NULL, true),

  ('Bariat XR', 'Supera / Digest', 'polivitaminico_bariatrico',
   'polivitamínico + multimineral', '1 comprimido ao dia', 'oral',
   '30 comprimidos',
   '(por comprimido) Vit A 1500mcg, D 50mcg, E 15mg, K 97mcg, C 45mg, B1 1,8mg, '
   || 'B2 1,3mg, B3 16mg, B5 5mg, B6 1,3mg, biotina 30mcg, ácido fólico 480mcg, '
   || 'B12 9,9mcg; Cálcio 88mg, Cobre 2536mcg, Cromo 35mcg, Ferro 34mg, '
   || 'Iodo 130mcg, Magnésio 63mg, Manganês 0,75mg, Molibdênio 45mcg, '
   || 'Selênio 34mcg, Zinco 14mg',
   'Liberação prolongada (~12h, gastrorretentivo); minerais quelados; sem glúten. '
   || 'Ferro, B12 e cobre em doses altas.', false),

  ('Multi Bariátrico Catarinense', 'Catarinense Nutrição / Pharma',
   'polivitaminico_bariatrico', 'polivitamínico + multimineral',
   '1 comprimido ao dia (mastigável)', 'oral', '30 comprimidos',
   'Cálcio, Vit C, Ferro (fumarato ferroso), Vit E, Vit A, Zinco, Vit D, B1, '
   || 'Cobre, Selênio, ácido fólico (B9), B12',
   'Quantidades por nutriente a confirmar na bula.', false),

  ('Complete Bari', 'Complete Bari', 'polivitaminico_bariatrico',
   'polivitamínico + multimineral', NULL, 'oral',
   'multivitamínico bariátrico (23 nutrientes)',
   '23 nutrientes (composição detalhada a confirmar)',
   'Posologia/apresentação/composição a confirmar — dados incompletos na pesquisa.',
   false)
ON CONFLICT (nome_comercial, categoria) DO NOTHING;
