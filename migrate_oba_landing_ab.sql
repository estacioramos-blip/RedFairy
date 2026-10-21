-- ============================================================================
-- migrate_oba_landing_ab.sql — tabela e leitura do teste A/B da faixa de abertura
-- ============================================================================
--
-- ⚠ ARQUIVO RECONSTRUÍDO em 21/10/2026, a partir do banco de produção.
--   O original foi rodado no SQL Editor em ago/2026 (o teste roda desde
--   17/08) e NUNCA foi commitado — o intro-ab.js citava este nome e o
--   arquivo não existia. Sem ele, ninguém conseguiria recriar a medição num
--   banco novo, nem saber de onde vinham a tabela, a policy e as views.
--
--   Reproduz o estado ORIGINAL do teste: as colunas utm_* e o tipo
--   'desistencia' vieram depois, em arquivos próprios. Duas diferenças
--   DELIBERADAS em relação ao que rodou em agosto, para que rodar este
--   arquivo hoje não desfaça o que veio depois:
--     • as views nascem com security_invoker = on e fechadas ao anon (o
--       original as deixou abertas — ver migrate_oba_landing_views_fechadas);
--     • a constraint de tipo só é criada se não existir, para não estreitar
--       a versão atual, que aceita 'desistencia'.
--
-- ORDEM DOS ARQUIVOS DA LANDING:
--   1. migrate_oba_landing_ab.sql            (este)
--   2. migrate_oba_utm.sql                   (colunas utm_*, oba_origem, funil)
--   3. migrate_oba_landing_desistencia.sql   (tipo 'desistencia' + view)
--   4. migrate_oba_landing_views_fechadas.sql (fecha as views antigas)
--   5. migrate_oba_landing_eventos_so_insert.sql (anon só INSERT na tabela)
--
-- MODELO: o site grava com a chave ANON (pública, está no intro-ab.js), só
-- INSERT, com 'Prefer: return=minimal' — por isso o anon não precisa de
-- SELECT. RLS ligado com uma única policy, de INSERT. A leitura é pelas views,
-- no SQL Editor, como dono.
--
-- Regra do GRANT (CLAUDE.md, 21/10/2026): em banco novo, depois de
-- 30/10/2026, a tabela não fica acessível ao Data API sem GRANT explícito —
-- daí o GRANT INSERT abaixo, por objeto. A coluna id é IDENTITY: o INSERT
-- não verifica permissão na sequence (diferente de `serial`, cujo DEFAULT
-- chama nextval com a permissão de quem insere). Por isso não há GRANT de
-- sequence aqui — seria privilégio sem uso.
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- ── 1. Tabela ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.oba_landing_eventos (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  sessao_id           text NOT NULL,   -- 1 por aba (sessionStorage), não por pessoa
  variante            text NOT NULL,   -- 'A' | 'B'
  tipo                text NOT NULL,   -- 'impressao' | 'clique'
  cta                 text,            -- só no clique: qual botão
  segundos_ate_clique numeric,         -- só no clique
  dispensa_por        text,            -- só no clique: 'clique' (faixa em tela) | 'timer'
  referrer            text,
  user_agent          text,
  largura_tela        integer
);

COMMENT ON TABLE public.oba_landing_eventos IS
  'Eventos da faixa de abertura da landing bariatrico.net (teste A/B de copy).';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oba_landing_variante_valida') THEN
    ALTER TABLE public.oba_landing_eventos ADD CONSTRAINT oba_landing_variante_valida
      CHECK (variante = ANY (ARRAY['A'::text, 'B'::text]));
  END IF;
  -- Só se não existir: a versão atual aceita também 'desistencia'
  -- (migrate_oba_landing_desistencia.sql) e não pode ser estreitada aqui.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oba_landing_tipo_valido') THEN
    ALTER TABLE public.oba_landing_eventos ADD CONSTRAINT oba_landing_tipo_valido
      CHECK (tipo = ANY (ARRAY['impressao'::text, 'clique'::text]));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_oba_landing_sessao        ON public.oba_landing_eventos (sessao_id);
CREATE INDEX IF NOT EXISTS idx_oba_landing_variante_tipo ON public.oba_landing_eventos (variante, tipo);
CREATE INDEX IF NOT EXISTS idx_oba_landing_criado_em     ON public.oba_landing_eventos (criado_em DESC);

-- ── 2. RLS: o site só escreve ───────────────────────────────────────────────
ALTER TABLE public.oba_landing_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oba_landing_insert_anon ON public.oba_landing_eventos;
CREATE POLICY oba_landing_insert_anon ON public.oba_landing_eventos
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Só INSERT (21/10/2026, migrate_oba_landing_eventos_so_insert.sql). O REVOKE
-- vem antes porque, em banco anterior a 30/10/2026, o Supabase dá TODOS os
-- privilégios por padrão — e TRUNCATE não passa pelo RLS.
REVOKE ALL ON TABLE    public.oba_landing_eventos        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.oba_landing_eventos_id_seq FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.oba_landing_eventos TO anon, authenticated;

-- ── 3. Leitura (SQL Editor, como dono) ──────────────────────────────────────
-- "Saiu sem clicar" sai por SUBTRAÇÃO (impressões − sessões com clique), e não
-- por evento de saída: beforeunload é pouco confiável no celular e perderia
-- justamente quem mais interessa. Cliques de sessões SEM impressão não entram
-- (o LEFT JOIN parte das impressões).
CREATE OR REPLACE VIEW public.oba_landing_resumo
WITH (security_invoker = on) AS
WITH impressoes AS (
  SELECT variante, sessao_id
    FROM public.oba_landing_eventos
   WHERE tipo = 'impressao'
   GROUP BY variante, sessao_id
),
cliques AS (
  SELECT sessao_id
    FROM public.oba_landing_eventos
   WHERE tipo = 'clique'
   GROUP BY sessao_id
)
SELECT i.variante,
       count(*)                                  AS visitas,
       count(c.sessao_id)                        AS visitas_com_clique,
       count(*) - count(c.sessao_id)             AS saiu_sem_clicar,
       round(100.0 * count(c.sessao_id) / NULLIF(count(*), 0), 1) AS taxa_clique_pct
  FROM impressoes i
  LEFT JOIN cliques c ON c.sessao_id = i.sessao_id
 GROUP BY i.variante
 ORDER BY i.variante;

CREATE OR REPLACE VIEW public.oba_landing_por_cta
WITH (security_invoker = on) AS
SELECT variante,
       cta,
       count(*)                          AS cliques,
       round(avg(segundos_ate_clique), 1) AS media_segundos
  FROM public.oba_landing_eventos
 WHERE tipo = 'clique' AND cta IS NOT NULL
 GROUP BY variante, cta
 ORDER BY variante, count(*) DESC;

-- Sem GRANT de propósito: ninguém lê estas views pelo site ou pelo app.
REVOKE ALL ON public.oba_landing_resumo  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.oba_landing_por_cta FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Leitura ─────────────────────────────────────────────────────────────────
--   SELECT * FROM public.oba_landing_resumo;
--   SELECT * FROM public.oba_landing_por_cta;
