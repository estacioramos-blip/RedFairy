-- =============================================================================
-- migrate_meds_acidofolico_enoxaparina.sql
-- =============================================================================
-- Adiciona ao catálogo (tabela `suplementos`) duas novas categorias de produto,
-- com marcas pesquisadas, todas INATIVAS (ativo=false). O ADM ativa depois a
-- marca de interesse (1 por categoria, como já é o padrão), e ela passa a poder
-- sair nas prescrições (fluxo de prescrição ainda a elaborar).
--
-- >>> REVISE/CURE as marcas antes de rodar — são decisões clínico-comerciais. <<<
-- Fabricantes deixados em branco ('') onde não confirmados: preencha se quiser.
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole -> Run.
-- =============================================================================

-- 1) Permite as novas categorias na constraint de `suplementos.categoria`.
ALTER TABLE public.suplementos DROP CONSTRAINT IF EXISTS suplementos_categoria_check;
ALTER TABLE public.suplementos ADD CONSTRAINT suplementos_categoria_check
  CHECK (categoria = ANY (ARRAY[
    'polivitaminico_bariatrico','b12_injetavel','b12_sublingual','b12_oral',
    'ferro_oral','hpylori_1a_linha','hpylori_retrat',
    'acido_folico','enoxaparina'
  ]));

-- 2) ÁCIDO FÓLICO (comprimidos 5 mg) — uso oral.
INSERT INTO public.suplementos (nome_comercial, fabricante, categoria, principio_ativo, concentracao, via, apresentacao, ativo)
VALUES
  ('Folifolin',     '',             'acido_folico', 'Ácido fólico', '5 mg', 'Oral', 'Comprimidos (30)', false),
  ('Folacin',       'Arese Pharma', 'acido_folico', 'Ácido fólico', '5 mg', 'Oral', 'Comprimido revestido (8/20/30)', false),
  ('Femme Fólico',  'Aché',         'acido_folico', 'Ácido fólico', '5 mg', 'Oral', 'Comprimido revestido (30)', false),
  ('Ácido Fólico (genérico)', 'Genérico', 'acido_folico', 'Ácido fólico', '5 mg', 'Oral', 'Comprimidos', false);

-- 3) ENOXAPARINA (heparina de baixo peso molecular) — uso subcutâneo, seringa preenchida.
--    NOTA: "Fraxiparina" é NADROPARINA (outra HBPM), NÃO enoxaparina — por isso fora daqui.
INSERT INTO public.suplementos (nome_comercial, fabricante, categoria, principio_ativo, concentracao, via, apresentacao, ativo)
VALUES
  ('Clexane',   'Sanofi (referência)', 'enoxaparina', 'Enoxaparina sódica', '20/40/60/80 mg', 'Subcutânea', 'Seringa preenchida', false),
  ('Versa',     'Eurofarma',           'enoxaparina', 'Enoxaparina sódica', '20/40/60/80 mg', 'Subcutânea', 'Seringa preenchida', false),
  ('Cutenox',   'Mylan/Viatris',       'enoxaparina', 'Enoxaparina sódica', '20/40/60/80 mg', 'Subcutânea', 'Seringa preenchida', false),
  ('Endocris',  'Cristália',           'enoxaparina', 'Enoxaparina sódica', '20/40/60/80 mg', 'Subcutânea', 'Seringa preenchida', false),
  ('Enoxalow',  '',                    'enoxaparina', 'Enoxaparina sódica', '20/40/60/80 mg', 'Subcutânea', 'Seringa preenchida', false),
  ('Ghemaxan',  'Blau',                'enoxaparina', 'Enoxaparina sódica', '20/40/60/80 mg', 'Subcutânea', 'Seringa preenchida', false),
  ('Heptris',   '',                    'enoxaparina', 'Enoxaparina sódica', '20/40/60/80 mg', 'Subcutânea', 'Seringa preenchida', false),
  ('Noxx',      '',                    'enoxaparina', 'Enoxaparina sódica', '20/40/60/80 mg', 'Subcutânea', 'Seringa preenchida', false),
  ('Volare',    '',                    'enoxaparina', 'Enoxaparina sódica', '20/40/60/80 mg', 'Subcutânea', 'Seringa preenchida', false);
