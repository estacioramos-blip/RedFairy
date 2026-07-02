-- =============================================================================
-- migrate_fallback_anuidade_200.sql
-- =============================================================================
-- Atualiza o fallback da anuidade dentro de caixa_a_pagar: 149.90 → 200.
-- OPCIONAL/sem pressa: o valor vivo vem de config.valor_anuidade (= "200");
-- este fallback só é usado se aquela linha da config sumir ou ficar vazia.
-- Rodar no Supabase → SQL Editor. Mesma função do migrate_caixa.sql, só com
-- o fallback corrigido.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.caixa_a_pagar(p_token text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_usd_enc numeric; v_usd_av numeric; v_cot numeric;
  v_med jsonb; v_ind jsonb; v_pac jsonb; v_anuidade numeric;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd_enc := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_nao_afiliado'), 15);
  v_cot     := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  v_anuidade:= COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_anuidade'), 200);

  -- MÉDICOS: encaminhamentos elegíveis + avaliações, pendentes (inclui CRM ainda sem conta)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'crm', s.crm, 'nome', m.nome, 'pix', m.pix_chave,
      'n_enc', s.n_enc, 'n_av', s.n_av,
      'total_usd', s.n_enc * v_usd_enc + s.n_av * v_usd_av
    ) ORDER BY s.crm), '[]'::jsonb) INTO v_med
  FROM (
    SELECT crm, sum(n_enc) AS n_enc, sum(n_av) AS n_av FROM (
      SELECT medico_crm AS crm, count(*) AS n_enc, 0 AS n_av FROM public.creditos_medico
        WHERE elegivel AND NOT pago GROUP BY medico_crm
      UNION ALL
      SELECT medico_crm, 0, count(*) FROM public.creditos_avaliacao
        WHERE elegivel AND NOT pago GROUP BY medico_crm
    ) u GROUP BY crm
  ) s LEFT JOIN public.medicos m ON m.crm = s.crm;

  -- INDICADORES PUROS (tipo <> 'paciente')
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'codigo', s.codigo, 'nome', i.nome, 'pix', COALESCE(NULLIF(i.pix_chave,''), i.usdc_wallet),
      'titular', i.pix_titular, 'n', s.n, 'total_usd', s.n * v_usd_enc
    ) ORDER BY s.codigo), '[]'::jsonb) INTO v_ind
  FROM (
    SELECT c.indicador_codigo AS codigo, count(*) AS n
      FROM public.creditos_indicador c
      JOIN public.indicadores i2 ON i2.codigo = c.indicador_codigo
     WHERE NOT c.pago AND NOT COALESCE(c.abatido, false)
       AND COALESCE(i2.tipo,'') <> 'paciente'
     GROUP BY c.indicador_codigo
  ) s JOIN public.indicadores i ON i.codigo = s.codigo;

  -- PACIENTES-INDICADORES (encontro de contas): saldo = créditos*cotação − abatimentos
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'codigo', i.codigo, 'cpf', i.cpf, 'nome', i.nome,
      'n_creditos', s.n,
      'creditos_brl', round(s.n * v_usd_enc * v_cot, 2),
      'abatido_brl', COALESCE(ab.total, 0),
      'saldo_brl', round(s.n * v_usd_enc * v_cot - COALESCE(ab.total, 0), 2)
    ) ORDER BY i.nome), '[]'::jsonb) INTO v_pac
  FROM (
    SELECT c.indicador_codigo AS codigo, count(*) AS n
      FROM public.creditos_indicador c
      JOIN public.indicadores i2 ON i2.codigo = c.indicador_codigo
     WHERE NOT c.pago AND COALESCE(i2.tipo,'') = 'paciente'
     GROUP BY c.indicador_codigo
  ) s
  JOIN public.indicadores i ON i.codigo = s.codigo
  LEFT JOIN (SELECT cpf_paciente, sum(valor_brl) AS total FROM public.abatimentos_paciente GROUP BY cpf_paciente) ab
    ON ab.cpf_paciente = i.cpf;

  RETURN jsonb_build_object('ok', true, 'medicos', v_med, 'indicadores', v_ind, 'pacientes', v_pac,
                            'usd_enc', v_usd_enc, 'usd_av', v_usd_av, 'cotacao', v_cot, 'valor_anuidade', v_anuidade);
END; $$;
