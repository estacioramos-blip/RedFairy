-- ============================================================================
-- migrate_min11_cpf_valido_searchpath.sql
-- Auditoria — MIN-11: cpf_valido era a única função sem search_path fixo (advisor
-- WARN "function_search_path_mutable"). Fixa o search_path. Sem ordering hazard,
-- sem mudança de comportamento — só endurece contra hijack de search_path.
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR (a qualquer momento).
-- ============================================================================
ALTER FUNCTION public.cpf_valido(text) SET search_path TO 'public', 'extensions';

-- Verificação: SELECT proconfig FROM pg_proc WHERE proname='cpf_valido';  -- deve listar search_path
