-- migrate_caixa_travar_cotacao_paciente.sql
-- ---------------------------------------------------------------------------
-- CORRECAO (auditoria pre-lancamento, achado #6): no encontro de contas o saldo
-- do paciente-indicador era = creditos(nao pagos) x US$ x COTACAO_ATUAL - abatimentos.
-- Como os creditos re-valorizavam na cotacao atual mas os abatimentos ficavam
-- congelados em R$, quando o dolar subia um saldo ja quitado REAPARECIA e o
-- "PAGAR EXCEDENTE" reabilitava -> risco de pagar em dobro.
--
-- DECISAO (Estacio): TRAVAR TUDO EM REAIS no PRIMEIRO abatimento. A partir dai o
-- paciente tem a cotacao travada e todos os creditos dele passam a valer por ela
-- (nao acompanham mais o dolar). Antes do 1o abatimento, usa a cotacao atual.
--
-- Implementacao: coluna cotacao em abatimentos_paciente (a cotacao usada naquele
-- abatimento). A "cotacao travada" do paciente = cotacao do abatimento mais antigo
-- (COALESCE p/ atual se ainda nao houver abatimento). Os 3 lugares que calculam o
-- saldo (caixa_a_pagar, caixa_abater, caixa_extrato) passam a usar essa cotacao travada.
-- ---------------------------------------------------------------------------

ALTER TABLE public.abatimentos_paciente ADD COLUMN IF NOT EXISTS cotacao numeric;
-- Linhas antigas sem cotacao: carimba com a cotacao atual (best-effort; pre-lancamento).
UPDATE public.abatimentos_paciente
   SET cotacao = COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0)
 WHERE cotacao IS NULL;

-- 1) caixa_a_pagar: bloco PACIENTES usa a cotacao travada (LATERAL do 1o abatimento) ---
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

  -- MEDICOS: encaminhamentos elegiveis + avaliacoes, pendentes (inclui CRM ainda sem conta)
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

  -- PACIENTES-INDICADORES (encontro de contas): saldo = creditos x US$ x COTACAO TRAVADA - abatimentos
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'codigo', i.codigo, 'cpf', i.cpf, 'nome', i.nome,
      'n_creditos', s.n,
      'creditos_brl', round(s.n * v_usd_enc * COALESCE(lk.cot, v_cot), 2),
      'abatido_brl', COALESCE(ab.total, 0),
      'saldo_brl', round(s.n * v_usd_enc * COALESCE(lk.cot, v_cot) - COALESCE(ab.total, 0), 2)
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
    ON ab.cpf_paciente = i.cpf
  LEFT JOIN LATERAL (SELECT cotacao AS cot FROM public.abatimentos_paciente
                      WHERE cpf_paciente = i.cpf ORDER BY created_at ASC LIMIT 1) lk ON true;

  RETURN jsonb_build_object('ok', true, 'medicos', v_med, 'indicadores', v_ind, 'pacientes', v_pac,
                            'usd_enc', v_usd_enc, 'usd_av', v_usd_av, 'cotacao', v_cot, 'valor_anuidade', v_anuidade);
END; $$;

-- 2) caixa_abater: usa a cotacao travada no saldo e GRAVA a cotacao na linha -----------
CREATE OR REPLACE FUNCTION public.caixa_abater(p_token text, p_cpf text, p_tipo text, p_valor numeric, p_obs text DEFAULT NULL)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_usd numeric; v_cot numeric; v_cot_lock numeric; v_n int; v_abatido numeric; v_saldo numeric; v_uid uuid; v_rows int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  IF p_tipo NOT IN ('anuidade','documento','pix') THEN RETURN jsonb_build_object('ok', false, 'erro', 'Tipo invalido'); END IF;
  IF coalesce(p_valor,0) <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Valor invalido'); END IF;
  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;

  -- Cotacao TRAVADA do paciente = a do 1o abatimento; se ainda nao houver, a atual (este
  -- abatimento sera o 1o e fixa a trava).
  v_cot_lock := COALESCE((SELECT cotacao FROM public.abatimentos_paciente
                           WHERE cpf_paciente = v_cpf ORDER BY created_at ASC LIMIT 1), v_cot);

  -- saldo atual = creditos (nao pagos) x US$ x cotacao TRAVADA - abatimentos ja feitos
  SELECT count(*) INTO v_n
    FROM public.creditos_indicador c
    JOIN public.indicadores i ON i.codigo = c.indicador_codigo
   WHERE i.cpf = v_cpf AND COALESCE(i.tipo,'')='paciente' AND NOT c.pago;
  SELECT COALESCE(sum(valor_brl),0) INTO v_abatido FROM public.abatimentos_paciente WHERE cpf_paciente = v_cpf;
  v_saldo := round(v_n * v_usd * v_cot_lock - v_abatido, 2);
  IF p_valor > v_saldo + 0.01 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Saldo insuficiente (saldo: R$ ' || to_char(v_saldo,'FM999990.00') || ')');
  END IF;

  -- ANUIDADE FUTURA: alem de registrar, ESTENDE a assinatura ativa em +12 meses.
  IF p_tipo = 'anuidade' THEN
    SELECT id INTO v_uid FROM public.profiles WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1;
    IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente nao encontrado'); END IF;
    UPDATE public.assinaturas
       SET data_fim = GREATEST(COALESCE(data_fim, now()), now()) + interval '12 months', updated_at = now()
     WHERE user_id = v_uid AND status = 'ativa';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente sem assinatura ativa para estender'); END IF;
  END IF;

  INSERT INTO public.abatimentos_paciente (cpf_paciente, tipo, valor_brl, cotacao, obs)
  VALUES (v_cpf, p_tipo, round(p_valor,2), v_cot_lock, NULLIF(btrim(coalesce(p_obs,'')),''));
  RETURN jsonb_build_object('ok', true, 'saldo_novo', round(v_saldo - p_valor, 2));
END; $$;

-- 3) caixa_extrato: ramo PACIENTE usa a cotacao travada no saldo ----------------------
CREATE OR REPLACE FUNCTION public.caixa_extrato(p_token text, p_papel text, p_chave text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_usd numeric; v_usd_av numeric; v_cot numeric; v_cot_lock numeric; v_nome text; v_pix text;
  v_l1 jsonb; v_l2 jsonb; v_ab jsonb; v_cpf text; v_cod text; v_n int; v_abatido numeric;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd    := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_usd_av := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_nao_afiliado'), 15);
  v_cot    := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);

  IF p_papel = 'medico' THEN
    SELECT nome, pix_chave INTO v_nome, v_pix FROM public.medicos WHERE crm = p_chave;
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', created_at, 'cpf', '…'||right(regexp_replace(cpf_paciente,'\D','','g'),3),
        'elegivel', elegivel, 'pago', pago, 'data_pagamento', data_pagamento,
        'valor_usd', COALESCE(valor_usd, v_usd), 'valor_brl', valor_brl,
        'nf_emitida', nf_emitida, 'nf_numero', nf_numero
      ) ORDER BY created_at DESC), '[]'::jsonb) INTO v_l1
      FROM public.creditos_medico WHERE medico_crm = p_chave;
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', created_at, 'cpf', '…'||right(regexp_replace(cpf_paciente,'\D','','g'),3),
        'elegivel', elegivel, 'pago', pago, 'data_pagamento', data_pagamento,
        'valor_usd', COALESCE(valor_usd, v_usd_av), 'valor_brl', valor_brl,
        'nf_emitida', nf_emitida, 'nf_numero', nf_numero
      ) ORDER BY created_at DESC), '[]'::jsonb) INTO v_l2
      FROM public.creditos_avaliacao WHERE medico_crm = p_chave;
    RETURN jsonb_build_object('ok', true, 'papel', 'medico', 'chave', p_chave, 'nome', v_nome, 'pix', v_pix,
      'encaminhamentos', v_l1, 'avaliacoes', v_l2, 'usd_enc', v_usd, 'usd_av', v_usd_av, 'cotacao', v_cot);
  END IF;

  IF p_papel = 'indicador' THEN
    SELECT nome, COALESCE(NULLIF(pix_chave,''), usdc_wallet), cpf INTO v_nome, v_pix, v_cpf
      FROM public.indicadores WHERE codigo = p_chave;
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', created_at, 'cpf', '…'||right(regexp_replace(cpf_paciente,'\D','','g'),3),
        'pago', pago, 'data_pagamento', data_pagamento,
        'valor_usd', COALESCE(valor_usd, v_usd), 'valor_brl', valor_brl,
        'nf_emitida', nf_emitida, 'nf_numero', nf_numero
      ) ORDER BY created_at DESC), '[]'::jsonb) INTO v_l1
      FROM public.creditos_indicador WHERE indicador_codigo = p_chave;
    RETURN jsonb_build_object('ok', true, 'papel', 'indicador', 'chave', p_chave, 'nome', v_nome, 'pix', v_pix,
      'creditos', v_l1, 'usd', v_usd, 'cotacao', v_cot);
  END IF;

  IF p_papel = 'paciente' THEN
    v_cpf := regexp_replace(coalesce(p_chave,''), '\D', '', 'g');
    SELECT codigo, nome INTO v_cod, v_nome FROM public.indicadores
      WHERE cpf = v_cpf AND COALESCE(tipo,'')='paciente' LIMIT 1;
    IF v_nome IS NULL THEN SELECT nome INTO v_nome FROM public.profiles WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1; END IF;
    -- Cotacao travada (1o abatimento); antes de qualquer abatimento, a atual.
    v_cot_lock := COALESCE((SELECT cotacao FROM public.abatimentos_paciente
                             WHERE cpf_paciente = v_cpf ORDER BY created_at ASC LIMIT 1), v_cot);
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', c.created_at, 'cpf', '…'||right(regexp_replace(c.cpf_paciente,'\D','','g'),3),
        'pago', c.pago
      ) ORDER BY c.created_at DESC), '[]'::jsonb), count(*) FILTER (WHERE NOT c.pago) INTO v_l1, v_n
      FROM public.creditos_indicador c WHERE c.indicador_codigo = v_cod;
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', created_at, 'tipo', tipo, 'valor_brl', valor_brl, 'obs', obs
      ) ORDER BY created_at DESC), '[]'::jsonb), COALESCE(sum(valor_brl),0) INTO v_ab, v_abatido
      FROM public.abatimentos_paciente WHERE cpf_paciente = v_cpf;
    RETURN jsonb_build_object('ok', true, 'papel', 'paciente', 'chave', v_cpf, 'nome', v_nome, 'codigo', v_cod,
      'creditos', v_l1, 'abatimentos', v_ab,
      'saldo_brl', round(COALESCE(v_n,0)*v_usd*v_cot_lock - v_abatido, 2), 'usd', v_usd, 'cotacao', v_cot_lock);
  END IF;

  RETURN jsonb_build_object('ok', false, 'erro', 'Papel invalido');
END; $$;

GRANT EXECUTE ON FUNCTION public.caixa_a_pagar(text)                            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_abater(text, text, text, numeric, text)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_extrato(text, text, text)                TO anon, authenticated;
