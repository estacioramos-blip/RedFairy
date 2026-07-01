-- =============================================================================
-- migrate_pix_titular.sql   (Fase A — titular da conta PIX do INDICADOR)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- A chave PIX é muitas vezes de um FAMILIAR → precisamos do TITULAR da conta pra
-- pagar certo e avisar o indicador. Se for conta PJ, guardamos Razão Social + CNPJ.
-- (indicadores já tem nome/celular/email — o modal passa a preenchê-los quando faltam.)
-- =============================================================================

-- 1) Colunas do titular do PIX ------------------------------------------------
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS pix_titular    text;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS pix_titular_pj boolean DEFAULT false;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS pix_cnpj       text;

-- 2) paciente_salvar_pix — grava titular / PJ / CNPJ + nome/celular/email ------
DROP FUNCTION IF EXISTS public.paciente_salvar_pix(text, text, text);
CREATE OR REPLACE FUNCTION public.paciente_salvar_pix(
  p_cpf text, p_nome text, p_pix text,
  p_celular text DEFAULT NULL, p_email text DEFAULT NULL,
  p_titular text DEFAULT NULL, p_pj boolean DEFAULT false, p_cnpj text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_cpf text := translate(coalesce(p_cpf,''), '.- /()', '');
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido'); END IF;
  IF coalesce(btrim(p_pix), '') = '' THEN RETURN jsonb_build_object('ok', false, 'erro', 'Informe a chave PIX'); END IF;
  UPDATE public.indicadores
     SET pix_chave      = btrim(p_pix),
         nome           = COALESCE(NULLIF(btrim(p_nome), ''), nome),
         celular        = COALESCE(NULLIF(translate(coalesce(p_celular,''), '.- /()', ''), ''), celular),
         email          = COALESCE(NULLIF(lower(btrim(coalesce(p_email,''))), ''), email),
         pix_titular    = NULLIF(btrim(coalesce(p_titular, '')), ''),
         pix_titular_pj = coalesce(p_pj, false),
         pix_cnpj       = NULLIF(regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g'), '')
   WHERE cpf = v_cpf;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'erro', 'Indicador nao encontrado'); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.paciente_salvar_pix(text, text, text, text, text, text, boolean, text) TO anon, authenticated;
