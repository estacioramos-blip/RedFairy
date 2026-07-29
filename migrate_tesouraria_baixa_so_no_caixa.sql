-- ============================================================
-- migrate_tesouraria_baixa_so_no_caixa.sql
--
-- Fecha o CAMINHO DUPLO de pagamento (achado A4 + "redundância Admin×Caixa" da
-- auditoria de jul/2026). Existiam DOIS jeitos de pagar a mesma pessoa:
--
--   Admin  → admin_liquidar_indicador / admin_liquidar_comissao
--   Caixa  → caixa_pagar_indicador   / caixa_pagar_medico
--
-- e eles NÃO se enxergavam. O do Admin apenas marcava "pago", sem congelar
-- USD/cotação/BRL — então a Nota Fiscal enxergava R$ 0. O do Caixa congela os
-- valores no momento da baixa, que é o comportamento correto.
--
-- Decisão do Estácio (jul/2026): a baixa passa a ser SÓ na Tesouraria (Caixa);
-- o Admin perde essa função. A UI dos dois botões já foi removida do AdminPage.
--
-- Aqui o acesso é REVOGADO, não apagado: as funções continuam no banco (para
-- consulta e para um eventual rollback), mas deixam de ser chamáveis pela API.
-- Sem o REVOKE, o botão sumiria da tela e a rota continuaria aberta para quem
-- tivesse um token de admin.
--
-- Reverter (se um dia a baixa voltar ao Admin):
--   GRANT EXECUTE ON FUNCTION public.admin_liquidar_indicador(text,text,text) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.admin_liquidar_comissao(text,text,text)  TO anon, authenticated;
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.admin_liquidar_indicador(text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_liquidar_comissao(text, text, text)  FROM anon, authenticated;

COMMENT ON FUNCTION public.admin_liquidar_indicador(text, text, text) IS
  'APOSENTADA (jul/2026): a baixa e'' so'' na Tesouraria (caixa_pagar_indicador), que congela USD/cotacao/BRL. EXECUTE revogado.';
COMMENT ON FUNCTION public.admin_liquidar_comissao(text, text, text) IS
  'APOSENTADA (jul/2026): a baixa e'' so'' na Tesouraria (caixa_pagar_medico), que congela USD/cotacao/BRL. EXECUTE revogado.';

NOTIFY pgrst, 'reload schema';

-- Conferência: as duas devem aparecer SEM privilégio para anon/authenticated.
SELECT p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_pode,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_pode
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('admin_liquidar_indicador', 'admin_liquidar_comissao',
                     'caixa_pagar_indicador', 'caixa_pagar_medico')
 ORDER BY p.proname;
