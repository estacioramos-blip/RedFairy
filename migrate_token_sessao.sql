-- ============================================================
-- migrate_token_sessao.sql  (DEC-008 — token de sessão / "crachá")
--
-- Base da segurança de dados (RLS gateway). Como a auth é RPC+localStorage
-- (sem auth.uid()), as leituras por CPF/CRM seriam falsificáveis. O token
-- resolve: o login devolve um token aleatório; cada RPC sensível (Fases 1–3)
-- valida (cpf/crm + token) antes de responder.
--
-- - Guarda só o HASH (sha256) do token, nunca o token cru.
-- - Validade: 30 dias (renovada a cada login/cadastro).
-- - NÃO-DESTRUTIVO: colunas aditivas; os logins só GANHAM o campo `token`
--   no retorno (cliente antigo ignora). Idempotente (CREATE OR REPLACE).
--
-- pgcrypto (gen_random_bytes/digest/crypt) vive em `extensions` — coberto
-- pelo search_path das funções.
-- ============================================================

-- 1. Colunas de token --------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS session_token_hash text,
  ADD COLUMN IF NOT EXISTS session_token_exp  timestamptz;

ALTER TABLE medicos
  ADD COLUMN IF NOT EXISTS session_token_hash text,
  ADD COLUMN IF NOT EXISTS session_token_exp  timestamptz;

-- 2. Funções-crachá (usadas pelas RPCs das próximas fases) -------------------
-- Retornam TRUE se o token bate com o hash guardado e não expirou.
CREATE OR REPLACE FUNCTION public.token_medico_ok(p_crm text, p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.medicos
    WHERE crm = upper(btrim(coalesce(p_crm,'')))
      AND coalesce(p_token,'') <> ''
      AND session_token_hash = encode(digest(p_token,'sha256'),'hex')
      AND session_token_exp > now()
  )
$$;

CREATE OR REPLACE FUNCTION public.token_admin_ok(p_crm text, p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.medicos
    WHERE crm = upper(btrim(coalesce(p_crm,'')))
      AND is_admin = true
      AND coalesce(p_token,'') <> ''
      AND session_token_hash = encode(digest(p_token,'sha256'),'hex')
      AND session_token_exp > now()
  )
$$;

CREATE OR REPLACE FUNCTION public.token_paciente_ok(p_cpf text, p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE cpf = translate(coalesce(p_cpf,''), '.- /()', '')
      AND coalesce(p_token,'') <> ''
      AND session_token_hash = encode(digest(p_token,'sha256'),'hex')
      AND session_token_exp > now()
  )
$$;

GRANT EXECUTE ON FUNCTION public.token_medico_ok(text,text)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.token_admin_ok(text,text)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.token_paciente_ok(text,text) TO anon, authenticated;

-- 3. login_medico — agora emite token --------------------------------------
CREATE OR REPLACE FUNCTION public.login_medico(p_crm text, p_senha text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH
  v AS MATERIALIZED (
    SELECT upper(btrim(coalesce($1,''))) AS crm, $2 AS senha,
           encode(gen_random_bytes(32),'hex') AS tok
  ),
  m AS (
    SELECT med.id, med.nome, med.crm, med.is_admin, med.senha_klipbit
    FROM public.medicos med, v WHERE med.crm = v.crm LIMIT 1
  ),
  res AS (
    SELECT m.id, m.nome, m.crm, m.is_admin, v.tok,
      CASE
        WHEN m.id IS NULL                                        THEN 'CRM nao encontrado'
        WHEN m.senha_klipbit IS NULL                            THEN 'Conta sem senha'
        WHEN m.senha_klipbit <> crypt(v.senha, m.senha_klipbit) THEN 'Senha incorreta'
        ELSE NULL
      END AS erro
    FROM v LEFT JOIN m ON true
  ),
  gravado AS (
    UPDATE public.medicos SET
      session_token_hash = encode(digest((SELECT tok FROM res),'sha256'),'hex'),
      session_token_exp  = now() + interval '30 days'
    WHERE id = (SELECT id FROM res WHERE erro IS NULL)
    RETURNING id
  )
  SELECT jsonb_build_object(
    'ok',       (SELECT erro IS NULL FROM res),
    'id',       (SELECT CASE WHEN erro IS NULL THEN id END FROM res),
    'nome',     (SELECT CASE WHEN erro IS NULL THEN nome END FROM res),
    'crm',      (SELECT CASE WHEN erro IS NULL THEN crm END FROM res),
    'is_admin', (SELECT CASE WHEN erro IS NULL THEN is_admin END FROM res),
    'token',    (SELECT CASE WHEN erro IS NULL THEN tok END FROM res),
    'erro',     (SELECT erro FROM res)
  )
$function$;

-- 4. register_medico — agora emite token ------------------------------------
CREATE OR REPLACE FUNCTION public.register_medico(
  p_nome text, p_crm text, p_uf text, p_celular text, p_email text, p_senha text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH
  v AS MATERIALIZED (
    SELECT
      btrim(coalesce($1,''))                    AS nome,
      upper(btrim(coalesce($2,'')))             AS crm,
      upper(btrim(coalesce($3,'')))             AS uf,
      translate(coalesce($4,''), '.- /()', '')  AS celular,
      lower(btrim(coalesce($5,'')))             AS email,
      $6                                        AS senha,
      encode(gen_random_bytes(32),'hex')        AS tok
  ),
  validacao AS (
    SELECT v.*,
      CASE
        WHEN v.crm = ''                                 THEN 'CRM invalido'
        WHEN coalesce(length(v.senha),0) < 6            THEN 'Senha muito curta'
        WHEN EXISTS (SELECT 1 FROM public.medicos m WHERE m.crm = v.crm) THEN 'CRM ja cadastrado'
        ELSE NULL
      END AS erro
    FROM v
  ),
  inserido AS (
    INSERT INTO public.medicos
      (nome, crm, uf, celular, email, senha_klipbit, session_token_hash, session_token_exp)
    SELECT nome, crm, uf, celular, email, crypt(senha, gen_salt('bf', 10)),
           encode(digest(tok,'sha256'),'hex'), now() + interval '30 days'
    FROM validacao WHERE erro IS NULL
    RETURNING id, nome, crm, is_admin
  )
  SELECT jsonb_build_object(
    'ok',       (SELECT erro IS NULL FROM validacao),
    'id',       (SELECT id FROM inserido),
    'nome',     (SELECT nome FROM inserido),
    'crm',      (SELECT crm FROM inserido),
    'is_admin', (SELECT is_admin FROM inserido),
    'token',    (SELECT CASE WHEN (SELECT erro IS NULL FROM validacao) THEN (SELECT tok FROM v) END),
    'erro',     (SELECT erro FROM validacao)
  )
$function$;

-- 5. login_paciente — agora emite token -------------------------------------
CREATE OR REPLACE FUNCTION public.login_paciente(p_cpf text, p_senha text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH
  v AS MATERIALIZED (
    SELECT translate(coalesce($1,''), '.- /()', '') AS cpf_limpo, $2 AS senha,
           encode(gen_random_bytes(32),'hex') AS tok
  ),
  busca AS (
    SELECT p.id, p.nome, p.senha_klipbit, v.cpf_limpo, v.senha, v.tok
    FROM v LEFT JOIN public.profiles p ON p.cpf = v.cpf_limpo
  ),
  validacao AS (
    SELECT id, nome, senha_klipbit, senha, tok,
      CASE
        WHEN length(cpf_limpo) <> 11 THEN 'CPF invalido'
        WHEN id IS NULL OR senha_klipbit IS NULL THEN 'CPF nao encontrado'
        WHEN crypt(senha, senha_klipbit) <> senha_klipbit THEN 'Senha incorreta'
        ELSE NULL
      END AS erro
    FROM busca
  ),
  gravado AS (
    UPDATE public.profiles SET
      session_token_hash = encode(digest((SELECT tok FROM validacao),'sha256'),'hex'),
      session_token_exp  = now() + interval '30 days'
    WHERE id = (SELECT id FROM validacao WHERE erro IS NULL)
    RETURNING id
  )
  SELECT jsonb_build_object(
    'ok',    (SELECT erro IS NULL FROM validacao),
    'id',    (SELECT CASE WHEN erro IS NULL THEN id END FROM validacao),
    'nome',  (SELECT CASE WHEN erro IS NULL THEN nome END FROM validacao),
    'token', (SELECT CASE WHEN erro IS NULL THEN tok END FROM validacao),
    'erro',  (SELECT erro FROM validacao)
  )
$function$;

-- 6. register_paciente — agora emite token ----------------------------------
CREATE OR REPLACE FUNCTION public.register_paciente(p_cpf text, p_senha text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH
  v AS MATERIALIZED (
    SELECT translate(coalesce($1,''), '.- /()', '') AS cpf_limpo, $2 AS senha,
           encode(gen_random_bytes(32),'hex') AS tok
  ),
  validacao AS (
    SELECT cpf_limpo, senha, tok,
      CASE
        WHEN length(cpf_limpo) <> 11 THEN 'CPF invalido'
        WHEN coalesce(length(senha),0) < 6 THEN 'Senha muito curta'
        WHEN EXISTS (SELECT 1 FROM public.profiles WHERE cpf = cpf_limpo) THEN 'CPF ja cadastrado'
        ELSE NULL
      END AS erro
    FROM v
  ),
  inserido AS (
    INSERT INTO public.profiles (cpf, senha_klipbit, session_token_hash, session_token_exp)
    SELECT cpf_limpo, crypt(senha, gen_salt('bf', 10)),
           encode(digest(tok,'sha256'),'hex'), now() + interval '30 days'
    FROM validacao WHERE erro IS NULL
    RETURNING id
  )
  SELECT jsonb_build_object(
    'ok',    (SELECT erro IS NULL FROM validacao),
    'id',    (SELECT id FROM inserido),
    'token', (SELECT CASE WHEN (SELECT erro IS NULL FROM validacao) THEN (SELECT tok FROM v) END),
    'erro',  (SELECT erro FROM validacao)
  )
$function$;
