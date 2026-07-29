-- ============================================================
-- migrate_rls_fase2_triagens_enable.sql (RLS Fase 2, tabela 1/4: triagens)
--
-- ✅ PODE RODAR (conferido em 29/07/2026): o código já não faz nenhum SELECT
-- direto em `triagens` (só o INSERT, sem .select() de volta), as 2 RPCs já
-- estão no banco e as 11 funções que leem a tabela são todas SECURITY DEFINER
-- (passam por cima do RLS).
--
-- Liga o RLS: SELECT/UPDATE/DELETE ficam 100% dependentes de RPC SECURITY
-- DEFINER (nenhuma policy pra eles = deny total pra anon/authenticated).
--
-- POR QUE O INSERT CONTINUA PÚBLICO — o motivo NÃO é mais "funil de triagem
-- anônima" (esse comentário era da versão antiga deste arquivo). Hoje a
-- landing pede CPF+senha antes da triagem. O motivo real é que o login do
-- paciente é CUSTOM (CPF + token em localStorage, via RPC) e o do médico é
-- CRM+token — nenhum dos dois cria sessão do Supabase Auth. Confirmado no
-- código: não existe mais nenhum signUp/signInWithPassword. Ou seja, o
-- Postgres enxerga TODO mundo como `anon`, inclusive o paciente logado e o
-- médico. Restringir esse INSERT por role quebraria 100% das triagens, não só
-- as anônimas.
--
-- Consequência aceita: quem tiver a chave anon (que é pública, vive no JS do
-- site) consegue inserir linha-lixo em triagens. É risco de POLUIÇÃO, não de
-- vazamento — os dados clínicos de todo mundo, que hoje qualquer um lê, é que
-- ficam fechados aqui. Fechar o INSERT também exigiria movê-lo pra uma RPC
-- gateada por token (fica pra uma fase seguinte, junto com as outras 3
-- tabelas).
-- ============================================================

ALTER TABLE public.triagens ENABLE ROW LEVEL SECURITY;

-- Limpa as policies da era "paciente logava por Supabase Auth". Hoje o login
-- do paciente é por CPF+token, então auth.uid() é sempre NULL e elas já
-- negariam tudo — mas ficam removidas pra não dar falsa impressão de que
-- existe caminho de leitura fora das RPCs.
DROP POLICY IF EXISTS "Pacientes vêem próprias triagens" ON public.triagens;
DROP POLICY IF EXISTS "Paciente vincula triagens orfas ao proprio user_id" ON public.triagens;
DROP POLICY IF EXISTS "Inserir triagens autenticadas ou demo" ON public.triagens;

DROP POLICY IF EXISTS triagens_insert_publico ON public.triagens;
CREATE POLICY triagens_insert_publico ON public.triagens FOR INSERT WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

-- Conferência: deve voltar rls_ligado = true e exatamente 1 policy (INSERT).
SELECT c.relrowsecurity AS rls_ligado,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'triagens') AS policies
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relname = 'triagens';
