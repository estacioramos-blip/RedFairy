-- ============================================================
-- migrate_rls_fase2_oba_anamnese_rpcs.sql (RLS Fase 2, tabela 2/4: oba_anamnese)
--
-- `oba_anamnese` é o dado MAIS SENSÍVEL do sistema (anamnese completa do
-- bariátrico + todos os exames + relatório clínico). Hoje está legível por
-- qualquer um com a chave anon, que é pública (vive no JS do site).
--
-- Substitui os 11 acessos diretos por RPCs SECURITY DEFINER gateadas por token.
-- Reusa as funções-crachá já existentes (migrate_token_sessao.sql):
--   token_medico_ok(crm, token) / token_paciente_ok(cpf, token) / token_admin_ok
--
-- RODAR ESTA MIGRATION PRIMEIRO. A de ENABLE só depois que o código estiver
-- convertido e testado (regra de ouro: RPC → código → testar → só então RLS).
--
-- DUAS DECISÕES DE DESENHO:
--  (1) As gravações resolvem "qual é a última linha do CPF" DENTRO da RPC. No
--      código antigo isso eram dois passos (SELECT id → UPDATE), o que além de
--      exigir leitura da tabela abria uma corrida: entre um e outro, outra aba
--      podia inserir uma linha nova e o UPDATE cairia na errada.
--  (2) Anamnese e exames têm dezenas de colunas geradas por lista (obaExamesRef).
--      Em vez de congelar essa lista no SQL, as RPCs recebem jsonb e montam a
--      instrução a partir das colunas REAIS da tabela (whitelist vinda do
--      catálogo do Postgres + quote_ident). Coluna que não existe é ignorada em
--      silêncio, em vez de derrubar o INSERT/UPDATE inteiro.
-- ============================================================

-- ── Helper interno: autoriza médico (qualquer CPF) OU o próprio paciente ──
CREATE OR REPLACE FUNCTION public.oba_pode_ver(
  p_cpf text, p_crm text, p_med_token text, p_pac_token text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT public.token_medico_ok(p_crm, p_med_token)
      OR public.token_paciente_ok(regexp_replace(coalesce(p_cpf,''), '\D', '', 'g'), p_pac_token);
$function$;

GRANT EXECUTE ON FUNCTION public.oba_pode_ver(text, text, text, text) TO anon, authenticated;


-- ── 1) Todas as linhas do CPF (ordem cronológica: [0]=baseline, [n]=última) ──
-- Cobre Calculator (histórico p/ avaliar) e PatientDashboard (baseline/anterior/ciclo).
CREATE OR REPLACE FUNCTION public.oba_anamnese_por_cpf(
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
  v_linhas jsonb;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT public.oba_pode_ver(v_cpf, p_crm, p_med_token, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(o.*) ORDER BY o.created_at ASC), '[]'::jsonb)
    INTO v_linhas
    FROM public.oba_anamnese o
   WHERE regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g') = v_cpf;

  RETURN jsonb_build_object('ok', true, 'linhas', v_linhas);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.oba_anamnese_por_cpf(text, text, text, text) TO anon, authenticated;


-- ── 2) Só o relatório/estado da ÚLTIMA linha (o que o ResultCard consome) ──
CREATE OR REPLACE FUNCTION public.oba_anamnese_relatorio_atual(
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
  v_rel jsonb;
  v_est text;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT public.oba_pode_ver(v_cpf, p_crm, p_med_token, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT o.relatorio_oba, o.estado_clinico
    INTO v_rel, v_est
    FROM public.oba_anamnese o
   WHERE regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g') = v_cpf
   ORDER BY o.created_at DESC
   LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'relatorio_oba', v_rel, 'estado_clinico', v_est);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.oba_anamnese_relatorio_atual(text, text, text, text) TO anon, authenticated;


-- ── 3) INSERT da anamnese (colunas dinâmicas via jsonb) ──
CREATE OR REPLACE FUNCTION public.oba_anamnese_inserir(
  p_dados jsonb,
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
  v_cols text;
  v_sql text;
  v_id uuid;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT public.oba_pode_ver(v_cpf, p_crm, p_med_token, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- Só chaves que SÃO colunas reais da tabela. id/created_at ficam com o default.
  SELECT string_agg(quote_ident(c.column_name), ', ')
    INTO v_cols
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name = 'oba_anamnese'
     AND c.column_name NOT IN ('id', 'created_at')
     AND p_dados ? c.column_name;

  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  v_sql := format(
    'INSERT INTO public.oba_anamnese (%s) SELECT %s FROM jsonb_populate_record(NULL::public.oba_anamnese, $1) RETURNING id',
    v_cols, v_cols
  );
  EXECUTE v_sql USING p_dados INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.oba_anamnese_inserir(jsonb, text, text, text) TO anon, authenticated;


-- ── 4) UPDATE genérico na ÚLTIMA linha do CPF (colunas dinâmicas) ──
-- Cobre tanto a gravação do relatório/estado quanto a dos exames — os dois
-- casos eram "acha o id da última linha e dá update" no código antigo.
CREATE OR REPLACE FUNCTION public.oba_anamnese_atualizar_ultima(
  p_cpf text,
  p_patch jsonb,
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

  SELECT o.id INTO v_id
    FROM public.oba_anamnese o
   WHERE regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g') = v_cpf
   ORDER BY o.created_at DESC
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem anamnese para esse CPF');
  END IF;

  -- cpf/id/created_at nunca são alteráveis por patch.
  SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
    INTO v_cols, v_n
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name = 'oba_anamnese'
     AND c.column_name NOT IN ('id', 'cpf', 'created_at')
     AND p_patch ? c.column_name;

  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  -- A forma `SET (a, b) = (SELECT ...)` exige 2+ colunas; com 1 só, usa a forma simples.
  IF v_n = 1 THEN
    v_sql := format(
      'UPDATE public.oba_anamnese SET %s = (SELECT %s FROM jsonb_populate_record(NULL::public.oba_anamnese, $1)) WHERE id = $2',
      v_cols, v_cols
    );
  ELSE
    v_sql := format(
      'UPDATE public.oba_anamnese SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::public.oba_anamnese, $1)) WHERE id = $2',
      v_cols, v_cols
    );
  END IF;
  EXECUTE v_sql USING p_patch, v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'colunas', v_n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.oba_anamnese_atualizar_ultima(text, jsonb, text, text, text) TO anon, authenticated;


-- ── 5) ADMIN: painel H. pylori (última linha por CPF) ──
CREATE OR REPLACE FUNCTION public.admin_oba_hpylori(p_crm text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- DISTINCT ON já entrega a linha MAIS RECENTE de cada CPF; o código antigo
  -- puxava 400 linhas e fazia essa redução no JavaScript.
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v
    FROM (
      SELECT DISTINCT ON (o.cpf)
             o.cpf, o.data_exames, o.created_at, o.relatorio_oba
        FROM public.oba_anamnese o
       ORDER BY o.cpf, o.created_at DESC
    ) t;

  RETURN jsonb_build_object('ok', true, 'linhas', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_oba_hpylori(text, text) TO anon, authenticated;


-- ── 6) ADMIN: ficha OBA completa de um CPF (última linha) ──
CREATE OR REPLACE FUNCTION public.admin_oba_ficha(p_crm text, p_token text, p_cpf text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT to_jsonb(o.*) INTO v
    FROM public.oba_anamnese o
   WHERE regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g') = v_cpf
   ORDER BY o.created_at DESC
   LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'linha', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_oba_ficha(text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
