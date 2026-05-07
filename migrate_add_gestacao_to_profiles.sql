-- ============================================================
-- migrate_add_gestacao_to_profiles.sql
--
-- 1. Adiciona em profiles:
--    - gestante BOOLEAN
--    - semanas_gestacao_triagem INTEGER (semanas no momento da triagem)
--    - data_triagem_gestacao TIMESTAMPTZ (timestamp da triagem, p/ recalcular)
--
-- 2. Substitui consume_triagem_on_signup para tambem copiar gestacao
--    da triagem para o profile (alem da bariatrica que ja copiava).
-- ============================================================

-- ============================================================
-- Parte 1: colunas novas em profiles
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gestante BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS semanas_gestacao_triagem INTEGER,
  ADD COLUMN IF NOT EXISTS data_triagem_gestacao TIMESTAMPTZ;

-- ============================================================
-- Parte 2: substitui RPC para copiar gestacao tambem
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
  v_gestante BOOLEAN;
  v_semanas INTEGER;
  v_data_triagem TIMESTAMPTZ;
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

  -- 1. Le a triagem mais recente do CPF
  SELECT bariatrica, gestante, semanas_gestacao, created_at
  INTO v_bariatrica, v_gestante, v_semanas, v_data_triagem
  FROM triagens
  WHERE cpf = p_cpf
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. Copia bariatrica (estado permanente)
  IF v_bariatrica IS TRUE THEN
    UPDATE profiles
    SET bariatrica = TRUE
    WHERE id = p_user_id;
  END IF;

  -- 3. Copia gestacao + semanas + data_triagem (estado temporario,
  --    o cliente recalcula semanas atuais a partir da data_triagem).
  IF v_gestante IS TRUE AND v_semanas IS NOT NULL THEN
    UPDATE profiles
    SET gestante = TRUE,
        semanas_gestacao_triagem = v_semanas,
        data_triagem_gestacao = v_data_triagem
    WHERE id = p_user_id;
  END IF;

  -- 4. Deleta TODAS as triagens daquele CPF
  WITH deleted AS (
    DELETE FROM triagens WHERE cpf = p_cpf RETURNING 1
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  RETURN jsonb_build_object(
    'bariatrica_copied', COALESCE(v_bariatrica, false),
    'gestante_copied', COALESCE(v_gestante, false),
    'semanas_copied', v_semanas,
    'triagens_deleted', v_deleted_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION consume_triagem_on_signup(UUID, TEXT) TO authenticated;
