-- =============================================================================
-- migrate_fix_config_segredos.sql   (auditoria jul/2026 — segredos vazando via anon)
-- =============================================================================
-- RODAR NO SUPABASE DASHBOARD -> SQL EDITOR (revisar antes).
--
-- ACHADO: a política `config_public_read` da tabela `config` libera SELECT para
-- `public` (anon) com USING (true) — ou seja, QUALQUER pessoa com a anon key lê a
-- tabela INTEIRA. Isso vaza material de autenticação BACKEND-ONLY que o cliente
-- nunca precisa ler:
--   • telegram_bot_token / telegram_chat_id / telegram_chat_plantonista
--       (as notificações vão por RPCs SECURITY DEFINER tg_enviar/tg_enviar_plantonista,
--        que leem o segredo internamente — o browser não precisa dele)
--   • caixa_senha_hash  (HASH BCRYPT da senha da Tesouraria — quebrável offline!)
--   • caixa_token_hash / caixa_token_exp  (segredos da sessão do Caixa; lidos só por
--        caixa_login/caixa_token_ok, que são SECURITY DEFINER)
--
-- CORREÇÃO: a política passa a EXCLUIR as chaves 'telegram%' e 'caixa%' da leitura
-- anon. Tudo que o cliente legitimamente lê (preços, pix_chave, comissões, cotação)
-- NÃO começa com esses prefixos, então continua público. As funções SECURITY DEFINER
-- furam o RLS (rodam como owner) e seguem lendo os segredos normalmente.
--
-- O Admin exibe/edita as chaves do Telegram na aba Configurações — passa a lê-las por
-- uma RPC admin (token_admin_ok), já que a leitura direta anon foi cortada. As chaves
-- do Caixa não são exibidas em lugar nenhum do front, então não precisam de RPC de leitura.
--
-- Alinha com o plano de RLS do projeto (DOCS/91_RLS_PLAN.md, DEC-008) — pedaço de
-- segredo do config, isolado da migração grande dos dados de saúde (Fase 2).
-- =============================================================================

-- 1) Tira os segredos da leitura anon (mantém preços/pix/comissões/cotação públicos).
ALTER POLICY config_public_read ON public.config
  USING (chave NOT LIKE 'telegram%' AND chave NOT LIKE 'caixa%');

-- 2) O Admin lê as 3 chaves do Telegram para exibir/editar (guarda: token_admin_ok).
CREATE OR REPLACE FUNCTION public.admin_ler_config_telegram(p_crm text, p_token text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  SELECT jsonb_object_agg(chave, valor) INTO v
    FROM public.config WHERE chave LIKE 'telegram%';
  RETURN jsonb_build_object('ok', true, 'config', COALESCE(v, '{}'::jsonb));
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_ler_config_telegram(text, text) TO anon, authenticated;
