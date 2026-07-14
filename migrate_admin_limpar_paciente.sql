-- migrate_admin_limpar_paciente.sql
-- ---------------------------------------------------------------------------
-- ADMIN: apaga TODOS os dados de um paciente especifico a partir do CPF (ferramenta
-- de teste). Protegido por token_admin_ok. Retorna a contagem apagada por tabela.
--
-- Salvaguardas: exige admin valido; CPF de 11 digitos; ABORTA se o CPF pertencer a
-- um MEDICO (esta funcao e' so para pacientes). Normaliza o CPF (so digitos) dos dois
-- lados da comparacao. Tambem remove a conta em auth.users (para permitir novo cadastro
-- com o mesmo e-mail) — se nao houver permissao no schema auth, ignora sem abortar a
-- limpeza dos dados public.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_limpar_paciente(p_crm text, p_token text, p_cpf text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_uid uuid;
  v_cod text;
  v_auth_ok boolean := false;
  v_del jsonb := '{}'::jsonb;
  n int;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido (precisa de 11 digitos)');
  END IF;
  IF EXISTS (SELECT 1 FROM public.medicos WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Esse CPF pertence a um MEDICO — abortado (use apenas para pacientes)');
  END IF;

  SELECT id     INTO v_uid FROM public.profiles    WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1;
  SELECT codigo INTO v_cod FROM public.indicadores WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf AND COALESCE(tipo,'')='paciente' LIMIT 1;

  -- Tabelas por cpf_paciente
  DELETE FROM public.abatimentos_paciente   WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('abatimentos_paciente', n);
  DELETE FROM public.creditos_avaliacao     WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('creditos_avaliacao', n);
  DELETE FROM public.creditos_medico        WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('creditos_medico', n);
  DELETE FROM public.encaminhamentos_medico WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('encaminhamentos_medico', n);
  DELETE FROM public.extratos_oba           WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('extratos_oba', n);
  DELETE FROM public.opiniao_medica         WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('opiniao_medica', n);
  DELETE FROM public.prescricoes            WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('prescricoes', n);

  -- creditos_indicador / indicacoes_precadastro: por cpf_paciente E pelo codigo do proprio paciente-indicador
  DELETE FROM public.creditos_indicador     WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf OR (v_cod IS NOT NULL AND indicador_codigo = v_cod); GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('creditos_indicador', n);
  DELETE FROM public.indicacoes_precadastro WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf OR (v_cod IS NOT NULL AND indicador_codigo = v_cod); GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('indicacoes_precadastro', n);

  -- Tabelas por cpf
  DELETE FROM public.oba_anamnese      WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('oba_anamnese', n);
  DELETE FROM public.avaliacoes        WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('avaliacoes', n);
  DELETE FROM public.triagens          WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('triagens', n);
  DELETE FROM public.pedidos_documento WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('pedidos_documento', n);

  -- assinaturas por user_id
  IF v_uid IS NOT NULL THEN
    DELETE FROM public.assinaturas WHERE user_id = v_uid; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('assinaturas', n);
  END IF;

  -- perfil de indicador do proprio paciente + o profile
  DELETE FROM public.indicadores WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('indicadores', n);
  DELETE FROM public.profiles    WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('profiles', n);

  -- conta de auth (permite novo cadastro com o mesmo e-mail). Nao aborta se faltar permissao.
  IF v_uid IS NOT NULL THEN
    BEGIN
      DELETE FROM auth.users WHERE id = v_uid;
      v_auth_ok := true;
    EXCEPTION WHEN OTHERS THEN
      v_auth_ok := false;
    END;
  END IF;

  RETURN jsonb_build_object('ok', true, 'cpf', v_cpf, 'user_id', v_uid, 'indicador_codigo', v_cod,
                            'apagados', v_del, 'auth_removida', v_auth_ok);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_limpar_paciente(text, text, text) TO anon, authenticated;
