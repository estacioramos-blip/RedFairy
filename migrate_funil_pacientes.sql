-- ============================================================
-- migrate_funil_pacientes.sql  (DEC-012 — Funil de conversão de pacientes)
--
-- RPC só-admin com os números do funil Testaram -> Cadastraram -> Pagaram,
-- e o recorte testaram-e-cadastraram vs testaram-e-NÃO-cadastraram (leads).
--
-- CPF normalizado (só dígitos) em todas as fontes, senão os formatos divergem.
--
-- ⚠️ Limitação: a triagem é APAGADA no cadastro (consume_triagem_on_signup),
-- então alguns cadastrados não têm mais registro de teste (campo
-- cadastraram_sem_teste). Funil completo daqui pra frente exigiria parar de
-- apagar (marcar como consumida).
--
-- Idempotente: CREATE OR REPLACE. Termina com NOTIFY pgrst.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_funil_pacientes(p_crm text, p_token text)
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

  WITH
  prof AS (
    SELECT DISTINCT id, regexp_replace(coalesce(cpf,''), '\D', '', 'g') AS cpf
      FROM public.profiles
     WHERE coalesce(cpf,'') <> ''
  ),
  test AS (
    SELECT DISTINCT regexp_replace(coalesce(cpf,''), '\D', '', 'g') AS cpf
      FROM public.triagens WHERE coalesce(cpf,'') <> ''
    UNION
    SELECT DISTINCT regexp_replace(coalesce(cpf,''), '\D', '', 'g') AS cpf
      FROM public.avaliacoes WHERE coalesce(cpf,'') <> ''
  ),
  pagantes AS (
    SELECT DISTINCT p.cpf
      FROM prof p
      JOIN public.assinaturas a ON a.user_id = p.id AND a.status = 'ativa'
  )
  SELECT jsonb_build_object(
    'ok', true,
    'testaram',                 (SELECT count(*) FROM test),
    'cadastraram',              (SELECT count(*) FROM prof),
    'pagaram',                  (SELECT count(*) FROM pagantes),
    'testaram_cadastraram',     (SELECT count(*) FROM test t WHERE EXISTS (SELECT 1 FROM prof p WHERE p.cpf = t.cpf)),
    'testaram_nao_cadastraram', (SELECT count(*) FROM test t WHERE NOT EXISTS (SELECT 1 FROM prof p WHERE p.cpf = t.cpf)),
    'cadastraram_sem_teste',    (SELECT count(*) FROM prof p WHERE NOT EXISTS (SELECT 1 FROM test t WHERE t.cpf = p.cpf))
  ) INTO resultado;

  RETURN resultado;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_funil_pacientes(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
