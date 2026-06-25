-- =============================================================================
-- migrate_paciente_indicador.sql   (Fase 4 — o PACIENTE também vira INDICADOR)
-- =============================================================================
-- RASCUNHO PARA REVISÃO (rodar no Supabase Dashboard -> SQL Editor).
--
-- Ideia: o paciente bariátrico também pode indicar OUTROS bariátricos e ganhar créditos
-- (US$10 por indicado que paga), abatendo o próprio investimento na plataforma.
--
-- O paciente "vira indicador" reusando o CPF dele, SEM login próprio de indicador: ele
-- acessa o painel (QR/link/créditos) pela sessão de PACIENTE. O crédito entra pela mesma
-- engrenagem (fn_credita_medico → creditos_indicador), pois o código vai para `indicadores`.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.paciente_virar_indicador(p_cpf text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf    text := translate(coalesce(p_cpf,''), '.- /()', '');
  v_codigo text;
  v_nome   text;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF inválido');
  END IF;

  -- Idempotente: já é indicador? devolve o código existente.
  SELECT codigo INTO v_codigo FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_codigo IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'codigo', v_codigo, 'ja_era', true);
  END IF;

  -- Nome a partir do profile do paciente (para o painel/notificações).
  SELECT nome INTO v_nome FROM public.profiles
    WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf
    LIMIT 1;

  -- Gera código único, mesmo formato do register_indicador ('IND' + 6).
  LOOP
    v_codigo := 'IND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_codigo);
  END LOOP;

  -- Cria o indicador "paciente": sem senha (acessa pela sessão de paciente).
  -- PIX default = o próprio CPF (chave válida); o paciente pode trocar depois.
  INSERT INTO public.indicadores (codigo, cpf, nome, tipo, ativo, pix_chave)
  VALUES (v_codigo, v_cpf, COALESCE(NULLIF(v_nome,''), 'Paciente'), 'paciente', true, v_cpf);

  RETURN jsonb_build_object('ok', true, 'codigo', v_codigo, 'ja_era', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.paciente_virar_indicador(text) TO anon, authenticated;

-- Reuso: o painel do paciente-indicador usa as RPCs JÁ existentes:
--   listar_creditos_indicador(codigo)  -> contadores/CPFs mascarados
--   salvar_pix_indicador(codigo, token, pix)  -> *exige token*; para o paciente (sem login)
--     podemos criar uma variante por CPF se quiser editar o PIX pelo painel do paciente.
