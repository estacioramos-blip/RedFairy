-- ============================================================
-- migrate_rls_fase2_avaliacoes_rpcs.sql (RLS Fase 2, tabela 3/4: avaliacoes)
--
-- `avaliacoes` guarda o resultado clínico completo de cada paciente
-- (hemoglobina, VCM, RDW, ferritina, saturação, diagnóstico) ligado ao CPF.
-- Hoje é lida por qualquer um com a chave anon, que é pública.
--
-- Substitui os 20 acessos diretos por RPCs SECURITY DEFINER gateadas por token.
-- Mesma regra de ouro: RPC → código → testar → só então o ENABLE do RLS.
--
-- Reusa oba_pode_ver(cpf, crm, med_token, pac_token), criada na migration da
-- oba_anamnese: autoriza o médico (qualquer CPF) OU o próprio paciente.
-- ============================================================

-- ⚠ ACHADO FORA DO ESCOPO DO RLS, mas que apareceu ao converter o código:
-- a coluna `medico_quer_receber` NÃO EXISTIA. O ResultCard tem um checkbox
-- ("Quero receber as avaliações futuras deste paciente") que fazia UPDATE nessa
-- coluna dentro de um try/catch — ou seja, o UPDATE falhava SEMPRE, o erro era
-- engolido, e a tela ainda exibia a confirmação de salvo para o médico.
-- A coluna é criada aqui para que a preferência ao menos passe a ser registrada.
-- ATENÇÃO: nenhum ponto do sistema LÊ esse campo. O WhatsApp prometido no texto
-- do checkbox não é disparado por nada. Decidir com o Estácio: implementar o
-- envio, expor no ADM, ou remover a promessa da tela.
ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS medico_quer_receber boolean NOT NULL DEFAULT false;

-- ── 1) Linhas de um CPF ──
-- p_user_id preserva o filtro exato do PatientDashboard, que lista por user_id
-- (não por CPF). O CPF continua sendo necessário para o PORTÃO de autorização.
-- p_ordem: 'asc' (série do gráfico) ou 'desc' (mais recente primeiro).
CREATE OR REPLACE FUNCTION public.avaliacoes_por_cpf(
  p_cpf text,
  p_crm text DEFAULT NULL,
  p_med_token text DEFAULT NULL,
  p_pac_token text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_ordem text DEFAULT 'desc'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_linhas jsonb;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT public.oba_pode_ver(v_cpf, p_crm, p_med_token, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT COALESCE(
           jsonb_agg(to_jsonb(a.*) ORDER BY
             CASE WHEN lower(coalesce(p_ordem,'desc')) = 'asc' THEN a.data_coleta END ASC,
             CASE WHEN lower(coalesce(p_ordem,'desc')) <> 'asc' THEN a.data_coleta END DESC
           ), '[]'::jsonb)
    INTO v_linhas
    FROM public.avaliacoes a
   WHERE regexp_replace(coalesce(a.cpf, ''), '\D', '', 'g') = v_cpf
     AND (p_user_id IS NULL OR a.user_id = p_user_id);

  RETURN jsonb_build_object('ok', true, 'linhas', v_linhas);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.avaliacoes_por_cpf(text, text, text, text, uuid, text) TO anon, authenticated;


-- ── 2) Gravação (INSERT / UPSERT), colunas dinâmicas via jsonb ──
-- p_modo:  'inserir'   → sempre insere
--          'upsert'    → atualiza a linha existente da mesma chave+data, senão insere
--          'se_ausente'→ insere só se não existir (não sobrescreve)
-- p_chave: 'cpf' ou 'user_id' — combinada com data_coleta para achar a linha.
-- Os 4 pontos de gravação do app usavam combinações diferentes disso; manter o
-- comportamento de cada um evita mudar semântica junto com a segurança.
CREATE OR REPLACE FUNCTION public.avaliacoes_salvar(
  p_dados jsonb,
  p_modo text DEFAULT 'inserir',
  p_chave text DEFAULT NULL,
  p_crm text DEFAULT NULL,
  p_med_token text DEFAULT NULL,
  p_pac_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_dados->>'cpf', ''), '\D', '', 'g');
  v_data text := p_dados->>'data_coleta';
  v_uid uuid;
  v_id uuid;
  v_cols text;
  v_n int;
  v_sql text;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT public.oba_pode_ver(v_cpf, p_crm, p_med_token, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  BEGIN
    v_uid := nullif(p_dados->>'user_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_uid := NULL;
  END;

  -- Procura a linha existente conforme a chave pedida.
  IF p_chave = 'cpf' AND v_data IS NOT NULL THEN
    SELECT a.id INTO v_id FROM public.avaliacoes a
     WHERE regexp_replace(coalesce(a.cpf,''), '\D', '', 'g') = v_cpf
       AND a.data_coleta = v_data::date
     ORDER BY a.created_at DESC LIMIT 1;
  ELSIF p_chave = 'user_id' AND v_data IS NOT NULL AND v_uid IS NOT NULL THEN
    SELECT a.id INTO v_id FROM public.avaliacoes a
     WHERE a.user_id = v_uid AND a.data_coleta = v_data::date
     ORDER BY a.created_at DESC LIMIT 1;
  END IF;

  IF v_id IS NOT NULL AND p_modo = 'se_ausente' THEN
    RETURN jsonb_build_object('ok', true, 'id', v_id, 'acao', 'ignorado');
  END IF;

  IF v_id IS NOT NULL AND p_modo = 'upsert' THEN
    SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
      INTO v_cols, v_n
      FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = 'avaliacoes'
       AND c.column_name NOT IN ('id', 'created_at')
       AND p_dados ? c.column_name;
    IF v_cols IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
    END IF;
    IF v_n = 1 THEN
      v_sql := format('UPDATE public.avaliacoes SET %s = (SELECT %s FROM jsonb_populate_record(NULL::public.avaliacoes, $1)) WHERE id = $2', v_cols, v_cols);
    ELSE
      v_sql := format('UPDATE public.avaliacoes SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::public.avaliacoes, $1)) WHERE id = $2', v_cols, v_cols);
    END IF;
    EXECUTE v_sql USING p_dados, v_id;
    RETURN jsonb_build_object('ok', true, 'id', v_id, 'acao', 'atualizado');
  END IF;

  -- INSERT (modo 'inserir', ou upsert/se_ausente sem linha existente)
  SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
    INTO v_cols, v_n
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = 'avaliacoes'
     AND c.column_name NOT IN ('id', 'created_at')
     AND p_dados ? c.column_name;
  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  v_sql := format(
    'INSERT INTO public.avaliacoes (%s) SELECT %s FROM jsonb_populate_record(NULL::public.avaliacoes, $1) RETURNING id',
    v_cols, v_cols
  );
  EXECUTE v_sql USING p_dados INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'acao', 'inserido');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.avaliacoes_salvar(jsonb, text, text, text, text, text) TO anon, authenticated;


-- ── 3) Médico marca "quero receber" na sua avaliação MAIS RECENTE ──
-- O código antigo fazia UPDATE ... .eq(medico_crm).order().limit(1) via
-- PostgREST — order/limit em PATCH não é confiável, e o efeito real podia ser
-- marcar TODAS as avaliações daquele CRM. Aqui a linha é escolhida no SQL.
CREATE OR REPLACE FUNCTION public.avaliacoes_marcar_quer_receber(
  p_crm text, p_med_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_med_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT a.id INTO v_id FROM public.avaliacoes a
   WHERE a.medico_crm = p_crm
   ORDER BY a.created_at DESC LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem avaliacao para esse CRM');
  END IF;

  UPDATE public.avaliacoes SET medico_quer_receber = true WHERE id = v_id;
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.avaliacoes_marcar_quer_receber(text, text) TO anon, authenticated;


-- ── 4) Contagens ──
CREATE OR REPLACE FUNCTION public.avaliacoes_contagem_medico(
  p_crm text, p_med_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_n int;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_med_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  SELECT count(*) INTO v_n FROM public.avaliacoes a
   WHERE a.medico_crm = p_crm AND a.ferritina IS NOT NULL;
  RETURN jsonb_build_object('ok', true, 'total', v_n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.avaliacoes_contagem_medico(text, text) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.avaliacoes_contagem_cpf(
  p_cpf text,
  p_crm text DEFAULT NULL,
  p_med_token text DEFAULT NULL,
  p_pac_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_n int;
BEGIN
  IF NOT public.oba_pode_ver(v_cpf, p_crm, p_med_token, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  SELECT count(*) INTO v_n FROM public.avaliacoes a
   WHERE regexp_replace(coalesce(a.cpf,''), '\D', '', 'g') = v_cpf;
  RETURN jsonb_build_object('ok', true, 'total', v_n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.avaliacoes_contagem_cpf(text, text, text, text) TO anon, authenticated;


-- ── 5) ADMIN: avaliações recentes ──
CREATE OR REPLACE FUNCTION public.admin_avaliacoes_recentes(
  p_crm text, p_token text, p_limite int DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v
    FROM (
      SELECT * FROM public.avaliacoes
       ORDER BY created_at DESC
       LIMIT greatest(1, least(coalesce(p_limite, 200), 1000))
    ) t;
  RETURN jsonb_build_object('ok', true, 'linhas', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_avaliacoes_recentes(text, text, int) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
