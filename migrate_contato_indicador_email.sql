-- =============================================================================
-- migrate_contato_indicador_email.sql
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- O painel do INDICADOR (VER MEUS CRÉDITOS) reusa o PacienteIndicaModal, que oferece
-- CPF / CELULAR / E-MAIL como chave PIX. Faltavam o celular e o e-mail do indicador.
-- contato_indicador passa a devolver celular + email do CADASTRO do indicador
-- (tabela indicadores), com fallback do celular em profiles.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.contato_indicador(p_codigo text, p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_cpf text; v_cel text; v_email text;
BEGIN
  SELECT cpf, celular, email INTO v_cpf, v_cel, v_email
    FROM public.indicadores
   WHERE codigo = p_codigo
     AND session_token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
     AND session_token_exp > now();
  IF v_cpf IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  -- Fallback do celular no profiles (indicador que também é paciente).
  IF v_cel IS NULL OR btrim(v_cel) = '' THEN
    SELECT celular INTO v_cel FROM public.profiles WHERE cpf = v_cpf LIMIT 1;
  END IF;
  RETURN jsonb_build_object('ok', true, 'cpf', v_cpf, 'celular', v_cel, 'email', v_email);
END;
$function$;
