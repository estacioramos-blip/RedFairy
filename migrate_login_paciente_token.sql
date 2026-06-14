-- ============================================================
-- migrate_login_paciente_token.sql  (PWA fase 4b — atalho passwordless no iPhone)
--
-- O atalho da fada no iPhone (standalone) tem storage SEPARADO do Safari, então a
-- sessão (paciente_id) pode não estar lá. Solução: o atalho carrega o token de
-- sessão no link (/?p=TOKEN&c=CPF) e o app loga por token, sem senha.
--
-- Esta função valida (CPF + token de sessão, sha256, 30 dias — mesmo esquema do
-- token_sessao.sql) e devolve {ok, id, nome}. O token já é emitido por
-- register_paciente/login_paciente (token_sessao.sql).
--
-- Idempotente: CREATE OR REPLACE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.login_paciente_token(p_cpf text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  text := translate(coalesce(p_cpf, ''), '.- /()', '');
  v_id   uuid;
  v_nome text;
BEGIN
  SELECT id, nome INTO v_id, v_nome
  FROM public.profiles
  WHERE cpf = v_cpf
    AND coalesce(p_token, '') <> ''
    AND session_token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND session_token_exp > now()
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Token invalido ou expirado');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'nome', v_nome);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.login_paciente_token(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
