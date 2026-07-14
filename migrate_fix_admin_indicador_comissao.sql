-- migrate_fix_admin_indicador_comissao.sql
-- ---------------------------------------------------------------------------
-- CORRECAO (auditoria pre-lancamento): o painel ADM de Indicadores pagava o
-- indicador a US$15. admin_listar_indicadores lia comissao_usd_nao_afiliado
-- (=US$15, que apos o reproposito de jun/2026 e o AVALIAR do MEDICO), quando o
-- indicador de fato recebe comissao_usd_por_conversao (=US$10) — mesma chave que
-- fn_credita_medico e listar_creditos_indicador (o valor mostrado AO indicador) usam.
-- A funcao irma ja tinha sido corrigida; esta ficou para tras. Sem isso o ADM
-- pagava 50% a mais por PIX. So a linha do v_usd muda.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_listar_indicadores(p_crm text, p_token text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE resultado jsonb; v_usd numeric; v_cot numeric;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  -- Indicador recebe comissao_usd_por_conversao (US$10). (Antes lia, por engano,
  -- comissao_usd_nao_afiliado = US$15, que hoje e o AVALIAR do medico.)
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

GRANT EXECUTE ON FUNCTION public.admin_listar_indicadores(text, text) TO anon, authenticated;
