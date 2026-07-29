-- ============================================================
-- migrate_rls_fase2_profiles_enable.sql (RLS Fase 2, tabela 4/4 — ÚLTIMA)
--
-- ⚠ Ordem obrigatória:
--   1. migrate_rls_fase2_profiles_rpcs.sql   (cria as funções)
--   2. deploy do código convertido
--   3. TESTAR com o RLS ainda DESLIGADO — em especial LOGIN, CADASTRO e
--      "Completar perfil", que são os fluxos que mais tocam esta tabela
--   4. só então esta migration
--
-- Zero policies: toda leitura e escrita passa por RPC SECURITY DEFINER
-- (profiles_meu / profiles_por_cpf / profiles_atualizar / admin_profiles_lista),
-- que ignoram RLS. Login e cadastro do paciente já eram por RPC própria
-- (login_paciente / register_paciente), então não dependem de acesso direto.
--
-- LEMBRETE da exposição residual aceita: `lookup_cpf_triagem` continua pública
-- e devolve nome + sexo + nascimento a partir de um CPF. É SECURITY DEFINER,
-- logo o RLS daqui não a fecha. Decisão do Estácio (jul/2026) — ver comentário
-- completo em migrate_rls_fase2_profiles_rpcs.sql.
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', p.policyname);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- Conferência: deve voltar rls_ligado = true e policies = 0.
SELECT c.relrowsecurity AS rls_ligado,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'profiles') AS policies
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relname = 'profiles';
