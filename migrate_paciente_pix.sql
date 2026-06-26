-- =============================================================================
-- migrate_paciente_pix.sql   (Fase 6 — coletar a chave PIX do paciente-indicador)
-- =============================================================================
-- RASCUNHO PARA REVISÃO (rodar no Supabase Dashboard -> SQL Editor).
-- Requer migrate_paciente_indicador.sql já aplicado.
--
-- Problema: nunca coletávamos o PIX do bariátrico. Agora, ao tocar em INDICAR pela
-- 1ª vez, o paciente informa nome + chave PIX (CPF já aparece). Depois, só um link
-- "Desejo trocar minha chave PIX".
--
-- Mudanças:
--   * paciente_virar_indicador: NÃO define mais pix_chave = CPF (deixa vazio p/ detectar
--     "primeira vez") e passa a devolver nome + pix.
--   * paciente_salvar_pix(cpf, nome, pix): grava nome + PIX do indicador POR CPF (sem token,
--     pois o paciente acessa pela sessão de paciente).
-- =============================================================================

-- 1) Redefine paciente_virar_indicador (sem default de PIX; devolve nome + pix) ----
CREATE OR REPLACE FUNCTION public.paciente_virar_indicador(p_cpf text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf    text := translate(coalesce(p_cpf,''), '.- /()', '');
  v_codigo text;
  v_nome   text;
  v_pix    text;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF inválido');
  END IF;

  -- Idempotente: já é indicador? devolve código + nome + pix.
  SELECT codigo, nome, pix_chave INTO v_codigo, v_nome, v_pix
    FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_codigo IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'codigo', v_codigo, 'ja_era', true,
                              'nome', COALESCE(v_nome,''), 'pix', COALESCE(v_pix,''));
  END IF;

  -- Nome a partir do profile do paciente.
  SELECT nome INTO v_nome FROM public.profiles
    WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf
    LIMIT 1;

  -- Código único ('IND' + 6).
  LOOP
    v_codigo := 'IND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_codigo);
  END LOOP;

  -- Cria SEM pix_chave (vazio = ainda não informou; o modal vai pedir).
  INSERT INTO public.indicadores (codigo, cpf, nome, tipo, ativo)
  VALUES (v_codigo, v_cpf, COALESCE(NULLIF(v_nome,''), 'Paciente'), 'paciente', true);

  RETURN jsonb_build_object('ok', true, 'codigo', v_codigo, 'ja_era', false,
                            'nome', COALESCE(v_nome,''), 'pix', '');
END;
$$;

-- 2) RPC: paciente grava nome + PIX do indicador (por CPF, sem token de login) -----
CREATE OR REPLACE FUNCTION public.paciente_salvar_pix(p_cpf text, p_nome text, p_pix text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_cpf text := translate(coalesce(p_cpf,''), '.- /()', '');
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok', false, 'erro', 'CPF inválido'); END IF;
  IF coalesce(btrim(p_pix), '') = '' THEN RETURN jsonb_build_object('ok', false, 'erro', 'Informe a chave PIX'); END IF;
  UPDATE public.indicadores
     SET pix_chave = btrim(p_pix),
         nome      = COALESCE(NULLIF(btrim(p_nome), ''), nome)
   WHERE cpf = v_cpf;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'erro', 'Indicador não encontrado'); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.paciente_virar_indicador(text)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.paciente_salvar_pix(text, text, text)      TO anon, authenticated;
