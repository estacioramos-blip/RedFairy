-- =============================================================================
-- migrate_indicador_auth.sql  (Fase 1b — cadastro/login do INDICADOR)
-- =============================================================================
-- RPCs SECURITY DEFINER (espelham register_paciente/login_paciente):
--   - register_indicador: cadastra (CPF + senha bcrypt) e gera o `codigo` do link.
--   - login_indicador:    valida CPF + senha e devolve {id, nome, codigo}.
-- Como indicadores tem RLS ligado e sem policies, TODO acesso passa por aqui.
--
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole -> Run.
-- =============================================================================

-- register_indicador → { ok, id, codigo, erro }
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
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF coalesce(length(p_senha), 0) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Senha muito curta (minimo 6)');
  END IF;
  IF EXISTS (SELECT 1 FROM public.indicadores WHERE cpf = v_cpf) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF ja cadastrado como indicador');
  END IF;

  -- Gera um codigo curto e unico para o link (?ref=<codigo>). Não expõe o CPF.
  LOOP
    v_codigo := 'IND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_codigo);
  END LOOP;

  INSERT INTO public.indicadores (codigo, cpf, nome, celular, email, pix_chave, usdc_wallet, tipo, senha_klipbit)
  VALUES (v_codigo, v_cpf, p_nome, p_celular, p_email, p_pix, p_usdc, p_tipo, crypt(p_senha, gen_salt('bf', 10)))
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'codigo', v_codigo);
END;
$$;

-- login_indicador → { ok, id, nome, codigo, erro }
CREATE OR REPLACE FUNCTION public.login_indicador(p_cpf text, p_senha text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := translate(coalesce(p_cpf, ''), '.- /()', '');
  r     record;
BEGIN
  SELECT id, nome, codigo, senha_klipbit, ativo INTO r
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

  RETURN jsonb_build_object('ok', true, 'id', r.id, 'nome', r.nome, 'codigo', r.codigo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_indicador(text,text,text,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_indicador(text,text) TO anon, authenticated;
