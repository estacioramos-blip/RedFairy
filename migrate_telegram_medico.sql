-- ============================================================
-- migrate_telegram_medico.sql  (DEC-015 — entrega direta do extrato OBA ao médico)
--
-- Quando o paciente preenche a anamnese OBA, além de registrar a pendência e
-- avisar o ADM, se o médico que pediu o extrato tiver o Telegram conectado
-- (medicos.telegram_chat_id), o extrato vai DIRETO pro Telegram dele.
--
-- ⚠️ Inerte até: (a) o bot existir (config telegram_bot_token) e (b) o médico
-- ter iniciado o bot e informado o chat_id. Tudo best-effort (não bloqueia nada).
--
-- Idempotente: ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE. NOTIFY pgrst no fim.
-- ============================================================

-- 1) Chat ID do Telegram do médico ---------------------------------------------
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 1b) Corrige o tipo de extratos_oba.oba_anamnese_id: oba_anamnese.id é UUID
--     (estava BIGINT por engano). Condicional p/ ser seguro ao re-rodar.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='extratos_oba'
       AND column_name='oba_anamnese_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.extratos_oba ALTER COLUMN oba_anamnese_id TYPE uuid USING NULL;
  END IF;
END $$;

-- 2) Envio a um chat_id específico (reusa o token do bot da config) -------------
CREATE OR REPLACE FUNCTION public.tg_enviar_para(p_chat_id text, p_msg text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_token text;
BEGIN
  IF p_chat_id IS NULL OR btrim(p_chat_id) = '' THEN RETURN; END IF;
  v_token := (SELECT valor FROM public.config WHERE chave = 'telegram_bot_token');
  IF v_token IS NULL OR btrim(v_token) = '' THEN RETURN; END IF;
  PERFORM net.http_post(
    url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body    := jsonb_build_object('chat_id', p_chat_id, 'text', p_msg),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
END;
$function$;

-- 3) Formata o extrato da anamnese (resumo) ------------------------------------
CREATE OR REPLACE FUNCTION public.formatar_extrato_oba(p_oba_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  -- ::text em tudo: vários campos da anamnese são jsonb (arrays), e sem o cast
  -- o operador || tenta concatenar como JSON e quebra.
  SELECT
    'EXTRATO ANAMNESE OBA' || E'\n' ||
    'Cirurgia: ' || COALESCE(o.tipo_cirurgia::text, '—') || COALESCE(' · ' || o.meses_pos_cirurgia::text || ' meses pós-op', '') || E'\n' ||
    COALESCE('Peso antes: '  || o.peso_antes::text  || ' kg' || E'\n', '') ||
    COALESCE('Peso atual: '  || o.peso_atual::text  || ' kg' || E'\n', '') ||
    COALESCE('Kg perdidos: ' || o.kg_perdidos::text || ' kg' || E'\n', '') ||
    E'\nSTATUS:' || E'\n' ||
    COALESCE('  Glicêmico: '   || o.status_glicemico::text   || E'\n', '') ||
    COALESCE('  Pressórico: '  || o.status_pressorico::text  || E'\n', '') ||
    COALESCE('  Ósseo: '       || o.status_osseo::text       || E'\n', '') ||
    COALESCE('  Dental: '      || o.status_dental::text      || E'\n', '') ||
    COALESCE('  Intestinal: '  || o.status_intestinal::text  || E'\n', '') ||
    COALESCE('  Neurológico: ' || o.status_neurologico::text || E'\n', '') ||
    E'\nLABS:' || E'\n' ||
    COALESCE('  B12: '       || o.vitamina_b12::text || E'\n', '') ||
    COALESCE('  Vit D: '     || o.vitamina_d::text   || E'\n', '') ||
    COALESCE('  Ferritina: ' || o.ferritina_oba::text || E'\n', '') ||
    COALESCE('  Glicemia: '  || o.glicemia::text     || E'\n', '') ||
    COALESCE('  HbA1c: '     || o.hb_glicada::text   || E'\n', '') ||
    COALESCE('  TSH: '       || o.tsh::text          || E'\n', '')
  FROM public.oba_anamnese o WHERE o.id = p_oba_id;
$function$;

-- 4) Trigger: além do painel + aviso ADM, manda o extrato DIRETO ao médico ------
CREATE OR REPLACE FUNCTION public.fn_extrato_oba()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  text;
  v_nome text;
  v_n    int := 0;
  v_chat text;
  r      record;
BEGIN
  v_cpf := regexp_replace(coalesce(NEW.cpf,''), '\D', '', 'g');
  IF v_cpf = '' THEN RETURN NEW; END IF;

  SELECT nome INTO v_nome FROM public.profiles
   WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf LIMIT 1;

  FOR r IN
    SELECT DISTINCT medico_crm
      FROM public.avaliacoes
     WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf
       AND quer_extrato_oba IS TRUE
       AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
  LOOP
    INSERT INTO public.extratos_oba (cpf_paciente, medico_crm, oba_anamnese_id)
    VALUES (v_cpf, r.medico_crm, NEW.id)
    ON CONFLICT (oba_anamnese_id, medico_crm) DO NOTHING;
    v_n := v_n + 1;

    -- Envio direto ao médico, se ele tiver o Telegram conectado (best-effort).
    BEGIN
      SELECT telegram_chat_id INTO v_chat FROM public.medicos WHERE crm = r.medico_crm;
      IF v_chat IS NOT NULL AND btrim(v_chat) <> '' THEN
        PERFORM public.tg_enviar_para(
          v_chat,
          '📋 Extrato OBA — paciente ' || COALESCE(NULLIF(v_nome,''), v_cpf) || E'\n\n' ||
          public.formatar_extrato_oba(NEW.id)
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;

  -- Aviso ao ADM (best-effort).
  IF v_n > 0 THEN
    BEGIN
      PERFORM public.tg_enviar(
        '📋 Extrato OBA solicitado!' || E'\n' ||
        'Paciente ' || COALESCE(NULLIF(v_nome,''), v_cpf) || ' preencheu a anamnese.' || E'\n' ||
        v_n || ' médico(s) pediram o extrato. Veja no admin → Extratos OBA.'
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.tg_enviar_para(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.formatar_extrato_oba(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
