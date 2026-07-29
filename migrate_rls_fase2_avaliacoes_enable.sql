-- ============================================================
-- migrate_rls_fase2_avaliacoes_enable.sql (RLS Fase 2, tabela 3/4)
--
-- ⚠ Ordem obrigatória:
--   1. migrate_rls_fase2_avaliacoes_rpcs.sql   (cria as funções)
--   2. deploy do código convertido
--   3. TESTAR com o RLS ainda DESLIGADO
--   4. só então esta migration
--
-- Zero policies: toda escrita e leitura passa por RPC SECURITY DEFINER
-- (avaliacoes_por_cpf / avaliacoes_salvar / avaliacoes_marcar_quer_receber /
-- avaliacoes_contagem_* / admin_avaliacoes_recentes), que ignoram RLS.
-- Com RLS ligado e nenhuma policy, o acesso direto pela chave anon fica em
-- DENY TOTAL para SELECT, INSERT, UPDATE e DELETE.
--
-- Diferente da `triagens`, aqui NÃO é preciso deixar o INSERT aberto: nenhuma
-- gravação em `avaliacoes` acontece antes de o paciente existir — quem grava é
-- o paciente logado (CPF+token) ou o médico (CRM+token).
-- ============================================================

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- Remove qualquer policy adormecida (a `triagens` tinha 3 da era do Supabase
-- Auth que teriam "acordado" ao ligar o RLS).
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'avaliacoes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.avaliacoes', p.policyname);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- Conferência: deve voltar rls_ligado = true e policies = 0.
SELECT c.relrowsecurity AS rls_ligado,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'avaliacoes') AS policies
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relname = 'avaliacoes';
