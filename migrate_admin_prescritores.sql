-- =============================================================================
-- migrate_admin_prescritores.sql
-- =============================================================================
-- ADM: listar e ATIVAR/desativar médicos prescritores (colaboradores).
-- Protegido por token_admin_ok.
--
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole -> Run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_listar_prescritores(p_crm text, p_token text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE resultado jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  SELECT jsonb_build_object('ok', true, 'prescritores', COALESCE(jsonb_agg(jsonb_build_object(
    'id',              id,
    'nome',            nome,
    'crm',             crm,
    'uf',              uf,
    'celular',         celular,
    'especialidade_1', especialidade_1,
    'rqe_1',           rqe_1,
    'especialidade_2', especialidade_2,
    'rqe_2',           rqe_2,
    'ativo',           ativo,
    'created_at',      created_at
  ) ORDER BY ativo ASC, created_at DESC), '[]'::jsonb))
  INTO resultado FROM public.medicos_prescritores;
  RETURN resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ativar_prescritor(p_crm text, p_token text, p_id uuid, p_ativo boolean)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  UPDATE public.medicos_prescritores SET ativo = p_ativo WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_listar_prescritores(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ativar_prescritor(text, text, uuid, boolean) TO anon, authenticated;
