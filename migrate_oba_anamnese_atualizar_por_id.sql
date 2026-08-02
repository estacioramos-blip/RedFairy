-- ============================================================
-- migrate_oba_anamnese_atualizar_por_id.sql
--
-- PROBLEMA: todas as gravações do OBA depois do INSERT inicial (exames,
-- relatório, estado clínico, re-salvamento da anamnese) usavam
-- `oba_anamnese_atualizar_ultima`, que mira "a ÚLTIMA linha daquele CPF".
-- Isso é um alvo MÓVEL: se outra linha do mesmo CPF nascer no meio do
-- caminho — o caso real é o MÉDICO abrir a ficha e revisar a anamnese
-- enquanto o PACIENTE ainda está com o app aberto no celular —, a
-- gravação seguinte do paciente cai na linha do médico (ou vice-versa),
-- misturando dados de dois atendimentos.
--
-- SOLUÇÃO: esta função atualiza uma linha ESPECÍFICA, pelo id que o
-- `oba_anamnese_inserir` já devolve. O app guarda esse id no rascunho e
-- passa a gravar sempre nele. `oba_anamnese_atualizar_ultima` CONTINUA
-- existindo e não muda — é o fallback para rascunhos antigos (salvos
-- antes deste deploy, que não têm o id guardado).
--
-- SEGURANÇA: o id sozinho não autoriza nada. A função lê o CPF DA LINHA
-- e roda o mesmo `oba_pode_ver` das outras RPCs — quem não puder ver
-- aquele CPF não atualiza, mesmo sabendo/adivinhando o id.
--
-- Idempotente: CREATE OR REPLACE. Função NOVA em vez de um parâmetro a
-- mais na existente por dois motivos: (a) só dá pra acrescentar parâmetro
-- com DEFAULT no FIM da lista — pôr `p_id` na posição natural (junto do
-- p_cpf) exigiria DROP + CREATE, e um DROP esquecido deixaria duas
-- funções ambíguas; (b) misturar "por id" e "por última linha" numa
-- função só encheria o PL/pgSQL de condicional, ficando mais difícil de
-- auditar justamente na parte de autorização.
--
-- PASSO no Supabase → SQL Editor: rodar este arquivo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.oba_anamnese_atualizar_por_id(
  p_id uuid,
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
  v_cpf text;
  v_cols text;
  v_n int;
  v_sql text;
BEGIN
  IF p_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Id invalido');
  END IF;

  -- O CPF vem DA LINHA (não do cliente): é ele que decide a autorização.
  SELECT regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g')
    INTO v_cpf
    FROM public.oba_anamnese o
   WHERE o.id = p_id;

  IF v_cpf IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Anamnese nao encontrada');
  END IF;

  IF NOT public.oba_pode_ver(v_cpf, p_crm, p_med_token, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- cpf/id/created_at nunca são alteráveis por patch (mesma regra da
  -- atualizar_ultima — o patch não pode mudar a identidade da linha).
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
  EXECUTE v_sql USING p_patch, p_id;

  RETURN jsonb_build_object('ok', true, 'id', p_id, 'colunas', v_n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.oba_anamnese_atualizar_por_id(uuid, jsonb, text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
