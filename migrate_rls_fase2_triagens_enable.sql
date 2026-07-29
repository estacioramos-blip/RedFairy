-- ============================================================
-- migrate_rls_fase2_triagens_enable.sql (RLS Fase 2, tabela 1/4: triagens)
--
-- ⚠ NÃO RODAR AINDA. Só depois que TODO o código já estiver convertido pra
-- usar triagens_por_cpf() (migrate_rls_fase2_triagens_rpcs.sql) e testado em
-- produção com RLS desligado. Rodar antes disso quebra o app (regra de ouro:
-- código → RPC → testar → só então RLS).
--
-- Liga o RLS: INSERT continua público (funil de triagem anônima, sem conta
-- ainda) — SELECT/UPDATE/DELETE ficam 100% dependentes de RPC SECURITY
-- DEFINER (nenhuma policy pra eles = deny total pra anon/authenticated).
-- ============================================================

ALTER TABLE public.triagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS triagens_insert_publico ON public.triagens;
CREATE POLICY triagens_insert_publico ON public.triagens FOR INSERT WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
