-- ============================================================================
-- migrate_lote1_cadastro_plantao_limpeza.sql — três buracos da auditoria de 22/09
-- ============================================================================
--
-- 1. profiles_atualizar entregava (e deixava reescrever) o cadastro de QUALQUER
--    CPF a QUALQUER médico logado.
-- 2. tg_enviar_plantonista estava aberta ao anon: dava para forjar emergência.
-- 3. O botão APAGAR TUDO não apagava as autorizações de acesso — consentimento
--    herdado por quem reaproveitasse o CPF.
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- ── 1. profiles_atualizar: régua de escrita, e o médico não recebe a linha ───
--
-- O QUE ERA
-- O portão era `perfil_pode_ver`, que é "é paciente dono do CPF OU é médico" —
-- sem amarrar o médico àquele paciente. E o retorno trazia `to_jsonb(p.*)`:
-- nome, celular, e-mail, endereço inteiro, contato de emergência, status
-- bariátrico e gestacional. Como `register_medico` é auto-serviço e aceita
-- qualquer CRM (a conferência do projeto é a SELFIE, feita depois), bastava
-- registrar um CRM inventado para ler — e sobrescrever — o cadastro de
-- qualquer CPF. E, por não passar por `pode_ler_paciente`, o acesso NÃO
-- aparecia em "Quem vê os meus dados".
-- É a mesma régua que 13/09 aplicou nas funções de LEITURA; esta ficou de fora
-- por ser de escrita — e ninguém reparou que ela também devolve a linha.
--
-- O QUE FICA
--   • paciente dono do CPF: tudo como antes, inclusive o perfil de volta
--     (o CompletarPerfilModal depende disso);
--   • médico: usa `oba_pode_escrever`, a régua que o consentimento já criou.
--     - mexer SÓ nos campos que ele acabou de coletar na triagem (sexo,
--       nascimento, gestação) é ATO PRÓPRIO: permitido, e vai para a trilha;
--     - mexer em qualquer outra coluna é ALTERAR registro alheio: exige
--       autorização do paciente;
--     - em nenhum caso ele recebe o perfil de volta. Quem precisa ler o
--       cadastro usa `profiles_por_cpf`, que já tem régua e trilha.
CREATE OR REPLACE FUNCTION public.profiles_atualizar(p_cpf text, p_patch jsonb, p_pac_token text DEFAULT NULL::text, p_crm text DEFAULT NULL::text, p_med_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_id uuid;
  v_cols text;
  v_n int;
  v_sql text;
  v jsonb;
  v_proprio boolean;
  v_medico  boolean;
  v_alterando boolean;
  -- O que o médico coleta na TRIAGEM e grava no perfil como ato próprio.
  -- Acrescentar coluna aqui amplia o que um médico não autorizado pode
  -- reescrever — pense duas vezes antes de mexer nesta lista.
  c_campos_triagem constant text[] := ARRAY[
    'sexo', 'data_nascimento', 'gestante',
    'semanas_gestacao_triagem', 'data_triagem_gestacao'
  ];
BEGIN
  v_proprio := public.token_paciente_ok(v_cpf, p_pac_token);
  v_medico  := public.token_medico_ok(p_crm, p_med_token);

  IF NOT (v_proprio OR v_medico) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  IF NOT v_proprio THEN
    -- Alterando = o patch toca alguma coluna fora dos campos da triagem.
    SELECT EXISTS (
      SELECT 1 FROM jsonb_object_keys(coalesce(p_patch, '{}'::jsonb)) k
       WHERE k <> ALL (c_campos_triagem)
    ) INTO v_alterando;

    IF NOT public.oba_pode_escrever(v_cpf, p_crm, p_med_token, NULL, 'profiles_update', v_alterando) THEN
      RETURN jsonb_build_object('ok', false, 'erro',
        'Este paciente nao autorizou voce a alterar o cadastro dele.');
    END IF;
  END IF;

  SELECT p.id INTO v_id FROM public.profiles p WHERE p.cpf = v_cpf LIMIT 1;
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Perfil nao encontrado');
  END IF;

  SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
    INTO v_cols, v_n
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = 'profiles'
     -- LISTA NEGRA. `senha_klipbit` é o hash da senha (o nome não é óbvio — não
     -- existe coluna "senha_hash" nesta tabela); sem ela aqui, um patch trocaria
     -- a senha de quem já tem o token. `medico_origem` rege crédito de comissão
     -- e não pode ser reescrito pelo próprio paciente.
     AND c.column_name NOT IN ('id', 'cpf', 'created_at', 'medico_origem',
                               'session_token_hash', 'session_token_exp', 'senha_klipbit')
     AND p_patch ? c.column_name;

  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  IF v_n = 1 THEN
    v_sql := format('UPDATE public.profiles SET %s = (SELECT %s FROM jsonb_populate_record(NULL::public.profiles, $1)) WHERE id = $2', v_cols, v_cols);
  ELSE
    v_sql := format('UPDATE public.profiles SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::public.profiles, $1)) WHERE id = $2', v_cols, v_cols);
  END IF;
  EXECUTE v_sql USING p_patch, v_id;

  -- Só o DONO recebe o perfil de volta (o CompletarPerfilModal usava .select()
  -- no update). Para o médico sai apenas a confirmação: a função é de ESCRITA,
  -- e era o retorno dela que vazava o cadastro.
  IF v_proprio THEN
    SELECT to_jsonb(p.*) - 'senha_klipbit' - 'session_token_hash' - 'session_token_exp' INTO v FROM public.profiles p WHERE p.id = v_id;
    RETURN jsonb_build_object('ok', true, 'id', v_id, 'perfil', v, 'colunas', v_n);
  END IF;

  RETURN jsonb_build_object('ok', true, 'colunas', v_n);
END;
$function$;

-- ── 2. O aviso do plantão deixa de ser público ──────────────────────────────
-- `tg_enviar` e `tg_enviar_para` tiveram o EXECUTE revogado em ago/2026
-- (migrate_tg_wrappers_sec1_ago2026). Esta irmã nasceu depois e ficou aberta:
-- SECURITY DEFINER, texto livre vindo do cliente, postando no Telegram do
-- plantonista. Dava para forjar uma emergência com nome e endereço inventados,
-- ou inundar o canal até ele virar ruído — e o plantão é clínico.
-- Ninguém no front a chama: quem a usa é `oba_avisar_emergencia`, que roda
-- como dona e não precisa do GRANT.
-- ⚠ O `FROM PUBLIC` é obrigatório: sem ele o REVOKE falha em silêncio (lição
-- já registrada no projeto, em tesouraria-baixa-so-caixa).
REVOKE EXECUTE ON FUNCTION public.tg_enviar_plantonista(text) FROM PUBLIC, anon, authenticated;

-- ── 3. APAGAR TUDO passa a apagar o consentimento ───────────────────────────
-- A armadilha está escrita no CLAUDE.md e os SCRIPTS de limpeza foram
-- corrigidos — o BOTÃO do Admin não. A autorização é chaveada por CPF: se ela
-- sobrevive à limpeza e o CPF é reaproveitado por outra pessoa, o novo titular
-- herda um médico que nunca autorizou. Consentimento não se herda.
-- A trilha (`acessos_paciente`) vai junto: ela é o histórico de quem abriu o
-- prontuário DAQUELE titular; mantê-la atribuiria ao novo titular acessos que
-- aconteceram na vida de outra pessoa.
CREATE OR REPLACE FUNCTION public.admin_limpar_paciente(p_crm text, p_token text, p_cpf text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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

  DELETE FROM public.abatimentos_paciente   WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('abatimentos_paciente', n);
  DELETE FROM public.creditos_avaliacao     WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('creditos_avaliacao', n);
  DELETE FROM public.encaminhamentos_medico WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('encaminhamentos_medico', n);
  DELETE FROM public.extratos_oba           WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('extratos_oba', n);
  DELETE FROM public.opiniao_medica         WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('opiniao_medica', n);
  DELETE FROM public.prescricoes            WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('prescricoes', n);

  -- (22/09/2026) O CONSENTIMENTO e a TRILHA. Sem estas duas linhas, limpar um
  -- CPF e reaproveitá-lo ressuscita a autorização do titular anterior.
  DELETE FROM public.autorizacoes_acesso    WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('autorizacoes_acesso', n);
  DELETE FROM public.acessos_paciente       WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('acessos_paciente', n);

  DELETE FROM public.creditos_indicador     WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf OR (v_cod IS NOT NULL AND indicador_codigo = v_cod); GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('creditos_indicador', n);
  DELETE FROM public.indicacoes_precadastro WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf OR (v_cod IS NOT NULL AND indicador_codigo = v_cod); GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('indicacoes_precadastro', n);

  DELETE FROM public.oba_anamnese      WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('oba_anamnese', n);
  DELETE FROM public.avaliacoes        WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('avaliacoes', n);
  DELETE FROM public.triagens          WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('triagens', n);
  DELETE FROM public.pedidos_documento WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('pedidos_documento', n);

  IF v_uid IS NOT NULL THEN
    DELETE FROM public.assinaturas WHERE user_id = v_uid; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('assinaturas', n);
  END IF;

  DELETE FROM public.indicadores WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('indicadores', n);
  DELETE FROM public.profiles    WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('profiles', n);

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
$function$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Conferência (rodar depois) ──────────────────────────────────────────────
-- Esperado: regua_escrita=true, sem_regua_frouxa=true, plantao_anon=false,
--           limpeza_apaga_autorizacao=true
-- SELECT
--   (SELECT prosrc ~ 'oba_pode_escrever'  FROM pg_proc WHERE proname='profiles_atualizar')   AS regua_escrita,
--   (SELECT prosrc !~ 'perfil_pode_ver'   FROM pg_proc WHERE proname='profiles_atualizar')   AS sem_regua_frouxa,
--   has_function_privilege('anon','public.tg_enviar_plantonista(text)','EXECUTE')            AS plantao_anon,
--   (SELECT prosrc ~ 'autorizacoes_acesso' FROM pg_proc WHERE proname='admin_limpar_paciente') AS limpeza_apaga_autorizacao;
