-- ============================================================================
-- migrate_restrito_admin.sql
-- "Acesso Restrito" (chapéu do rodapé): permitir que a SENHA DO ADMIN, sozinha
-- (sem CRM/UF), abra o painel admin — igual o tesoureiro abre o caixa só com a
-- senha. Espelha o login_medico (mesmo mecanismo de token de sessão), mas acha o
-- admin pela SENHA (is_admin = true + senha confere via crypt).
--
-- Trade-off (ciente): o painel admin passa a abrir com um dado só (a senha), em
-- vez de CRM + senha. Aceitável porque o chapéu é discreto (rodapé, abaixo da
-- dobra). O login normal ?modo=admin (CRM/UF) continua existindo.
--
-- Rodar no Supabase → SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.restrito_admin_login(p_senha text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH
  v AS MATERIALIZED (
    SELECT p_senha AS senha, encode(gen_random_bytes(32),'hex') AS tok
  ),
  m AS (
    SELECT med.id, med.nome, med.crm, med.is_admin
    FROM public.medicos med, v
    WHERE med.is_admin = true
      AND med.senha_klipbit IS NOT NULL
      AND med.senha_klipbit = crypt(v.senha, med.senha_klipbit)
    LIMIT 1
  ),
  gravado AS (
    UPDATE public.medicos SET
      session_token_hash = encode(digest((SELECT tok FROM v),'sha256'),'hex'),
      session_token_exp  = now() + interval '30 days'
    WHERE id = (SELECT id FROM m)
    RETURNING id
  )
  SELECT jsonb_build_object(
    'ok',       (SELECT count(*) FROM m) > 0,
    'id',       (SELECT id FROM m),
    'nome',     (SELECT nome FROM m),
    'crm',      (SELECT crm FROM m),
    'is_admin', (SELECT is_admin FROM m),
    'token',    (SELECT CASE WHEN (SELECT count(*) FROM m) > 0 THEN (SELECT tok FROM v) END)
  )
$function$;

GRANT EXECUTE ON FUNCTION public.restrito_admin_login(text) TO anon, authenticated;
