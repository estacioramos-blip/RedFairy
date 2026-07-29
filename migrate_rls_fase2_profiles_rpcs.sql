-- ============================================================
-- migrate_rls_fase2_profiles_rpcs.sql (RLS Fase 2, tabela 4/4: profiles)
--
-- `profiles` é a identidade do paciente: nome, CPF, celular, e-mail, endereço,
-- contato de emergência, além das flags clínicas (bariátrica, gestante).
-- Hoje é lida por qualquer um com a chave anon, que é pública.
--
-- Substitui os 19 acessos diretos por RPCs SECURITY DEFINER gateadas por token.
-- Mesma regra de ouro: RPC → código → testar → só então o ENABLE do RLS.
--
-- ⚠ EXPOSIÇÃO RESIDUAL, DECIDIDA E ACEITA PELO ESTÁCIO (jul/2026):
-- a RPC `lookup_cpf_triagem` continua PÚBLICA (sem token) e devolve
-- nome + sexo + data de nascimento a partir de um CPF. Ela é SECURITY DEFINER,
-- portanto ligar o RLS aqui NÃO a fecha. Isso é intencional: o funil de entrada
-- do OBA precisa distinguir "visitante novo" de "já cadastrado" ANTES de existir
-- qualquer login, e cumprimenta pelo nome. Consequência assumida: quem tiver uma
-- lista de CPFs consegue confirmar nome e nascimento de cada um. Se um dia isso
-- incomodar, o caminho é parar de devolver o `nome` (sexo e nascimento bastam
-- para pré-preencher a triagem).
-- ============================================================

-- ── Helper: o próprio paciente (por CPF+token) ou um médico logado ──
CREATE OR REPLACE FUNCTION public.perfil_pode_ver(
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

GRANT EXECUTE ON FUNCTION public.perfil_pode_ver(text, text, text, text) TO anon, authenticated;


-- ── 1) Perfil do próprio paciente (linha inteira) ──
-- p_id, quando informado, tem que bater com a linha do CPF — evita que um token
-- válido de um CPF leia a linha de outro por id.
CREATE OR REPLACE FUNCTION public.profiles_meu(
  p_cpf text,
  p_pac_token text,
  p_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v jsonb;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- NUNCA devolver a linha crua: profiles guarda senha_klipbit e
  -- session_token_hash. Esses campos são removidos antes de sair do banco.
  SELECT to_jsonb(p.*) - 'senha_klipbit' - 'session_token_hash' - 'session_token_exp' INTO v
    FROM public.profiles p
   WHERE p.cpf = v_cpf
     AND (p_id IS NULL OR p.id = p_id)
   LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'perfil', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.profiles_meu(text, text, uuid) TO anon, authenticated;


-- ── 2) Leitura por CPF para os fluxos do médico / reconhecimento ──
-- Devolve só o conjunto de campos que as telas consomem — NÃO a linha inteira
-- (endereço e contato de emergência ficam de fora; nenhuma tela precisa deles
-- por este caminho).
CREATE OR REPLACE FUNCTION public.profiles_por_cpf(
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
  v jsonb;
BEGIN
  IF NOT public.perfil_pode_ver(v_cpf, p_crm, p_med_token, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT jsonb_build_object(
           'id', p.id, 'cpf', p.cpf, 'nome', p.nome, 'sexo', p.sexo,
           'data_nascimento', p.data_nascimento, 'celular', p.celular,
           'email', p.email, 'bariatrica', p.bariatrica, 'gestante', p.gestante,
           'semanas_gestacao_triagem', p.semanas_gestacao_triagem,
           'data_triagem_gestacao', p.data_triagem_gestacao,
           'boas_vindas_vista', p.boas_vindas_vista,
           'primeira_avaliacao_feita', p.primeira_avaliacao_feita
         )
    INTO v
    FROM public.profiles p
   WHERE p.cpf = v_cpf
   LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'perfil', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.profiles_por_cpf(text, text, text, text) TO anon, authenticated;


-- ── 3) Atualização do próprio perfil (colunas dinâmicas via jsonb) ──
-- cpf / id / created_at nunca são alteráveis por patch.
CREATE OR REPLACE FUNCTION public.profiles_atualizar(
  p_cpf text,
  p_patch jsonb,
  p_pac_token text DEFAULT NULL,
  p_crm text DEFAULT NULL,
  p_med_token text DEFAULT NULL
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
  v jsonb;
BEGIN
  IF NOT public.perfil_pode_ver(v_cpf, p_crm, p_med_token, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
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

  -- Devolve o perfil atualizado (o CompletarPerfilModal usava .select() no update).
  -- NUNCA devolver a linha crua: profiles guarda senha_klipbit e
  -- session_token_hash. Esses campos são removidos antes de sair do banco.
  SELECT to_jsonb(p.*) - 'senha_klipbit' - 'session_token_hash' - 'session_token_exp' INTO v FROM public.profiles p WHERE p.id = v_id;
  RETURN jsonb_build_object('ok', true, 'id', v_id, 'perfil', v, 'colunas', v_n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.profiles_atualizar(text, jsonb, text, text, text) TO anon, authenticated;


-- ── 4) ADMIN: lista de perfis ──
CREATE OR REPLACE FUNCTION public.admin_profiles_lista(p_crm text, p_token text)
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
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', p.id, 'nome', p.nome, 'cpf', p.cpf, 'celular', p.celular
         )), '[]'::jsonb) INTO v
    FROM public.profiles p;
  RETURN jsonb_build_object('ok', true, 'linhas', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_profiles_lista(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
