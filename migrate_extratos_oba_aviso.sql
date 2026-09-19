-- ============================================================================
-- migrate_extratos_oba_aviso.sql — o extrato OBA vira AVISO, sem dado clínico
-- ============================================================================
--
-- ⚠ RODAR DEPOIS de migrate_operadores.sql (usa token_gestao_ok).
--
-- POR QUE
-- Ao avaliar um bariátrico, o médico pode marcar "quero receber o extrato da
-- anamnese quando o paciente preencher". O extrato levava cirurgia, peso,
-- situação glicêmica/pressórica/óssea/dental/intestinal/neurológica, ferritina,
-- B12, vitamina D, glicemia, HbA1c e TSH, com NOME e CPF, por TRÊS portas —
-- e nenhuma conferia se o paciente autorizou aquele médico:
--   1. Telegram DIRETO ao médico, disparado sozinho pelo gatilho da anamnese;
--   2. aba Admin → Extratos OBA, onde o operador lia o conteúdo para copiar;
--   3. formatar_extrato_oba(uuid): SECURITY DEFINER liberada para `anon`, sem
--      portão nenhum — quem tivesse o id de uma anamnese lia o extrato.
-- É a mesma porta que a Etapa 1 do consentimento fechou (13/09/2026), pela
-- terceira vez no projeto.
--
-- O QUE FAZ
-- O extrato deixa de CARREGAR o prontuário e passa a AVISAR que ele existe:
--   "Maria (CPF ***.456.789-**), que o(a) Sr(a). avaliou em 12/09, preencheu
--    a anamnese OBA" + o caminho para ver no aplicativo.
-- O conteúdo passa a ser lido onde deve: no aplicativo, pela régua
-- (pode_ler_paciente), com trilha que o paciente vê.
-- A identificação pode ficar: o médico já tem esse CPF — avaliou o paciente e
-- pediu o aviso. O aviso não conta a ele nada que ele não saiba.
--   • com autorização → "abra em AVALIAR com o CPF";
--   • sem autorização → "peça autorização: menu → PEDIR AUTORIZAÇÃO".
--
-- Idempotente.
-- ============================================================================

BEGIN;

-- Primeiro nome + CPF mascarado: identifica sem expor mais que o necessário.
CREATE OR REPLACE FUNCTION public.fn_extrato_oba()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf   text;
  v_nome  text;
  v_cpfm  text;
  v_n     int := 0;
  v_chat  text;
  v_quando text;
  v_msg   text;
  r       record;
BEGIN
  v_cpf := regexp_replace(coalesce(NEW.cpf,''), '\D', '', 'g');
  IF v_cpf = '' THEN RETURN NEW; END IF;

  SELECT split_part(btrim(coalesce(nome,'')), ' ', 1) INTO v_nome FROM public.profiles
   WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf LIMIT 1;
  v_cpfm := CASE WHEN length(v_cpf) = 11
                 THEN '***.' || substr(v_cpf,4,3) || '.' || substr(v_cpf,7,3) || '-**'
                 ELSE '(CPF inválido)' END;

  FOR r IN
    SELECT medico_crm, max(created_at) AS avaliou_em
      FROM public.avaliacoes
     WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf
       AND quer_extrato_oba IS TRUE
       AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
     GROUP BY medico_crm
  LOOP
    INSERT INTO public.extratos_oba (cpf_paciente, medico_crm, oba_anamnese_id)
    VALUES (v_cpf, r.medico_crm, NEW.id)
    ON CONFLICT (oba_anamnese_id, medico_crm) DO NOTHING;
    v_n := v_n + 1;

    -- Aviso direto ao médico, se ele tiver o Telegram conectado (best-effort).
    -- SEM dado clínico: só quem, e o caminho para ver no aplicativo.
    BEGIN
      SELECT telegram_chat_id INTO v_chat FROM public.medicos WHERE crm = r.medico_crm;
      IF v_chat IS NOT NULL AND btrim(v_chat) <> '' THEN
        v_quando := to_char(r.avaliou_em AT TIME ZONE 'America/Bahia', 'DD/MM');
        v_msg := '📋 Projeto OBA® — ' || COALESCE(NULLIF(v_nome,''), 'Paciente') ||
                 ' (CPF ' || v_cpfm || '), que o(a) Sr(a). avaliou em ' || v_quando ||
                 ', preencheu a anamnese OBA.' || E'\n\n' ||
                 CASE WHEN public.medico_tem_autorizacao(v_cpf, r.medico_crm)
                   THEN 'Abra no aplicativo: menu → AVALIAR, com o CPF do paciente.'
                   ELSE 'Para ver, o paciente precisa autorizar o(a) Sr(a).: menu → PEDIR AUTORIZAÇÃO, e envie o link a ele.'
                 END;
        PERFORM public.tg_enviar_para(v_chat, v_msg);
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;

  -- Aviso à ADM (best-effort). Também sem dado clínico, e com CPF mascarado.
  IF v_n > 0 THEN
    BEGIN
      PERFORM public.tg_enviar(
        '📋 Aviso de anamnese a entregar' || E'\n' ||
        COALESCE(NULLIF(v_nome,''), 'Paciente') || ' (CPF ' || v_cpfm || ') preencheu a anamnese.' || E'\n' ||
        v_n || ' médico(s) pediram o aviso. Veja no admin → Extratos OBA.'
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  RETURN NEW;
END;
$function$;

-- A lista do painel: o operador vê QUEM avisar e SE o médico está autorizado.
-- Nenhum campo da anamnese sai daqui.
CREATE OR REPLACE FUNCTION public.admin_extratos_oba(p_crm text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.token_gestao_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  RETURN jsonb_build_object('ok', true, 'extratos', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id',            e.id,
      'entregue',      e.entregue,
      'created_at',    e.created_at,
      'data_entrega',  e.data_entrega,
      'paciente_nome', (SELECT split_part(btrim(coalesce(p.nome,'')), ' ', 1) FROM public.profiles p
                         WHERE regexp_replace(coalesce(p.cpf,''),'\D','','g') = e.cpf_paciente LIMIT 1),
      'cpf_mascarado', CASE WHEN length(e.cpf_paciente) = 11
                            THEN '***.' || substr(e.cpf_paciente,4,3) || '.' || substr(e.cpf_paciente,7,3) || '-**'
                            ELSE '(CPF inválido)' END,
      'avaliado_em',   (SELECT max(a.created_at) FROM public.avaliacoes a
                         WHERE regexp_replace(coalesce(a.cpf,''),'\D','','g') = e.cpf_paciente
                           AND upper(btrim(coalesce(a.medico_crm,''))) = upper(btrim(e.medico_crm))
                           AND a.quer_extrato_oba IS TRUE),
      -- Só um SIM/NÃO: o operador precisa saber qual texto mandar, não o
      -- conteúdo da autorização. Calculado agora, não no dia do pedido — se o
      -- paciente autorizou (ou retirou) depois, o texto acompanha.
      'autorizado',    public.medico_tem_autorizacao(e.cpf_paciente, e.medico_crm),
      'medico',        (SELECT jsonb_build_object('nome', m.nome, 'crm', m.crm, 'celular', m.celular,
                                                  'email', m.email, 'usa_telegram', m.usa_telegram)
                          FROM public.medicos m WHERE m.crm = e.medico_crm)
    ) ORDER BY e.entregue ASC, e.created_at DESC)
    FROM public.extratos_oba e), '[]'::jsonb));
END;
$function$;

-- A porta 3: sem chamador (só o gatilho antigo a usava) e aberta ao `anon`.
DROP FUNCTION IF EXISTS public.formatar_extrato_oba(uuid);

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Conferência (rodar depois) ──────────────────────────────────────────────
-- 1) Não pode sobrar nenhuma: deve devolver 0 linhas.
--    SELECT proname FROM pg_proc WHERE proname = 'formatar_extrato_oba';
-- 2) O gatilho não pode mais citar campo clínico: deve devolver false.
--    SELECT prosrc ~ '(peso|glicem|ferritina|b12|tsh|formatar_extrato)'
--      FROM pg_proc WHERE proname = 'fn_extrato_oba';
