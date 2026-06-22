-- =============================================================================
-- migrate_medicos_prescritores.sql
-- =============================================================================
-- Banco de médicos COLABORADORES/PRESCRITORES do Projeto OBA — captados pelo
-- "Como Funciona > Sou Médico" do site. Ficam INATIVOS (ativo=false) até a ADM
-- ativar quando precisar de avaliadores/prescritores.
--
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole -> Run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.medicos_prescritores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text,
  crm              text,
  uf               text,
  celular          text,
  especialidade_1  text,
  rqe_1            text,
  especialidade_2  text,
  rqe_2            text,
  ativo            boolean NOT NULL DEFAULT false,   -- FLAG: ativado pela ADM quando necessário
  created_at       timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS ligado e sem policies: acesso só via RPC SECURITY DEFINER (cadastro) / ADM.
ALTER TABLE public.medicos_prescritores ENABLE ROW LEVEL SECURITY;

-- register_prescritor → INSERT do mini-cadastro (chamado pelo site via REST/anon).
CREATE OR REPLACE FUNCTION public.register_prescritor(
  p_nome text, p_crm text, p_uf text, p_celular text,
  p_esp1 text DEFAULT NULL, p_rqe1 text DEFAULT NULL,
  p_esp2 text DEFAULT NULL, p_rqe2 text DEFAULT NULL
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_id uuid;
BEGIN
  IF coalesce(btrim(p_nome), '') = '' THEN RETURN jsonb_build_object('ok', false, 'erro', 'Informe o nome'); END IF;
  IF coalesce(btrim(p_crm), '')  = '' THEN RETURN jsonb_build_object('ok', false, 'erro', 'Informe o CRM');  END IF;
  INSERT INTO public.medicos_prescritores (nome, crm, uf, celular, especialidade_1, rqe_1, especialidade_2, rqe_2)
  VALUES (btrim(p_nome), btrim(p_crm), upper(btrim(coalesce(p_uf, ''))), p_celular,
          NULLIF(btrim(coalesce(p_esp1, '')), ''), NULLIF(btrim(coalesce(p_rqe1, '')), ''),
          NULLIF(btrim(coalesce(p_esp2, '')), ''), NULLIF(btrim(coalesce(p_rqe2, '')), ''))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_prescritor(text,text,text,text,text,text,text,text) TO anon, authenticated;
