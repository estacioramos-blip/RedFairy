-- ============================================================
-- migrate_tesouraria_baixa_so_no_caixa_v2.sql
--
-- ⚠ CORREÇÃO da v1 (que rodou mas NÃO fechou nada).
--
-- A v1 fez `REVOKE EXECUTE ... FROM anon, authenticated`. As concessões
-- explícitas sumiram, mas o acesso continuou: o Postgres concede EXECUTE a
-- PUBLIC por PADRÃO em toda função nova, e `anon` herda de PUBLIC. A ACL ficou
-- assim, com o `=X/postgres` (o "=" sem role à esquerda É o PUBLIC):
--
--   =X/postgres | postgres=X/postgres | service_role=X/postgres
--
-- Por isso `has_function_privilege('anon', ..., 'EXECUTE')` seguia devolvendo
-- true. Fechar de verdade exige revogar de PUBLIC.
--
-- Regra que vale para as próximas: revogar acesso de função no Supabase é
-- SEMPRE `FROM PUBLIC` + os roles explícitos. Só os roles não basta.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.admin_liquidar_indicador(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_liquidar_comissao(text, text, text)  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Conferência. Esperado:
--   admin_liquidar_*   → anon_pode = false   (fechadas)
--   caixa_pagar_*      → anon_pode = true    (a baixa continua funcionando)
SELECT p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_pode,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_pode,
       coalesce(array_to_string(p.proacl, ' | '), '(padrao)')    AS acl
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('admin_liquidar_indicador', 'admin_liquidar_comissao',
                     'caixa_pagar_indicador', 'caixa_pagar_medico')
 ORDER BY p.proname;
