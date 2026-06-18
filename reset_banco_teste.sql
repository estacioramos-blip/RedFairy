-- =============================================================================
-- reset_banco_teste.sql  —  RESET de dados para novos testes
-- =============================================================================
-- O QUE FAZ:
--   * Esvazia todas as tabelas de PACIENTES e dados transacionais
--     (libera os CPFs já usados para repetir testes do zero).
--   * Apaga todos os MÉDICOS, EXCETO o administrador (is_admin = true),
--     ou seja, preserva o ESTÁCIO 6302/BA com o acesso ao painel admin.
--   * PRESERVA o catálogo/configuração: config, medicamentos, suplementos.
--
-- COMO USAR:
--   Supabase Dashboard -> SQL Editor -> cole tudo -> Run.
--   É uma transação (BEGIN/COMMIT): ou aplica tudo, ou nada.
--   Para abortar depois de ver a conferência, troque COMMIT; por ROLLBACK;
--
-- ATENÇÃO: NÃO toca em auth.users (contas de autenticação ficam intactas).
-- =============================================================================

BEGIN;

-- 1) Zera pacientes e tudo ligado a eles (mantém config/medicamentos/suplementos).
TRUNCATE TABLE
  public.profiles,
  public.avaliacoes,
  public.triagens,
  public.assinaturas,
  public.prescricoes,
  public.oba_anamnese,
  public.creditos_medico,
  public.pedidos_documento,
  public.extratos_oba,
  public.leads_comerciais
RESTART IDENTITY CASCADE;

-- 2) Apaga todos os médicos EXCETO o administrador (você).
DELETE FROM public.medicos
WHERE is_admin IS NOT TRUE;

-- 3) Conferência: deve mostrar "medicos restantes = 1" e o resto = 0.
SELECT 'medicos restantes' AS info, count(*) AS n FROM public.medicos
UNION ALL SELECT 'profiles',     count(*) FROM public.profiles
UNION ALL SELECT 'avaliacoes',   count(*) FROM public.avaliacoes
UNION ALL SELECT 'triagens',     count(*) FROM public.triagens
UNION ALL SELECT 'assinaturas',  count(*) FROM public.assinaturas;

COMMIT;
