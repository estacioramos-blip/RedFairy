-- ============================================================
-- migrate_telegram_notif.sql  (DEC-013 — Notificação Telegram de comissão)
--
-- A cada paciente convertido (triado por médico + cadastrou + pagou), envia uma
-- mensagem no Telegram da ADM com o valor e a CHAVE PIX do médico, pra ADM
-- pagar a comissão direto da mensagem. 1 mensagem por paciente (mesma regra do
-- crédito: renovação não dispara de novo).
--
-- Envio: pg_net (HTTP assíncrono do Postgres) -> API do Bot do Telegram.
-- Config: telegram_bot_token + telegram_chat_id (preenchidos no admin).
--
-- ⚠️ Requer a extensão pg_net habilitada. O CREATE EXTENSION abaixo cobre;
-- se der erro de permissão, habilite no Dashboard -> Database -> Extensions -> pg_net.
--
-- Idempotente: CREATE EXTENSION IF NOT EXISTS, ON CONFLICT DO NOTHING,
-- CREATE OR REPLACE. Termina com NOTIFY pgrst.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Config: credenciais do bot (preencher no admin) ------------------------------
INSERT INTO public.config (chave, valor, descricao) VALUES
  ('telegram_bot_token', '', 'Token do Bot do Telegram (do @BotFather) para notificações da ADM'),
  ('telegram_chat_id',   '', 'Chat ID do Telegram que recebe as notificações da ADM')
ON CONFLICT (chave) DO NOTHING;

-- Helper genérico de envio (reutilizável p/ futuras notificações) ---------------
CREATE OR REPLACE FUNCTION public.tg_enviar(p_msg text)
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
  v_chat  := (SELECT valor FROM public.config WHERE chave = 'telegram_chat_id');
  IF v_token IS NULL OR btrim(v_token) = '' OR v_chat IS NULL OR btrim(v_chat) = '' THEN
    RETURN;  -- telegram não configurado: silencioso
  END IF;
  PERFORM net.http_post(
    url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body    := jsonb_build_object('chat_id', v_chat, 'text', p_msg),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
END;
$function$;

-- fn_credita_medico: credita E notifica (só quando o crédito é NOVO) ------------
CREATE OR REPLACE FUNCTION public.fn_credita_medico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  text;
  v_orig text;
  v_rows int;
  v_nome text;
  v_pix  text;
  v_usd  numeric;
  v_cot  numeric;
  v_cpfd text;
  v_msg  text;
BEGIN
  IF NEW.status <> 'ativa' THEN
    RETURN NEW;
  END IF;

  SELECT cpf, medico_origem INTO v_cpf, v_orig
  FROM public.profiles WHERE id = NEW.user_id;

  IF v_orig IS NULL OR btrim(v_orig) = '' OR v_cpf IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.creditos_medico (medico_crm, cpf_paciente, assinatura_id)
  VALUES (v_orig, v_cpf, NEW.id)
  ON CONFLICT (cpf_paciente) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN NEW;  -- já creditado antes: não notifica de novo
  END IF;

  -- monta e envia a notificação de comissão
  SELECT nome, pix_chave INTO v_nome, v_pix FROM public.medicos WHERE crm = v_orig;
  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);

  v_cpfd := regexp_replace(coalesce(v_cpf,''), '\D', '', 'g');
  v_cpfd := CASE WHEN length(v_cpfd) = 11
                 THEN '***.' || substr(v_cpfd,4,3) || '.' || substr(v_cpfd,7,3) || '-**'
                 ELSE coalesce(v_cpf,'-') END;

  v_msg := '💰 Nova comissão 4DOC!' || E'\n' ||
           'Médico: ' || COALESCE(NULLIF(v_nome,''), v_orig) || ' (CRM ' || v_orig || ')' || E'\n' ||
           'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
           'Pagar: US$ ' || to_char(v_usd, 'FM999990.00') ||
           CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
           'PIX: ' || COALESCE(NULLIF(v_pix,''), '(médico sem chave PIX cadastrada)');

  PERFORM public.tg_enviar(v_msg);

  RETURN NEW;
END;
$function$;

NOTIFY pgrst, 'reload schema';
