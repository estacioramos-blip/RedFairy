-- =============================================================================
-- migrate_indicador_token.sql
-- =============================================================================
-- Token de sessão do indicador + salvar PIX com segurança.
-- register/login_indicador passam a emitir um token (sha256, 30 dias). O PIX é
-- salvo via salvar_pix_indicador, que exige código + token válido (o código é
-- público no link, então sozinho não pode autorizar mudança de PIX).
--
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole -> Run.
-- =============================================================================

-- register_indicador → { ok, id, codigo, token, erro }
CREATE OR REPLACE FUNCTION public.register_indicador(
  p_cpf text, p_senha text, p_nome text DEFAULT NULL,
  p_celular text DEFAULT NULL, p_email text DEFAULT NULL,
  p_pix text DEFAULT NULL, p_usdc text DEFAULT NULL, p_tipo text DEFAULT NULL
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf    text := translate(coalesce(p_cpf, ''), '.- /()', '');
  v_codigo text;
  v_id     uuid;
  v_token  text;
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido'); END IF;
  IF coalesce(length(p_senha), 0) < 6 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Senha muito curta (minimo 6)'); END IF;
  IF EXISTS (SELECT 1 FROM public.indicadores WHERE cpf = v_cpf) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF ja cadastrado como indicador');
  END IF;

  LOOP
    v_codigo := 'IND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_codigo);
  END LOOP;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.indicadores (codigo, cpf, nome, celular, email, pix_chave, usdc_wallet, tipo, senha_klipbit, session_token_hash, session_token_exp)
  VALUES (v_codigo, v_cpf, p_nome, p_celular, p_email, p_pix, p_usdc, p_tipo, crypt(p_senha, gen_salt('bf', 10)),
          encode(digest(v_token, 'sha256'), 'hex'), now() + interval '30 days')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'codigo', v_codigo, 'token', v_token);
END;
$$;

-- login_indicador → { ok, id, nome, codigo, token, pix, usdc, erro }
CREATE OR REPLACE FUNCTION public.login_indicador(p_cpf text, p_senha text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf   text := translate(coalesce(p_cpf, ''), '.- /()', '');
  v_token text;
  r       record;
BEGIN
  SELECT id, nome, codigo, senha_klipbit, ativo, pix_chave, usdc_wallet INTO r
  FROM public.indicadores WHERE cpf = v_cpf;

  IF r.id IS NULL OR r.senha_klipbit IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF nao encontrado');
  END IF;
  IF crypt(p_senha, r.senha_klipbit) <> r.senha_klipbit THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Senha incorreta');
  END IF;
  IF NOT r.ativo THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Indicador inativo');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  UPDATE public.indicadores
     SET session_token_hash = encode(digest(v_token, 'sha256'), 'hex'),
         session_token_exp = now() + interval '30 days'
   WHERE id = r.id;

  RETURN jsonb_build_object('ok', true, 'id', r.id, 'nome', r.nome, 'codigo', r.codigo,
                            'token', v_token, 'pix', r.pix_chave, 'usdc', r.usdc_wallet);
END;
$$;

-- salvar_pix_indicador → exige código + token válido. { ok, erro }
CREATE OR REPLACE FUNCTION public.salvar_pix_indicador(p_codigo text, p_token text, p_pix text, p_usdc text DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE r record;
BEGIN
  SELECT id INTO r FROM public.indicadores
   WHERE codigo = p_codigo
     AND session_token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
     AND session_token_exp > now();
  IF r.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida. Entre de novo.');
  END IF;
  UPDATE public.indicadores
     SET pix_chave   = NULLIF(btrim(coalesce(p_pix, '')), ''),
         usdc_wallet = NULLIF(btrim(coalesce(p_usdc, '')), '')
   WHERE id = r.id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- contato_indicador → dados pros atalhos de PIX (CPF do indicador + celular do
-- perfil de paciente, se houver). Token-protegido (só o próprio indicador logado).
-- (profiles não tem e-mail — daí só CPF e celular.)
CREATE OR REPLACE FUNCTION public.contato_indicador(p_codigo text, p_token text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_cpf text; v_cel text;
BEGIN
  SELECT cpf INTO v_cpf FROM public.indicadores
   WHERE codigo = p_codigo
     AND session_token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
     AND session_token_exp > now();
  IF v_cpf IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  SELECT celular INTO v_cel FROM public.profiles WHERE cpf = v_cpf LIMIT 1;
  RETURN jsonb_build_object('ok', true, 'cpf', v_cpf, 'celular', v_cel);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_indicador(text,text,text,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_indicador(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_pix_indicador(text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contato_indicador(text,text) TO anon, authenticated;
