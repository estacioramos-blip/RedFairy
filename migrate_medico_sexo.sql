-- =============================================================================
-- migrate_medico_sexo.sql   (grava o SEXO do médico → textos dinâmicos Doutor/a)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- Adiciona medicos.sexo e faz register_medico/complete_medico gravarem-no.
-- =============================================================================

-- 1) Coluna -------------------------------------------------------------------
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS sexo text;

-- 2) complete_medico — agora também grava o sexo (5º arg, opcional) -----------
DROP FUNCTION IF EXISTS public.complete_medico(text, text, text, text);
CREATE OR REPLACE FUNCTION public.complete_medico(p_crm text, p_nome text, p_celular text, p_email text, p_sexo text DEFAULT NULL)
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
      lower(btrim(coalesce($4,'')))             AS email,
      upper(btrim(coalesce($5,'')))             AS sexo
  ),
  atualizado AS (
    -- Campo vazio preserva o valor atual (não zera).
    UPDATE public.medicos m
    SET nome    = COALESCE(NULLIF(v.nome, ''),    m.nome),
        celular = COALESCE(NULLIF(v.celular, ''), m.celular),
        email   = COALESCE(NULLIF(v.email, ''),   m.email),
        sexo    = COALESCE(NULLIF(v.sexo, ''),    m.sexo)
    FROM v
    WHERE m.crm = v.crm
    RETURNING m.id
  )
  SELECT jsonb_build_object(
    'ok',   EXISTS (SELECT 1 FROM atualizado),
    'erro', CASE WHEN EXISTS (SELECT 1 FROM atualizado) THEN NULL ELSE 'CRM nao encontrado' END
  )
$function$;

-- 3) register_medico — insere o sexo (7º arg, opcional) -----------------------
DROP FUNCTION IF EXISTS public.register_medico(text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.register_medico(p_nome text, p_crm text, p_uf text, p_celular text, p_email text, p_senha text, p_sexo text DEFAULT NULL)
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
      upper(btrim(coalesce($7,'')))             AS sexo,
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
      (nome, crm, uf, celular, email, sexo, senha_klipbit, session_token_hash, session_token_exp)
    SELECT nome, crm, uf, celular, email, NULLIF(sexo,''), crypt(senha, gen_salt('bf', 10)),
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
