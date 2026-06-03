-- ============================================================
-- migrate_suplementos_b12_ferro.sql  (DEC-010 — 2º lote de seed)
--
-- Popula MAIS categorias da tabela `suplementos` (já criada por
-- migrate_suplementos.sql):
--   • b12_injetavel   — combos B1+B6+B12 + B12 pura (decisão: cataloga os dois)
--   • b12_sublingual  — mecobalamina (B12 pura)
--   • b12_oral        — B12 pura (vegetarianos) + combo
--   • ferro_oral      — uma LINHA POR MARCA (formas no campo apresentacao)
--
-- Marca ATIVA por categoria (alavanca 4DOC): MecoBe (sublingual),
-- Citoneurin (injetável), Cianocobalamina pura (oral), Noripurum (ferro oral).
--
-- Também ADICIONA a coluna `indicacao` (contexto clínico — "para quem/quando")
-- e a preenche por categoria. A coluna é o texto humano; os CRITÉRIOS de escolha
-- (Hb, macrocitose, etc.) vivem no engine, não aqui (ver DEC-010).
--
-- ⚠️ Alguns campos de sal/concentração variam por apresentação e tinham fontes
-- conflitantes na pesquisa — marcados "confirmar na bula" em observacoes.
-- Estácio (médico) deve revisar antes de a tela usar isso para prescrever.
--
-- Só INSERT + ALTER + UPDATE (a tabela já existe). Idempotente: ADD COLUMN IF
-- NOT EXISTS, ON CONFLICT DO NOTHING, UPDATE por categoria (re-rodável).
-- ============================================================

-- Coluna de contexto clínico (idempotente) ----------------------------------
ALTER TABLE suplementos ADD COLUMN IF NOT EXISTS indicacao TEXT;

INSERT INTO suplementos
  (nome_comercial, fabricante, categoria, principio_ativo, concentracao,
   posologia, via, apresentacao, composicao, observacoes, ativo)
VALUES
  -- ---------- B12 sublingual (pura) ----------
  ('MecoBe', 'Myralis', 'b12_sublingual', 'mecobalamina (B12 ativa)',
   '1000 mcg', '1 comprimido sublingual ao dia', 'sublingual',
   '30 e 90 comprimidos sublinguais', 'mecobalamina 1000mcg',
   'B12 pura (forma ativa).', true),

  ('Dozemast', 'Marjan Farma', 'b12_sublingual', 'mecobalamina (B12 ativa)',
   '1000 mcg', '1 comprimido sublingual ao dia', 'sublingual',
   '60 e 90 comprimidos sublinguais', 'mecobalamina 1000mcg',
   'B12 pura (forma ativa).', false),

  -- ---------- B12 injetável (combo + pura) ----------
  ('Citoneurin 5000', 'Procter & Gamble', 'b12_injetavel',
   'tiamina (B1) + piridoxina (B6) + cianocobalamina (B12)',
   'B1 100mg + B6 100mg + B12 5000mcg', 'IM, conforme prescrição (manutenção a cada 2–3 dias)',
   'intramuscular', 'ampolas injetáveis (há também drágea oral)',
   'B1 100mg/mL + B6 100mg/mL + B12 5000mcg/mL',
   'Combo B1+B6+B12. Também existe em drágea (oral).', true),

  ('Nevrix IM', 'Arese', 'b12_injetavel',
   'tiamina (B1) + piridoxina (B6) + cianocobalamina (B12)',
   'B1 100mg + B6 100mg + B12 5000mcg (por ampola 2mL)', 'IM, conforme prescrição',
   'intramuscular', '3 ampolas de 2mL',
   'B1 100mg + B6 100mg + B12 5000mcg por ampola', 'Combo B1+B6+B12.', false),

  ('Cianocobalamina injetável', 'genérico/manipulado', 'b12_injetavel',
   'cianocobalamina (B12)', '1000–5000 mcg/mL (varia)', 'IM, conforme prescrição',
   'intramuscular', 'ampola (genérico/manipulado)', 'B12 isolada',
   'B12 pura, sem B1/B6 — para reposição isolada. Concentração varia.', false),

  -- ---------- B12 oral (pura + combo) ----------
  ('Cianocobalamina oral', 'genérico/manipulado', 'b12_oral',
   'cianocobalamina (B12)', '1000 mcg (varia)', '1 comprimido/cápsula ao dia',
   'oral', 'comprimidos/cápsulas (genérico/manipulado)', 'B12 isolada',
   'B12 pura — ideal para vegetarianos/veganos.', true),

  ('Renovi B', 'a confirmar', 'b12_oral',
   'tiamina (B1) + piridoxina (B6) + cianocobalamina (B12)',
   'B1 100mg + B6 100mg + B12 5000mcg', '1 comprimido ao dia', 'oral',
   '30 comprimidos revestidos', 'B1 100mg + B6 100mg + B12 5000mcg',
   'Combo B1+B6+B12. Fabricante a confirmar.', false),

  -- ---------- Ferro oral (uma linha por marca) ----------
  ('Noripurum', 'Takeda', 'ferro_oral', 'ferro III polimaltosado (hidróxido férrico)',
   'comp 100mg; solução 50mg/mL', 'conforme prescrição (ferro elementar)', 'oral',
   'comprimido mastigável 100mg / solução oral 50mg/mL / Fólico / Vitaminado',
   'Ferro polimaltosado; variações com ácido fólico (Fólico) e vitaminas (Vitaminado).',
   'Melhor tolerância gástrica que o sulfato ferroso.', true),

  ('Neutrofer', 'EMS Sigma Pharma', 'ferro_oral', 'ferro polimaltosado / glicinato férrico',
   'comp 150mg (≈30mg Fe elementar)', 'conforme prescrição', 'oral',
   'comprimido / gotas / Fólico',
   'Ferro polimaltosado; Fólico = glicinato férrico 150mg + ácido fólico 5mg.',
   'Sal varia por apresentação — confirmar na bula.', false),

  ('Combiron', 'Aché', 'ferro_oral', 'ferro glicinato (quelato)',
   'confirmar por apresentação', 'conforme prescrição', 'oral',
   'solução oral / gotas / Fólico',
   'Ferro quelato glicinato (linha atual Aché); versões com vitamina C / complexo B / ácido fólico.',
   'Confirmar sal e concentração por apresentação na bula.', false),

  ('Folifer', 'a confirmar', 'ferro_oral', 'ferro aminoácido quelato + ácido fólico',
   'comp ≈30mg Fe elementar; gotas 30mg/mL + ác. fólico 0,2mg/mL', 'conforme prescrição', 'oral',
   'comprimido / gotas',
   'Ferro quelato + ácido fólico.', 'Fabricante a confirmar.', false)
ON CONFLICT (nome_comercial, categoria) DO NOTHING;

-- ------------------------------------------------------------
-- Indicação (contexto clínico) por categoria — inclui o esquema do bariátrico:
-- IM nos graves → 1 caixa (3 doses IM) → migra p/ sublingual; sublingual só
-- nos bariátricos sem anemia importante / com macrocitose leve.
-- (Aplica também às 4 linhas de polivitamínico já inseridas no 1º lote.)
-- ------------------------------------------------------------
UPDATE suplementos SET indicacao =
  'Suplementação contínua pós-cirurgia bariátrica (prevenção de déficits disabsortivos).'
  WHERE categoria = 'polivitaminico_bariatrico';

UPDATE suplementos SET indicacao =
  'B12 na MÁ ABSORÇÃO (bariátrico, gastrectomizado, gastrite autoimune/anemia perniciosa). '
  || '1ª linha no bariátrico SEM anemia importante ou com macrocitose leve; e manutenção '
  || 'após o esquema IM inicial. A via sublingual contorna a absorção intestinal.'
  WHERE categoria = 'b12_sublingual';

UPDATE suplementos SET indicacao =
  'B12 na má absorção com déficit GRAVE (anemia importante): iniciar IM — 1 caixa = 3 doses IM '
  || '— e depois migrar para a sublingual. A via IM contorna o TGI.'
  WHERE categoria = 'b12_injetavel';

UPDATE suplementos SET indicacao =
  'B12 por déficit DIETÉTICO com absorção preservada (vegetariano/vegano). NÃO indicado em má '
  || 'absorção (bariátrico/gastrectomia/gastrite autoimune).'
  WHERE categoria = 'b12_oral';

UPDATE suplementos SET indicacao =
  'Ferropenia com TGI funcionante (1ª linha em deficiência leve/moderada); alternativa ou '
  || 'transição ao ferro endovenoso.'
  WHERE categoria = 'ferro_oral';
