-- =============================================================================
-- migrate_indicador_reservar.sql   (indicador RESERVA um CPF — espelho do médico)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- Usa indicacoes_precadastro (cpf_paciente, indicador_codigo, confirmado).
--
-- Fase 1: o indicador (paciente que virou indicador) digita um CPF e o RESERVA.
-- Grava confirmado=TRUE (conta pro crédito, igual ao medico_encaminhar_cpf do médico).
-- A Fase 2 (escolha do paciente quando há médico E indicador) vem depois.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.indicador_reservar_cpf(p_codigo text, p_cpf text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text; v_cod text; v_ja boolean;
BEGIN
  v_cod := btrim(coalesce(p_codigo, ''));
  v_cpf := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_cod) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Indicador nao encontrado');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE cpf = v_cpf) INTO v_ja;

  -- Não duplica: se este indicador já reservou este CPF, só reconfirma.
  IF EXISTS (SELECT 1 FROM public.indicacoes_precadastro WHERE cpf_paciente = v_cpf AND indicador_codigo = v_cod) THEN
    UPDATE public.indicacoes_precadastro
       SET confirmado = true, created_at = now()
     WHERE cpf_paciente = v_cpf AND indicador_codigo = v_cod;
  ELSE
    INSERT INTO public.indicacoes_precadastro (cpf_paciente, indicador_codigo, confirmado)
    VALUES (v_cpf, v_cod, true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'ja_cadastrado', v_ja);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.indicador_reservar_cpf(text, text) TO anon, authenticated;
