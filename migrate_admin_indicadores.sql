-- =============================================================================
-- migrate_admin_indicadores.sql
-- =============================================================================
-- ADM: listar e pagar (liquidar) indicadores. Espelha admin_listar_medicos /
-- admin_liquidar_comissao. Protegido por token_admin_ok.
--
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole -> Run.
-- =============================================================================

-- admin_liquidar_indicador → marca como pagos os créditos de um indicador.
CREATE OR REPLACE FUNCTION public.admin_liquidar_indicador(p_crm text, p_token text, p_codigo text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE n int;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  WITH upd AS (
    UPDATE public.creditos_indicador
       SET pago = true, data_pagamento = now()
     WHERE indicador_codigo = p_codigo AND NOT pago
    RETURNING 1
  )
  SELECT count(*) INTO n FROM upd;
  RETURN jsonb_build_object('ok', true, 'liquidados', n);
END;
$$;

-- admin_listar_indicadores → indicadores + créditos (pendentes/pagos) + reservados.
CREATE OR REPLACE FUNCTION public.admin_listar_indicadores(p_crm text, p_token text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE resultado jsonb; v_usd numeric; v_cot numeric;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);

  WITH
  cred AS (
    SELECT indicador_codigo AS codigo,
           count(*) FILTER (WHERE NOT pago) AS pendentes,
           count(*) FILTER (WHERE pago)     AS pagos
      FROM public.creditos_indicador GROUP BY indicador_codigo
  ),
  pre AS (
    SELECT indicador_codigo AS codigo, count(*) AS n
      FROM public.indicacoes_precadastro GROUP BY indicador_codigo
  )
  SELECT jsonb_build_object(
    'ok', true,
    'comissao_usd', v_usd,
    'cotacao_dolar', v_cot,
    'indicadores', COALESCE(jsonb_agg(jsonb_build_object(
      'id',                 i.id,
      'codigo',             i.codigo,
      'nome',               i.nome,
      'cpf',                i.cpf,
      'celular',            i.celular,
      'tipo',               i.tipo,
      'pix_chave',          i.pix_chave,
      'usdc_wallet',        i.usdc_wallet,
      'ativo',              i.ativo,
      'reservados',         COALESCE(p.n, 0),
      'creditos_pendentes', COALESCE(c.pendentes, 0),
      'creditos_pagos',     COALESCE(c.pagos, 0)
    ) ORDER BY COALESCE(c.pendentes, 0) DESC, i.created_at DESC), '[]'::jsonb)
  )
  INTO resultado
  FROM public.indicadores i
  LEFT JOIN cred c ON c.codigo = i.codigo
  LEFT JOIN pre  p ON p.codigo = i.codigo;

  RETURN resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_liquidar_indicador(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_indicadores(text, text) TO anon, authenticated;
