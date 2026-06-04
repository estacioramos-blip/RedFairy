-- ============================================================
-- migrate_extratos_oba.sql  (DEC-015 — entrega do extrato da anamnese OBA)
--
-- Quando o paciente preenche a anamnese OBA (insert em oba_anamnese), se algum
-- médico optou por receber o extrato (avaliacoes.quer_extrato_oba=true para
-- aquele CPF), registra um EXTRATO PENDENTE (tabela extratos_oba) e avisa o ADM
-- no Telegram (tg_enviar — best-effort, não bloqueia o salvamento).
--
-- O ADM vê/entrega/dá baixa no painel (aba "Extratos OBA"). Entrega direta no
-- Telegram do médico = fase futura (precisa capturar o chat_id do médico).
--
-- Idempotente: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE / DROP TRIGGER IF
-- EXISTS / ON CONFLICT DO NOTHING. Termina com NOTIFY pgrst.
-- ============================================================

-- 1) Tabela de extratos pendentes ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.extratos_oba (
  id               BIGSERIAL PRIMARY KEY,
  cpf_paciente     TEXT NOT NULL,
  medico_crm       TEXT NOT NULL,
  oba_anamnese_id  UUID,
  entregue         BOOLEAN DEFAULT false,
  data_entrega     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (oba_anamnese_id, medico_crm)
);
ALTER TABLE public.extratos_oba ENABLE ROW LEVEL SECURITY;  -- só funções SECURITY DEFINER

-- 2) Trigger: ao preencher a anamnese, registra pendências + avisa o ADM --------
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
  r      record;
BEGIN
  v_cpf := regexp_replace(coalesce(NEW.cpf,''), '\D', '', 'g');
  IF v_cpf = '' THEN RETURN NEW; END IF;

  -- Cada médico que pediu o extrato deste paciente vira uma pendência.
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
  END LOOP;

  -- Aviso ao ADM (best-effort: se tg_enviar/pg_net não existir, ignora).
  IF v_n > 0 THEN
    SELECT nome INTO v_nome FROM public.profiles
     WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf LIMIT 1;
    BEGIN
      PERFORM public.tg_enviar(
        '📋 Extrato OBA solicitado!' || E'\n' ||
        'Paciente ' || COALESCE(NULLIF(v_nome,''), v_cpf) || ' preencheu a anamnese.' || E'\n' ||
        v_n || ' médico(s) pediram o extrato. Veja no admin → Extratos OBA.'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;  -- não bloqueia o salvamento da anamnese
    END;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_extrato_oba ON public.oba_anamnese;
CREATE TRIGGER trg_extrato_oba
  AFTER INSERT ON public.oba_anamnese
  FOR EACH ROW EXECUTE FUNCTION public.fn_extrato_oba();

-- 3) RPC: lista os extratos (pendentes + entregues) p/ o painel -----------------
CREATE OR REPLACE FUNCTION public.admin_extratos_oba(p_crm text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  resultado jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'extratos', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',            e.id,
      'entregue',      e.entregue,
      'created_at',    e.created_at,
      'data_entrega',  e.data_entrega,
      'cpf',           e.cpf_paciente,
      'paciente_nome', (SELECT nome FROM public.profiles
                          WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = e.cpf_paciente LIMIT 1),
      'medico',        (SELECT jsonb_build_object('nome', m.nome, 'crm', m.crm, 'celular', m.celular,
                                                  'email', m.email, 'usa_telegram', m.usa_telegram)
                          FROM public.medicos m WHERE m.crm = e.medico_crm),
      'anamnese',      (SELECT jsonb_build_object(
                            'tipo_cirurgia', o.tipo_cirurgia, 'meses_pos_cirurgia', o.meses_pos_cirurgia,
                            'peso_antes', o.peso_antes, 'peso_atual', o.peso_atual, 'kg_perdidos', o.kg_perdidos,
                            'status_glicemico', o.status_glicemico, 'status_pressorico', o.status_pressorico,
                            'status_osseo', o.status_osseo, 'status_dental', o.status_dental,
                            'status_intestinal', o.status_intestinal, 'status_neurologico', o.status_neurologico,
                            'ferritina_oba', o.ferritina_oba, 'vitamina_b12', o.vitamina_b12, 'vitamina_d', o.vitamina_d,
                            'glicemia', o.glicemia, 'hb_glicada', o.hb_glicada, 'tsh', o.tsh)
                          FROM public.oba_anamnese o WHERE o.id = e.oba_anamnese_id)
    ) ORDER BY e.entregue ASC, e.created_at DESC) FROM public.extratos_oba e), '[]'::jsonb)
  ) INTO resultado;

  RETURN resultado;
END;
$function$;

-- 4) RPC: marca um extrato como entregue ---------------------------------------
CREATE OR REPLACE FUNCTION public.admin_marcar_extrato_entregue(p_crm text, p_token text, p_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  UPDATE public.extratos_oba SET entregue = true, data_entrega = now() WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_extratos_oba(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marcar_extrato_entregue(text, text, bigint) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
