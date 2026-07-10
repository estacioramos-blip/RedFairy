-- ============================================================================
-- migrate_tg_plantonista.sql
-- Fase 2 do "Botão de Emergência": notificar também o MÉDICO PLANTONISTA.
--
-- tg_enviar(msg) já manda para o chat do ADM (config 'telegram_chat_id').
-- Esta função genérica manda para o chat cujo id está na chave de config passada,
-- permitindo um 2º destino (o plantonista) sem expor quem é. O app chama:
--   supabase.rpc('tg_enviar_chave', { p_msg, p_chave_chat: 'telegram_chat_plantonista' })
--
-- PASSOS no Supabase → SQL Editor:
--   1) Rodar este arquivo (cria a função + a chave de config vazia).
--   2) Preencher a chave 'telegram_chat_plantonista' com o chat_id do Telegram do
--      plantonista (Admin → Configurações, ou UPDATE direto). Enquanto vazia, a
--      notificação ao plantonista é silenciosa (não quebra nada).
-- ============================================================================

-- Chave de config (oculta) com o chat_id do plantonista. Vazia por padrão.
INSERT INTO public.config (chave, valor)
VALUES ('telegram_chat_plantonista', '')
ON CONFLICT (chave) DO NOTHING;

-- Envia p_msg ao chat cujo id está na config p_chave_chat (Telegram, server-side).
CREATE OR REPLACE FUNCTION public.tg_enviar_chave(p_msg text, p_chave_chat text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_token text;
  v_chat  text;
BEGIN
  v_token := (SELECT valor FROM public.config WHERE chave = 'telegram_bot_token');
  v_chat  := (SELECT valor FROM public.config WHERE chave = p_chave_chat);
  IF v_token IS NULL OR btrim(v_token) = '' OR v_chat IS NULL OR btrim(v_chat) = '' THEN
    RETURN;  -- token/destino não configurado: silencioso
  END IF;
  PERFORM net.http_post(
    url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body    := jsonb_build_object('chat_id', v_chat, 'text', p_msg),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
END;
$function$;

-- Permitir que o app (anon/authenticated) chame a função.
GRANT EXECUTE ON FUNCTION public.tg_enviar_chave(text, text) TO anon, authenticated;
