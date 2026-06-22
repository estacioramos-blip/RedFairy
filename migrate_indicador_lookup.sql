-- =============================================================================
-- migrate_indicador_lookup.sql
-- =============================================================================
-- lookup_indicador: dado um CPF, diz se já existe um indicador cadastrado.
-- Usado pela tela do indicador pra decidir login (existe) x cadastro (não existe),
-- igual o paciente faz com lookup_cpf_triagem. NÃO expõe senha.
--
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole -> Run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.lookup_indicador(p_cpf text)
  RETURNS jsonb
  LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
  SELECT jsonb_build_object('existe', EXISTS (
    SELECT 1 FROM public.indicadores
    WHERE cpf = translate(coalesce(p_cpf, ''), '.- /()', '')
  ));
$$;

GRANT EXECUTE ON FUNCTION public.lookup_indicador(text) TO anon, authenticated;
