-- ============================================================
-- functions_paciente.sql  (DEC-008 — versionar RPCs de paciente)
--
-- Estas funções existiam SÓ no Supabase (não versionadas) — dívida apontada
-- no DEC-008. Aqui ficam sob controle de versão, fonte da verdade.
--
-- Padrão de auth do paciente: CPF + senha; senha guardada como HASH bcrypt
-- (pgcrypto crypt + gen_salt('bf',10)) na coluna profiles.senha_klipbit
-- (nome infeliz: guarda o HASH, não texto puro). É o mesmo padrão que o
-- médico passou a usar em migrate_medico_auth.sql.
--
-- Idempotente: CREATE OR REPLACE.
-- ============================================================

-- ------------------------------------------------------------
-- register_paciente — cadastra paciente com senha em bcrypt.
-- Retorno: { ok, id, erro }
-- (capturado verbatim do Supabase em 2026-06-03)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_paciente(p_cpf text, p_senha text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$WITH
  v AS (SELECT translate(coalesce($1,''), '.- /()', '') AS cpf_limpo, $2 AS senha),
  validacao AS (
    SELECT
      cpf_limpo,
      senha,
      CASE
        WHEN length(cpf_limpo) <> 11 THEN 'CPF invalido'
        WHEN coalesce(length(senha),0) < 6 THEN 'Senha muito curta'
        WHEN EXISTS (SELECT 1 FROM public.profiles WHERE cpf = cpf_limpo) THEN 'CPF ja cadastrado'
        ELSE NULL
      END AS erro
    FROM v
  ),
  inserido AS (
    INSERT INTO public.profiles (cpf, senha_klipbit)
    SELECT cpf_limpo, crypt(senha, gen_salt('bf', 10))
    FROM validacao
    WHERE erro IS NULL
    RETURNING id
  )
  SELECT jsonb_build_object(
    'ok',   (SELECT erro IS NULL FROM validacao),
    'id',   (SELECT id FROM inserido),
    'erro', (SELECT erro FROM validacao)
  )$function$;

-- ------------------------------------------------------------
-- login_paciente — valida CPF + senha (bcrypt) e devolve dados do paciente.
-- Retorno: { ok, id, nome, erro }
-- (capturado verbatim do Supabase em 2026-06-03)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.login_paciente(p_cpf text, p_senha text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$WITH
  v AS (SELECT translate(coalesce($1,''), '.- /()', '') AS cpf_limpo, $2 AS senha),
  busca AS (
    SELECT p.id, p.nome, p.senha_klipbit, v.cpf_limpo, v.senha
    FROM v
    LEFT JOIN public.profiles p ON p.cpf = v.cpf_limpo
  ),
  validacao AS (
    SELECT
      id, nome, senha_klipbit, senha,
      CASE
        WHEN length(cpf_limpo) <> 11 THEN 'CPF invalido'
        WHEN id IS NULL OR senha_klipbit IS NULL THEN 'CPF nao encontrado'
        WHEN crypt(senha, senha_klipbit) <> senha_klipbit THEN 'Senha incorreta'
        ELSE NULL
      END AS erro
    FROM busca
  )
  SELECT jsonb_build_object(
    'ok',   (SELECT erro IS NULL FROM validacao),
    'id',   (SELECT CASE WHEN erro IS NULL THEN id ELSE NULL END FROM validacao),
    'nome', (SELECT CASE WHEN erro IS NULL THEN nome ELSE NULL END FROM validacao),
    'erro', (SELECT erro FROM validacao)
  )$function$;

-- ------------------------------------------------------------
-- lookup_cpf_triagem — dado um CPF, retorna sexo/nascimento conhecidos
-- (de profiles; senão da triagem mais recente). NÃO expõe senha.
-- Retorno: TABLE(origem, nome, sexo, data_nascimento)
-- (capturado verbatim do Supabase em 2026-06-03)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_cpf_triagem(cpf_input text)
 RETURNS TABLE(origem text, nome text, sexo text, data_nascimento date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cpf_limpo TEXT;
BEGIN
  cpf_limpo := regexp_replace(cpf_input, '\D', '', 'g');

  IF length(cpf_limpo) <> 11 THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      'profile'::TEXT,
      p.nome::TEXT,
      p.sexo::TEXT,
      p.data_nascimento
    FROM profiles p
    WHERE p.cpf = cpf_limpo
    LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  RETURN QUERY
    SELECT
      'triagem'::TEXT,
      NULL::TEXT,
      t.sexo::TEXT,
      t.data_nascimento
    FROM triagens t
    WHERE t.cpf = cpf_limpo
      AND t.data_nascimento IS NOT NULL
    ORDER BY t.created_at DESC
    LIMIT 1;
END;
$function$;

-- ------------------------------------------------------------
-- Grants (as funções são chamadas pelo cliente anon antes de logar).
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.register_paciente(text,text)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_paciente(text,text)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_cpf_triagem(text)       TO anon, authenticated;
