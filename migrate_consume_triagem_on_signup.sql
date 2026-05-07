-- ============================================================
-- migrate_consume_triagem_on_signup.sql
--
-- Cria RPC consume_triagem_on_signup(p_user_id, p_cpf) que:
--   1. Le a triagem mais recente do CPF (bypass RLS via SECURITY DEFINER)
--   2. Se bariatrica = true, faz UPDATE em profiles.bariatrica
--   3. Deleta TODAS as triagens daquele CPF
--
-- Por que SECURITY DEFINER?
--   A policy de SELECT em triagens exige auth.uid() = user_id, mas no
--   momento do cadastro a triagem ainda esta orfa (user_id = NULL).
--   Nao tem policy de DELETE em triagens. Em vez de criar 2 policies
--   complexas (e abrir vetores de ataque), encapsulamos tudo numa
--   funcao server-side que valida a relacao user_id <-> CPF antes
--   de fazer qualquer coisa.
--
-- Seguranca:
--   - Verifica se p_user_id corresponde a auth.uid() OU se eh chamado
--     pelo proprio dono recem-criado (auth.uid() = p_user_id).
--   - Verifica se o CPF realmente eh do profile do user_id passado
--     (defense in depth: nao deixa user_A consumir triagem do CPF
--     do user_B se de algum modo o CPF dele bater).
-- ============================================================

CREATE OR REPLACE FUNCTION consume_triagem_on_signup(
  p_user_id UUID,
  p_cpf TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bariatrica BOOLEAN;
  v_profile_cpf TEXT;
  v_deleted_count INT;
BEGIN
  -- Defesa 1: so o proprio user pode consumir suas triagens
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Nao autorizado';
  END IF;

  -- Defesa 2: o CPF tem que bater com o profile do user
  SELECT cpf INTO v_profile_cpf
  FROM profiles
  WHERE id = p_user_id;

  IF v_profile_cpf IS NULL OR v_profile_cpf <> p_cpf THEN
    RAISE EXCEPTION 'CPF nao corresponde ao profile do usuario';
  END IF;

  -- 1. Le a triagem mais recente do CPF (bypassa RLS porque SECURITY DEFINER)
  SELECT bariatrica INTO v_bariatrica
  FROM triagens
  WHERE cpf = p_cpf
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. Se bariatrica = true, copia pra profile
  IF v_bariatrica IS TRUE THEN
    UPDATE profiles
    SET bariatrica = TRUE
    WHERE id = p_user_id;
  END IF;

  -- 3. Deleta TODAS as triagens daquele CPF (orfas ou nao)
  WITH deleted AS (
    DELETE FROM triagens WHERE cpf = p_cpf RETURNING 1
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  RETURN jsonb_build_object(
    'bariatrica_copied', COALESCE(v_bariatrica, false),
    'triagens_deleted', v_deleted_count
  );
END;
$$;

-- Permite que usuarios autenticados chamem a RPC
GRANT EXECUTE ON FUNCTION consume_triagem_on_signup(UUID, TEXT) TO authenticated;

-- ============================================================
-- Para testar manualmente depois (opcional):
-- SELECT consume_triagem_on_signup('uuid-do-user', '12345678901');
-- ============================================================
