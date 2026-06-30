-- =============================================================================
-- migrate_medico_publico.sql   (dados PÚBLICOS do médico p/ os modais do paciente)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- O paciente que chega por encaminhamento/recomendação precisa ver "Dr./Dra. NOME
-- + CRM/UF". Esta RPC devolve só os campos públicos do médico (nome, sexo, crm, uf)
-- a partir do CRM (ex.: '6302/BA'). SECURITY DEFINER (a tabela medicos tem RLS).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.medico_publico(p_crm text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  WITH m AS (
    SELECT nome, sexo, crm, uf
    FROM public.medicos
    WHERE crm = upper(btrim(coalesce(p_crm, '')))
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'ok',   EXISTS (SELECT 1 FROM m),
    'nome', (SELECT nome FROM m),
    'sexo', (SELECT sexo FROM m),
    'crm',  (SELECT crm  FROM m),
    'uf',   (SELECT uf   FROM m)
  )
$function$;

-- Permite chamar via anon/authenticated (o paciente ainda não tem sessão de médico).
GRANT EXECUTE ON FUNCTION public.medico_publico(text) TO anon, authenticated;
