-- ============================================================================
-- migrate_tg_plantonista_fix.sql
-- CORREÇÃO DE SEGURANÇA (auditoria): a tg_enviar_chave(p_msg, p_chave_chat) deixava
-- o CHAMADOR escolher o destino (qualquer chave de config) e estava liberada p/ anon
-- — qualquer um com a anon key poderia mandar texto arbitrario ao chat do ADM ou do
-- plantonista (spam / "grito de lobo"). Trocada por uma funcao DEDICADA com destino
-- FIXO (telegram_chat_plantonista), igual a tg_enviar ja faz com telegram_chat_id.
--
-- Rodar no Supabase → SQL Editor (depois de ter rodado migrate_tg_plantonista.sql).
-- ============================================================================

-- Remove a funcao com destino escolhido pelo cliente (fecha o buraco).
DROP FUNCTION IF EXISTS public.tg_enviar_chave(text, text);

-- Funcao dedicada: destino FIXO na chave telegram_chat_plantonista, o cliente so passa a msg.
CREATE OR REPLACE FUNCTION public.tg_enviar_plantonista(p_msg text)
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
  v_chat  := (SELECT valor FROM public.config WHERE chave = 'telegram_chat_plantonista');
  IF v_token IS NULL OR btrim(v_token) = '' OR v_chat IS NULL OR btrim(v_chat) = '' THEN
    RETURN;  -- plantonista nao configurado: silencioso
  END IF;
  PERFORM net.http_post(
    url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body    := jsonb_build_object('chat_id', v_chat, 'text', p_msg),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.tg_enviar_plantonista(text) TO anon, authenticated;
