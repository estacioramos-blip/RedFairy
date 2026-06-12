-- ============================================================
-- migrate_suplementos_hpylori.sql
--
-- Adiciona à tabela `suplementos` (Admin → Suplementos) as classes de PACK de
-- ERRADICAÇÃO DO H. PYLORI, usadas quando a sorologia ANTI-H.PYLORI IgM é
-- REAGENTE (infecção ativa) e a plataforma oferece a PRESCRIÇÃO do tratamento.
--
--   • hpylori_1a_linha → PYLORIPAC        (esquema triplo, 1ª linha)
--   • hpylori_retrat   → PYLORIPAC RETRAT (retratamento / falha de 1ª linha)
--
-- A marca ATIVA de cada categoria é a alavanca do Programa 4DOC (negociação com
-- a indústria) — o admin escolhe a marca preferida no painel.
--
-- Idempotente: DROP CONSTRAINT IF EXISTS + ADD; ON CONFLICT (nome_comercial,
-- categoria) DO NOTHING. Termina com NOTIFY pgrst.
-- ============================================================

-- 1) Relaxa o CHECK de `categoria` para incluir as duas novas classes ----------
ALTER TABLE public.suplementos DROP CONSTRAINT IF EXISTS suplementos_categoria_check;
ALTER TABLE public.suplementos ADD CONSTRAINT suplementos_categoria_check CHECK (categoria IN (
  'polivitaminico_bariatrico',
  'b12_injetavel',
  'b12_sublingual',
  'b12_oral',
  'ferro_oral',
  'hpylori_1a_linha',
  'hpylori_retrat'
));

-- 2) Seed dos packs (Medley) — marca ATIVA por categoria ----------------------
INSERT INTO public.suplementos
  (nome_comercial, fabricante, categoria, principio_ativo, concentracao, posologia,
   via, apresentacao, composicao, indicacao, ativo)
VALUES
  ('Pyloripac', 'Medley', 'hpylori_1a_linha',
   'Lansoprazol + Claritromicina + Amoxicilina',
   '30 mg + 500 mg + 500 mg',
   '1 cáp lansoprazol 30 mg + 1 comp claritromicina 500 mg + 2 cáps amoxicilina 500 mg, de 12/12 h, em jejum, por 7 a 14 dias.',
   'oral',
   '56 cápsulas/comprimidos (blísteres)',
   'Lansoprazol 30 mg, Claritromicina 500 mg, Amoxicilina 500 mg',
   'Erradicação de H. pylori — 1ª linha (esquema triplo).',
   true),

  ('Pyloripac Retrat', 'Medley', 'hpylori_retrat',
   'Lansoprazol + Levofloxacino + Amoxicilina',
   '30 mg + 500 mg + 500 mg',
   'Manhã (jejum): 1 lansoprazol 30 mg + 1 levofloxacino 500 mg + 2 amoxicilina 500 mg. Noite (jejum de 3 h): 1 lansoprazol 30 mg + 2 amoxicilina 500 mg. Por 10 dias.',
   'oral',
   '70 cápsulas/comprimidos (10 blísteres)',
   'Lansoprazol 30 mg, Levofloxacino 500 mg, Amoxicilina 500 mg',
   'Retratamento de H. pylori após falha de 1ª linha ou reinfecção.',
   true)
ON CONFLICT (nome_comercial, categoria) DO NOTHING;

NOTIFY pgrst, 'reload schema';
