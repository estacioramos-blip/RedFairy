-- ============================================================================
-- migrate_tg_wrappers_sec1_ago2026.sql
-- Auditoria final pré-lançamento — SEC-1: fecha o buraco do tg_enviar aberto ao
-- anon (qualquer um com a anon key podia postar mensagem ARBITRÁRIA no Telegram
-- do ADM, inclusive forjar "nova comissão, pague US$ X pra PIX <do atacante>").
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR. ⚠ RODAR **DEPOIS** DE O FRONTEND QUE
-- USA OS WRAPPERS ESTAR NO AR (senão o frontend antigo chama tg_enviar direto e,
-- após o REVOKE, o botão de EMERGÊNCIA para de avisar o ADM em silêncio).
--
-- POR QUE WRAPPERS (e não um REVOKE cego): tg_enviar é chamado DIRETO do navegador
-- em 3 pontos legítimos — botão de EMERGÊNCIA (PatientDashboard) e 2 avisos do
-- OBAModal (pesquisa, dúvida). Revogar sem substituto quebraria a emergência.
-- Cada wrapper: (1) valida o token do chamador (paciente OU médico); (2) CONSTRÓI
-- a mensagem no SERVIDOR a partir de dados confiáveis (o cliente não injeta texto,
-- então não dá pra forjar um alerta de comissão); (3) chama tg_enviar internamente.
-- Sendo SECURITY DEFINER, os wrappers continuam podendo chamar tg_enviar após o
-- REVOKE (rodam como owner).
-- ============================================================================

BEGIN;

-- ── Wrapper 1: EMERGÊNCIA (paciente) — avisa ADM + plantonista ──────────────
CREATE OR REPLACE FUNCTION public.oba_avisar_emergencia(p_cpf text, p_pac_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_nome text; v_celular text; v_cep text;
  v_logr text; v_num text; v_compl text; v_bairro text; v_cidade text; v_uf text;
  v_ce_nome text; v_ce_par text; v_ce_cel text;
  v_end text; v_contato text; v_cpf_fmt text; v_msg text;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  SELECT NULLIF(btrim(nome),''), NULLIF(btrim(celular),''), NULLIF(btrim(cep),''),
         NULLIF(btrim(logradouro),''), NULLIF(btrim(numero::text),''), NULLIF(btrim(complemento),''),
         NULLIF(btrim(bairro),''), NULLIF(btrim(cidade),''), NULLIF(btrim(uf),''),
         NULLIF(btrim(contato_emergencia_nome),''), NULLIF(btrim(contato_emergencia_parentesco),''),
         NULLIF(btrim(contato_emergencia_celular),'')
    INTO v_nome, v_celular, v_cep, v_logr, v_num, v_compl, v_bairro, v_cidade, v_uf,
         v_ce_nome, v_ce_par, v_ce_cel
    FROM public.profiles
   WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf LIMIT 1;

  v_end := concat_ws(', ', v_logr, v_num, v_compl, v_bairro, v_cidade, v_uf);
  v_contato := concat_ws(' ', v_ce_nome,
                 CASE WHEN v_ce_par IS NOT NULL THEN '(' || v_ce_par || ')' END, v_ce_cel);
  v_cpf_fmt := CASE WHEN length(v_cpf) = 11
                 THEN substr(v_cpf,1,3)||'.'||substr(v_cpf,4,3)||'.'||substr(v_cpf,7,3)||'-'||substr(v_cpf,10,2)
                 ELSE v_cpf END;

  v_msg := '🚨 EMERGÊNCIA ACIONADA — Projeto OBA' || E'\n' ||
    'Paciente: ' || COALESCE(v_nome, '—') || E'\n' ||
    'CPF: ' || v_cpf_fmt || E'\n' ||
    'Celular: ' || COALESCE(v_celular, '—') || E'\n' ||
    'Endereço: ' || COALESCE(NULLIF(v_end, ''), '(não informado)') ||
      CASE WHEN v_cep IS NOT NULL THEN ' — CEP ' || v_cep ELSE '' END || E'\n' ||
    'Contato de emergência: ' || COALESCE(NULLIF(v_contato, ''), '(não informado)') || E'\n' ||
    'Data|Hora: ' || to_char(now() AT TIME ZONE 'America/Bahia', 'DD/MM/YYYY HH24:MI:SS');

  PERFORM public.tg_enviar(v_msg);
  PERFORM public.tg_enviar_plantonista(v_msg);
  RETURN jsonb_build_object('ok', true);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.oba_avisar_emergencia(text, text) TO anon, authenticated;

-- ── Wrapper 2: PESQUISA obstipação/fibromialgia (paciente OU médico) ────────
CREATE OR REPLACE FUNCTION public.oba_avisar_pesquisa(p_cpf text, p_crm text DEFAULT NULL, p_med_token text DEFAULT NULL, p_pac_token text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_nome text; v_celular text; v_msg text;
BEGIN
  IF NOT (public.token_paciente_ok(v_cpf, p_pac_token) OR public.token_medico_ok(p_crm, p_med_token)) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  SELECT NULLIF(btrim(nome),''), NULLIF(btrim(celular),'')
    INTO v_nome, v_celular
    FROM public.profiles WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf LIMIT 1;

  v_msg := '🔬 Paciente para a PESQUISA (obstipação/fibromialgia):' || E'\n' ||
    'Nome: ' || COALESCE(v_nome, '—') || E'\n' ||
    'Telefone: ' || COALESCE(v_celular, '(não informado)') || E'\n' ||
    'E-mail: (não informado)' || E'\n' ||
    'Data|Hora: ' || to_char(now() AT TIME ZONE 'America/Bahia', 'DD/MM/YYYY HH24:MI:SS');

  PERFORM public.tg_enviar(v_msg);
  RETURN jsonb_build_object('ok', true);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.oba_avisar_pesquisa(text, text, text, text) TO anon, authenticated;

-- ── Wrapper 3: DÚVIDA (revisão médica recomendada) (paciente OU médico) ─────
-- p_secoes = rótulos das seções em que o paciente marcou "não tenho certeza".
-- É texto do cliente, mas entra SOB um cabeçalho fixo "Revisão médica
-- recomendada" — não dá pra forjar um alerta de comissão a partir daqui; e o
-- gate já exige sessão. O nome vem do SERVIDOR (não do cliente).
CREATE OR REPLACE FUNCTION public.oba_avisar_duvida(p_cpf text, p_secoes text, p_crm text DEFAULT NULL, p_med_token text DEFAULT NULL, p_pac_token text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_nome text; v_msg text;
BEGIN
  IF NOT (public.token_paciente_ok(v_cpf, p_pac_token) OR public.token_medico_ok(p_crm, p_med_token)) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  SELECT NULLIF(btrim(nome),'') INTO v_nome
    FROM public.profiles WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf LIMIT 1;

  v_msg := '🔎 Revisão médica recomendada — Projeto OBA' || E'\n' ||
    'Paciente: ' || COALESCE(v_nome, v_cpf) || E'\n' ||
    'CPF: ' || v_cpf || E'\n' ||
    'Marcou dúvida em: ' || COALESCE(NULLIF(btrim(p_secoes),''), '(não especificado)');

  PERFORM public.tg_enviar(v_msg);
  RETURN jsonb_build_object('ok', true);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.oba_avisar_duvida(text, text, text, text, text) TO anon, authenticated;

-- ── SEC-1: fecha o tg_enviar para o mundo. Os wrappers acima (SECURITY DEFINER,
-- rodam como owner) e as funções internas (fn_credita_medico, medico_avaliar_
-- paciente) continuam podendo chamá-lo. ⚠ FROM PUBLIC obrigatório (lição do
-- projeto: sem ele o revoke falha em silêncio).
REVOKE EXECUTE ON FUNCTION public.tg_enviar(text) FROM PUBLIC, anon, authenticated;

-- ── SEC-1b (vizinho da mesma família, achado na revisão): tg_enviar_para deixa o
-- CHAMADOR escolher chat_id E texto → pior que o tg_enviar (spam/phishing do bot
-- pra qualquer chat). NÃO é chamada pelo frontend (grep em src/ = 0); só o
-- fn_extrato_oba a usa internamente, e ele é SECURITY DEFINER (roda como owner),
-- então segue funcionando após o REVOKE.
REVOKE EXECUTE ON FUNCTION public.tg_enviar_para(text, text) FROM PUBLIC, anon, authenticated;

COMMIT;

-- ── Verificação (rode e confira) ───────────────────────────────────────────
-- SELECT has_function_privilege('anon', 'public.tg_enviar(text)', 'EXECUTE');  -- esperado: false
-- SELECT has_function_privilege('anon', 'public.oba_avisar_emergencia(text,text)', 'EXECUTE'); -- true
