-- ============================================================
-- migrate_rls_fase2_oba_anamnese_enable.sql (RLS Fase 2, tabela 2/4)
--
-- ⚠ NÃO RODAR JUNTO COM A DAS RPCs. Ordem obrigatória:
--   1. migrate_rls_fase2_oba_anamnese_rpcs.sql   (cria as funções — já rodada)
--   2. deploy do código convertido                (já no ar)
--   3. TESTAR o fluxo do OBA de ponta a ponta com o RLS ainda DESLIGADO
--   4. só então esta migration
--
-- Diferente da `triagens`, aqui NÃO existe policy nenhuma: a anamnese nunca é
-- escrita por um visitante anônimo — quem grava é o paciente logado (CPF+token)
-- ou o médico (CRM+token), e os dois passam pelas RPCs SECURITY DEFINER, que
-- ignoram RLS. Com RLS ligado e zero policies, o acesso direto pela chave anon
-- fica em DENY TOTAL para SELECT, INSERT, UPDATE e DELETE.
--
-- Este é o dado mais sensível do sistema: anamnese completa, todos os exames,
-- relatório clínico e estado clínico de cada bariátrico.
-- ============================================================

ALTER TABLE public.oba_anamnese ENABLE ROW LEVEL SECURITY;

-- Não deveria existir nenhuma, mas garante que uma policy esquecida não abra
-- brecha ao ligar o RLS (foi o que quase aconteceu na triagens, que tinha 3
-- policies adormecidas da época do Supabase Auth).
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'oba_anamnese'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.oba_anamnese', p.policyname);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- Conferência: deve voltar rls_ligado = true e policies = 0.
SELECT c.relrowsecurity AS rls_ligado,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'oba_anamnese') AS policies
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relname = 'oba_anamnese';
