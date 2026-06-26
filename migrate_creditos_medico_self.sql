-- =============================================================================
-- migrate_creditos_medico_self.sql   (médico vê os PRÓPRIOS créditos 4DOC)
-- =============================================================================
-- RASCUNHO PARA REVISÃO (rodar no Supabase Dashboard -> SQL Editor).
--
-- Até hoje só o ADMIN via os créditos do médico (admin_extrato_medico). Esta RPC deixa o
-- MÉDICO ver os contadores dele, validado pela sessão (token_medico_ok).
--
-- Contadores:
--   cadastrados      = total de pacientes que pagaram sob o CRM
--   recebidos        = creditos ja pagos ao medico (pago = true)
--   a_receber        = elegiveis e ainda nao pagos (elegivel = true, pago = false)
--   pendentes_elegib = ainda nao elegiveis (medico precisa de >=1 avaliacao completa)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.listar_creditos_medico(p_crm text, p_token text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cad int; v_rec int; v_arec int; v_pend int;
  v_usd numeric; v_cot numeric; v_pix text;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE pago),
         count(*) FILTER (WHERE elegivel AND NOT pago),
         count(*) FILTER (WHERE NOT elegivel AND NOT pago)
    INTO v_cad, v_rec, v_arec, v_pend
    FROM public.creditos_medico WHERE medico_crm = p_crm;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 15);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);
  SELECT pix_chave INTO v_pix FROM public.medicos WHERE crm = p_crm;

  RETURN jsonb_build_object('ok', true,
    'cadastrados', COALESCE(v_cad,0), 'recebidos', COALESCE(v_rec,0),
    'a_receber', COALESCE(v_arec,0), 'pendentes_elegib', COALESCE(v_pend,0),
    'valor_usd', v_usd, 'cotacao', v_cot, 'pix', COALESCE(v_pix,''));
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_creditos_medico(text, text) TO anon, authenticated;
