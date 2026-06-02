-- ============================================================
-- migrate_medico_auth.sql  (DEC-008 — auth do médico via RPC)
--
-- Espelha o padrão de paciente (register_paciente/login_paciente): senha
-- com hash bcrypt (pgcrypto crypt + gen_salt('bf',10)) no servidor, e o
-- cliente recebe só { ok, id, nome, crm, is_admin, erro }.
--
-- Reaproveita a coluna `medicos.senha_klipbit` para guardar o HASH (igual
-- profiles.senha_klipbit já faz para o paciente). A partir daqui a anon key
-- não precisa mais ler a senha — o corte no app (próximo passo) para de
-- selecionar/comparar a coluna no navegador.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE.
-- ============================================================

-- pgcrypto vive no schema `extensions` no Supabase; o search_path abaixo cobre.
ALTER TABLE medicos
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- ------------------------------------------------------------
-- register_medico — cadastra um médico com senha em bcrypt.
-- Retorno: { ok, id, nome, crm, is_admin, erro }
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_medico(
  p_nome text, p_crm text, p_uf text, p_celular text, p_email text, p_senha text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH
  v AS (
    SELECT
      btrim(coalesce($1,''))                    AS nome,
      upper(btrim(coalesce($2,'')))             AS crm,
      upper(btrim(coalesce($3,'')))             AS uf,
      translate(coalesce($4,''), '.- /()', '')  AS celular,
      lower(btrim(coalesce($5,'')))             AS email,
      $6                                        AS senha
  ),
  validacao AS (
    -- nome/email são OPCIONAIS aqui: a caixa do hero cadastra só CRM+senha
    -- (quick-start) e o perfil é completado depois via complete_medico.
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
    INSERT INTO public.medicos (nome, crm, uf, celular, email, senha_klipbit)
    SELECT nome, crm, uf, celular, email, crypt(senha, gen_salt('bf', 10))
    FROM validacao
    WHERE erro IS NULL
    RETURNING id, nome, crm, is_admin
  )
  SELECT jsonb_build_object(
    'ok',       (SELECT erro IS NULL FROM validacao),
    'id',       (SELECT id FROM inserido),
    'nome',     (SELECT nome FROM inserido),
    'crm',      (SELECT crm FROM inserido),
    'is_admin', (SELECT is_admin FROM inserido),
    'erro',     (SELECT erro FROM validacao)
  )
$function$;

-- ------------------------------------------------------------
-- login_medico — valida CRM + senha (bcrypt) e devolve os dados do médico.
-- Retorno: { ok, id, nome, crm, is_admin, erro }
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.login_medico(p_crm text, p_senha text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH
  v AS (SELECT upper(btrim(coalesce($1,''))) AS crm, $2 AS senha),
  m AS (
    SELECT med.id, med.nome, med.crm, med.is_admin, med.senha_klipbit
    FROM public.medicos med, v
    WHERE med.crm = v.crm
    LIMIT 1
  ),
  res AS (
    SELECT
      m.id, m.nome, m.crm, m.is_admin,
      CASE
        WHEN m.id IS NULL                                          THEN 'CRM nao encontrado'
        WHEN m.senha_klipbit IS NULL                              THEN 'Conta sem senha'
        WHEN m.senha_klipbit <> crypt(v.senha, m.senha_klipbit)   THEN 'Senha incorreta'
        ELSE NULL
      END AS erro
    FROM v LEFT JOIN m ON true
  )
  SELECT jsonb_build_object(
    'ok',       (SELECT erro IS NULL FROM res),
    'id',       (SELECT CASE WHEN erro IS NULL THEN id END FROM res),
    'nome',     (SELECT CASE WHEN erro IS NULL THEN nome END FROM res),
    'crm',      (SELECT CASE WHEN erro IS NULL THEN crm END FROM res),
    'is_admin', (SELECT CASE WHEN erro IS NULL THEN is_admin END FROM res),
    'erro',     (SELECT erro FROM res)
  )
$function$;

-- ------------------------------------------------------------
-- complete_medico — completa o perfil (nome/celular/email) de um médico já
-- criado (etapa 2 do cadastro: a caixa do hero cria só CRM+senha; o Calculator
-- completa o resto). Não toca na senha. Chaveado por CRM (mesmo nível de
-- confiança do padrão atual; endurecido quando o RLS gateway entrar).
-- Retorno: { ok, erro }
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_medico(
  p_crm text, p_nome text, p_celular text, p_email text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH
  v AS (
    SELECT
      upper(btrim(coalesce($1,'')))             AS crm,
      btrim(coalesce($2,''))                    AS nome,
      translate(coalesce($3,''), '.- /()', '')  AS celular,
      lower(btrim(coalesce($4,'')))             AS email
  ),
  atualizado AS (
    -- Campo vazio preserva o valor atual (não zera).
    UPDATE public.medicos m
    SET nome    = COALESCE(NULLIF(v.nome, ''),    m.nome),
        celular = COALESCE(NULLIF(v.celular, ''), m.celular),
        email   = COALESCE(NULLIF(v.email, ''),   m.email)
    FROM v
    WHERE m.crm = v.crm
    RETURNING m.id
  )
  SELECT jsonb_build_object(
    'ok',   EXISTS (SELECT 1 FROM atualizado),
    'erro', CASE WHEN EXISTS (SELECT 1 FROM atualizado) THEN NULL ELSE 'CRM nao encontrado' END
  )
$function$;

GRANT EXECUTE ON FUNCTION public.register_medico(text,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_medico(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_medico(text,text,text,text) TO anon, authenticated;
