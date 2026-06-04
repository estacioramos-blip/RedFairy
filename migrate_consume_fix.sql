-- ============================================================
-- migrate_consume_fix.sql  (DEC-014 — conserto raiz do consume_triagem_on_signup)
--
-- BUG: no cadastro o e-mail ainda não foi confirmado → não há sessão →
-- auth.uid() é NULO → a defesa `IF auth.uid() IS NULL ... RAISE` abortava a
-- função inteira: não copiava bariatrica, não capturava medico_origem, não
-- apagava triagens. Resultado: 0 perfis bariátricos, créditos sem origem.
--
-- FIX:
--  • auth.uid(): só bloqueia se houver sessão E ela não bater com p_user_id
--    (sem sessão = signup → permite; a 2ª defesa, o CPF == perfil, é o gate real).
--  • bariatrica robusto: true se QUALQUER triagem do CPF for bariátrica.
--  • mantém captura de medico_origem (créditos) e o delete das triagens.
--  • Backfill: perfis existentes com triagem bariátrica ganham bariatrica=true.
--
-- Idempotente: CREATE OR REPLACE + UPDATE condicional. Termina com NOTIFY pgrst.
-- ============================================================

CREATE OR REPLACE FUNCTION public.consume_triagem_on_signup(
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
  v_medico_origem TEXT;
BEGIN
  -- Defesa 1 (relaxada): se HÁ sessão, ela tem que ser do próprio usuário.
  -- Sem sessão (signup com e-mail não confirmado), permite — a defesa do CPF abaixo gateia.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Nao autorizado';
  END IF;

  -- Defesa 2 (gate real): o CPF tem que ser o do perfil do user_id passado.
  SELECT cpf INTO v_profile_cpf FROM profiles WHERE id = p_user_id;
  IF v_profile_cpf IS NULL OR
     regexp_replace(coalesce(v_profile_cpf,''), '\D', '', 'g') <> regexp_replace(coalesce(p_cpf,''), '\D', '', 'g') THEN
    RAISE EXCEPTION 'CPF nao corresponde ao profile do usuario';
  END IF;

  -- Bariátrico: true se QUALQUER triagem do CPF for bariátrica.
  SELECT EXISTS (
    SELECT 1 FROM triagens
     WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = regexp_replace(coalesce(p_cpf,''), '\D', '', 'g')
       AND bariatrica IS TRUE
  ) INTO v_bariatrica;

  IF v_bariatrica IS TRUE THEN
    UPDATE profiles SET bariatrica = TRUE WHERE id = p_user_id;
  END IF;

  -- Médico de origem (1º que triou) — capturado ANTES de apagar as triagens.
  SELECT medico_crm INTO v_medico_origem
  FROM (
    SELECT medico_crm, created_at FROM triagens
      WHERE cpf = p_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM avaliacoes
      WHERE cpf = p_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
  ) s
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_medico_origem IS NOT NULL THEN
    UPDATE profiles SET medico_origem = COALESCE(medico_origem, v_medico_origem) WHERE id = p_user_id;
  END IF;

  -- Apaga as triagens do CPF (comportamento original).
  WITH deleted AS (
    DELETE FROM triagens WHERE cpf = p_cpf RETURNING 1
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  RETURN jsonb_build_object(
    'bariatrica_copied', COALESCE(v_bariatrica, false),
    'triagens_deleted', v_deleted_count,
    'medico_origem', v_medico_origem
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_triagem_on_signup(UUID, TEXT) TO anon, authenticated;

-- Backfill: perfis existentes que têm triagem bariátrica mas estão como false.
UPDATE public.profiles p
   SET bariatrica = true
 WHERE coalesce(p.bariatrica, false) = false
   AND EXISTS (
     SELECT 1 FROM public.triagens t
      WHERE regexp_replace(coalesce(t.cpf,''), '\D', '', 'g') = regexp_replace(coalesce(p.cpf,''), '\D', '', 'g')
        AND t.bariatrica IS TRUE
   );

NOTIFY pgrst, 'reload schema';
