-- ============================================================
-- migrate_paciente_oba.sql  (DEC-014 — abertura robusta da anamnese OBA)
--
-- RPC que diz se o paciente PRECISA preencher a anamnese OBA: é bariátrico
-- (perfil OU triagem OU avaliação) E ainda não preencheu (oba_anamnese).
--
-- SECURITY DEFINER fura o RLS — necessário porque a triagem órfã do paciente
-- tem user_id=null e a policy de SELECT exige auth.uid()=user_id (o paciente
-- não conseguiria ler a própria triagem pelo client). CPF normalizado.
--
-- Conserta o bug: o flag bariátrico não chegava ao perfil (consume_triagem_
-- on_signup falha quando auth.uid() ainda é nulo no signup) e o OBA nunca abria.
--
-- Idempotente: CREATE OR REPLACE. Termina com NOTIFY pgrst.
-- ============================================================

CREATE OR REPLACE FUNCTION public.paciente_precisa_oba(p_cpf text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT
    NOT EXISTS (
      SELECT 1 FROM public.oba_anamnese
       WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = regexp_replace(coalesce(p_cpf,''), '\D', '', 'g')
    )
    AND (
      EXISTS (SELECT 1 FROM public.triagens
               WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = regexp_replace(coalesce(p_cpf,''), '\D', '', 'g')
                 AND bariatrica IS TRUE)
      OR EXISTS (SELECT 1 FROM public.avaliacoes
                  WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = regexp_replace(coalesce(p_cpf,''), '\D', '', 'g')
                    AND bariatrica IS TRUE)
      OR EXISTS (SELECT 1 FROM public.profiles
                  WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = regexp_replace(coalesce(p_cpf,''), '\D', '', 'g')
                    AND bariatrica IS TRUE)
    );
$function$;

GRANT EXECUTE ON FUNCTION public.paciente_precisa_oba(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
