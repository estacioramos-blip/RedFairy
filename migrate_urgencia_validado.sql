-- ============================================================================
-- migrate_urgencia_validado.sql — urgência só para médico validado por selfie
-- ============================================================================
--
-- POR QUE
-- A válvula de urgência ganhou botão (Etapa 1, passo que faltava). Até aqui ela
-- só existia por dentro do banco, e por isso o buraco abaixo não aparecia:
-- `register_medico` aceita QUALQUER texto como CRM — não há conferência de CRM
-- no cadastro; a conferência é a SELFIE, feita depois, pela administração.
-- Com botão na tela e sem esta trava, um cadastro falso declararia "urgência"
-- e teria 12 horas no prontuário de qualquer CPF. O Telegram avisaria, mas
-- depois do fato: a válvula viraria a porta mais larga do sistema.
--
-- O QUE MUDA
-- Só `medicos.validado = true` declara urgência. Pendente (NULL) e invalidado
-- (false) recebem uma recusa que diz o que fazer — e não revelam nada sobre o
-- paciente. O resto da função continua igual: justificativa de 15 caracteres,
-- 12 horas, Telegram à ADM e o acesso visível ao paciente com o motivo escrito.
--
-- Idempotente.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.autorizacao_urgencia(p_crm text, p_token text, p_cpf text, p_justificativa text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_just text := btrim(coalesce(p_justificativa,''));
  v_exp  timestamptz := now() + interval '12 hours';
  v_val  boolean;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- A conferência do CRM neste projeto é a SELFIE com a carteira, validada
  -- pela administração. Sem ela, qualquer cadastro abriria prontuário alheio
  -- por 12 horas só escrevendo um motivo.
  SELECT validado INTO v_val FROM public.medicos
   WHERE crm = upper(btrim(coalesce(p_crm,'')));
  IF v_val IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'O acesso de urgencia exige cadastro conferido. Envie ao WhatsApp da administracao uma selfie do seu rosto com a carteira profissional ao lado.');
  END IF;

  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF length(v_just) < 15 THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Descreva a urgencia (minimo 15 caracteres). O paciente vera esta justificativa.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE cpf = v_cpf) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Paciente nao encontrado');
  END IF;

  INSERT INTO public.autorizacoes_acesso
    (cpf_paciente, medico_crm, nivel, expira_em, justificativa)
  VALUES (v_cpf, upper(btrim(p_crm)), 'urgencia', v_exp, v_just);

  -- A ADM fica sabendo na hora. Acesso de urgência é excepcional por
  -- definição; se virar rotina, é sinal de que algo no fluxo está errado.
  PERFORM public.tg_enviar(
    '🚨 ACESSO DE URGÊNCIA ao prontuário' || E'\n' ||
    'Médico: ' || upper(btrim(p_crm)) || E'\n' ||
    'Paciente: ***.' || substr(v_cpf,4,3) || '.' || substr(v_cpf,7,3) || '-**' || E'\n' ||
    'Motivo: ' || v_just || E'\n' ||
    'Válido por 12h. O paciente vê este acesso.');

  RETURN jsonb_build_object('ok', true, 'expira_em', v_exp);
END;
$function$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Conferência (rodar depois; esperado: true) ──────────────────────────────
-- SELECT prosrc ~ 'validado' AS exige_selfie
--   FROM pg_proc WHERE proname = 'autorizacao_urgencia';
