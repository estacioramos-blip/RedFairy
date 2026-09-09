-- ============================================================================
-- migrate_cfm_r3_credito_so_abate.sql   (RODAR 3º — depois de R1 e R2)
--
-- REESTRUTURAÇÃO ÉTICO-REGULATÓRIA — 09/09/2026. Motivo completo no cabeçalho
-- de migrate_cfm_r1_valor_avaliacao.sql (CFM 2.336/2023 e CFM 2.170/2017).
--
-- R3: o paciente que indica outro paciente continua acumulando crédito, mas o
-- crédito passa a ser SÓ desconto no uso da própria plataforma — anuidade e
-- documentos. NUNCA vira saque, depósito ou excedente pago em dinheiro.
--
-- É a fronteira que sustenta a reforma: desconto de fidelidade ao próprio
-- cliente é prática comercial comum; dinheiro por paciente trazido é captação
-- de clientela, e o responsável técnico responde por ela.
--
-- O QUE SAI:
--   • `caixa_abater` tipo 'pix' — era o botão PAGAR EXCEDENTE, o único caminho
--     pelo qual o saldo do paciente virava PIX na conta dele
--   • `caixa_pagar_indicador` — a baixa em dinheiro do indicador
--   • as RPCs que gravavam a chave PIX do indicador
--   • a chave `comissao_usd_por_conversao` (perdeu o último leitor)
--
-- O QUE MUDA DE UNIDADE:
--   O crédito era US$ × cotação do dólar. Vira R$ FIXO, lido de
--   `config.credito_indicacao_brl`. Crédito que só abate anuidade em reais não
--   tem por que ser cotado em dólar — e some a dependência da cotação, que já
--   travou a tesouraria quando ficou desatualizada.
--   O valor nasce aqui com o equivalente exato do que valia hoje
--   (comissao_usd_por_conversao × cotacao_dolar), para ninguém perder nada.
--   Depois disso quem manda é o Admin.
--
-- SEM LIMITE E SEM VALIDADE (decisão do Estácio): o crédito acumula e espera.
-- Como nunca vira dinheiro, o risco financeiro de acumular é baixo.
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. A chave nova nasce com o valor equivalente ao de hoje.
-- ---------------------------------------------------------------------------
INSERT INTO public.config (chave, valor)
SELECT 'credito_indicacao_brl',
       to_char(
         COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10)
       * COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0),
         'FM999990.00')
ON CONFLICT (chave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. O núcleo da conta do indicador passa a somar em reais.
--
--    `cotacao` continua no retorno valendo 1 (R$ 1 = R$ 1): é compatibilidade
--    para quem já lia a chave — não há mais conversão de moeda aqui. Idem
--    `usd_unit`, que fica em 0.
--    Saiu também o "congelamento" da cotação pelo abatimento mais antigo: ele
--    existia só para o saldo não oscilar com o dólar entre o abatimento e o
--    pagamento. Sem dólar e sem pagamento, não tem função.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.indicador_conta(p_codigo text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text; v_unit numeric;
  v_vivos int; v_lib int; v_ledger numeric;
BEGIN
  SELECT regexp_replace(coalesce(cpf,''), '\D', '', 'g') INTO v_cpf
    FROM public.indicadores WHERE codigo = p_codigo LIMIT 1;
  IF v_cpf IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Indicador nao encontrado');
  END IF;

  v_unit := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='credito_indicacao_brl'), 0);

  SELECT count(*) FILTER (WHERE public.credito_lastreado(c.assinatura_id)),
         count(*) FILTER (WHERE public.credito_liberado(c.assinatura_id))
    INTO v_vivos, v_lib
    FROM public.creditos_indicador c
   WHERE c.indicador_codigo = p_codigo
     AND NOT COALESCE(c.pago, false)
     AND NOT COALESCE(c.abatido, false);

  SELECT COALESCE(sum(a.valor_brl), 0) INTO v_ledger
    FROM public.abatimentos_paciente a
   WHERE regexp_replace(coalesce(a.cpf_paciente,''), '\D','','g') = v_cpf
     AND a.liquidado_em IS NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'cpf', v_cpf,
    'vivos', v_lib,
    'vivos_total', v_vivos,
    'pendentes', v_vivos - v_lib,
    'usd_unit', 0,          -- legado: o crédito não é mais cotado em dólar
    'cotacao', 1,           -- legado: R$ 1 = R$ 1, não há conversão
    'unit_brl', v_unit,
    'ledger_brl', round(v_ledger, 2),
    'pendente_brl', round((v_vivos - v_lib) * v_unit, 2),
    'saldo_brl', GREATEST(round(v_lib * v_unit - v_ledger, 2), 0)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. ⛔ O CAMINHO DO DINHEIRO FECHA AQUI.
--
--    `caixa_abater` aceitava três tipos. 'pix' significava "paguei o excedente
--    do saldo na conta do paciente" — era literalmente o saque. Sai.
--    Sobram 'anuidade' (estende a assinatura +12 meses) e 'documento'.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.caixa_abater(
  p_token text, p_cpf text, p_tipo text, p_valor numeric, p_obs text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_cod text; v_c jsonb; v_saldo numeric; v_uid uuid; v_ass uuid; v_rows int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  -- (R3) 'pix' saiu: crédito de indicação NUNCA vira dinheiro na conta.
  IF p_tipo NOT IN ('anuidade','documento') THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Tipo invalido. O credito de indicacao so abate ANUIDADE ou DOCUMENTO — nao existe pagamento em dinheiro.');
  END IF;
  IF coalesce(p_valor,0) <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Valor invalido'); END IF;

  SELECT codigo INTO v_cod FROM public.indicadores
   WHERE regexp_replace(coalesce(cpf,''), '\D','','g') = v_cpf
     AND COALESCE(tipo,'') = 'paciente' LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente nao e indicador'); END IF;

  PERFORM pg_advisory_xact_lock(hashtext('indic:' || v_cod));

  v_c     := public.indicador_conta(v_cod);
  v_saldo := (v_c->>'saldo_brl')::numeric;
  IF (v_c->>'unit_brl')::numeric <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Valor do credito de indicacao nao configurado (Admin > Configuracoes)');
  END IF;

  IF p_valor > v_saldo + 0.01 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Saldo insuficiente (saldo: R$ ' || to_char(v_saldo,'FM999990.00') || ')');
  END IF;

  IF p_tipo = 'anuidade' THEN
    SELECT id INTO v_uid FROM public.profiles WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1;
    IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente nao encontrado'); END IF;

    SELECT a.id INTO v_ass FROM public.assinaturas a
     WHERE a.user_id = v_uid AND a.status = 'ativa'
     ORDER BY (a.data_fim IS NULL OR a.data_fim >= now()) DESC, a.data_fim DESC NULLS LAST
     LIMIT 1;
    IF v_ass IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente sem assinatura ativa para estender'); END IF;

    UPDATE public.assinaturas
       SET data_fim = GREATEST(COALESCE(data_fim, now()), now()) + interval '12 months', updated_at = now()
     WHERE id = v_ass;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Nao foi possivel estender a assinatura'); END IF;
  END IF;

  INSERT INTO public.abatimentos_paciente (cpf_paciente, tipo, valor_brl, cotacao, obs)
  VALUES (v_cpf, p_tipo, round(p_valor,2), 1, NULLIF(btrim(coalesce(p_obs,'')),''));
  RETURN jsonb_build_object('ok', true, 'saldo_novo', round(v_saldo - p_valor, 2));
END;
$$;

-- A baixa em dinheiro do indicador deixa de existir. Não há a quem pagar:
-- o paciente-indicador abate, e o indicador leigo (R4) não recebe nada.
DROP FUNCTION IF EXISTS public.caixa_pagar_indicador(text, text);

-- `admin_liquidar_indicador` era um stub que recusava a baixa e mandava usar
-- `caixa_pagar_indicador` — que acabou de sumir. Um stub apontando para função
-- inexistente é pior que nenhum: manda o operador procurar o que não há.
-- (Nenhuma tela chama estes dois; ficaram do tempo em que a baixa vivia no Admin.)
DROP FUNCTION IF EXISTS public.admin_liquidar_indicador(text, text, text);

CREATE OR REPLACE FUNCTION public.admin_liquidar_comissao(p_crm text, p_token text, p_medico_crm text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN jsonb_build_object('ok', false, 'erro',
    'Pagamento de AVALIACAO e feito apenas no CAIXA (Tesouraria), que confere validacao e congela os valores. Use caixa_pagar_medico. Indicacao nao gera pagamento a ninguem.');
END;
$$;

-- Ninguém mais grava chave PIX de indicador — não há pagamento a fazer.
-- (As colunas em si caem em R4, junto com as funções que ainda as leem.)
DROP FUNCTION IF EXISTS public.paciente_salvar_pix(text, text, text, text, text, text, boolean, text, text);
DROP FUNCTION IF EXISTS public.salvar_pix_indicador(text, text, text, text);

-- ---------------------------------------------------------------------------
-- 4. Tesouraria — some a fila de pagamento do indicador.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.caixa_a_pagar(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_usd_av numeric; v_cot numeric;
  v_med jsonb; v_pac jsonb; v_anuidade numeric;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_usd_avaliacao'), 15);
  v_cot     := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  v_anuidade:= COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_anuidade'), 200);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'crm', s.crm, 'nome', m.nome, 'pix', m.pix_chave,
      'n_enc', 0, 'n_av', s.n_av,
      'total_usd', s.n_av * v_usd_av
    ) ORDER BY s.crm), '[]'::jsonb) INTO v_med
  FROM (
    SELECT medico_crm AS crm, count(*) AS n_av FROM public.creditos_avaliacao
      WHERE elegivel AND NOT pago GROUP BY medico_crm
  ) s LEFT JOIN public.medicos m ON m.crm = s.crm;

  -- ENCONTRO DE CONTAS (paciente-indicador). Continua, mas agora só para ABATER:
  -- não há mais "excedente a pagar".
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'codigo', i.codigo, 'cpf', i.cpf, 'nome', i.nome,
      'n_creditos',   (k.c->>'vivos')::int,
      'creditos_brl', round(((k.c->>'vivos')::numeric) * ((k.c->>'unit_brl')::numeric), 2),
      'abatido_brl',  (k.c->>'ledger_brl')::numeric,
      'pendente_brl', (k.c->>'pendente_brl')::numeric,
      'saldo_brl',    (k.c->>'saldo_brl')::numeric
    ) ORDER BY i.nome), '[]'::jsonb) INTO v_pac
  FROM public.indicadores i
  CROSS JOIN LATERAL (SELECT public.indicador_conta(i.codigo) AS c) k
  WHERE COALESCE(i.tipo,'') = 'paciente'
    AND ( (k.c->>'vivos')::int > 0 OR (k.c->>'ledger_brl')::numeric > 0 OR (k.c->>'pendente_brl')::numeric > 0 );

  -- `indicadores` continua no retorno, sempre vazio: indicador não recebe.
  RETURN jsonb_build_object('ok', true, 'medicos', v_med, 'indicadores', '[]'::jsonb, 'pacientes', v_pac,
                            'usd_enc', 0, 'usd_av', v_usd_av, 'cotacao', v_cot, 'valor_anuidade', v_anuidade);
END;
$$;

CREATE OR REPLACE FUNCTION public.caixa_pendencias(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_ass jsonb; v_ped jsonb; v_nf jsonb;
  v_med int; v_pac int; v_pagar jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at'), '[]'::jsonb) INTO v_ass FROM (
    SELECT jsonb_build_object(
             'id', a.id, 'cpf', p.cpf, 'nome', p.nome,
             'valor', a.valor_pago, 'created_at', a.created_at,
             'dias', floor(EXTRACT(EPOCH FROM (now() - a.created_at)) / 86400)::int
           ) AS x
      FROM public.assinaturas a
      JOIN public.profiles p ON p.id = a.user_id
     WHERE a.conferido_em IS NULL AND a.status = 'ativa'
  ) s;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'pago_em'), '[]'::jsonb) INTO v_ped FROM (
    SELECT jsonb_build_object(
             'id', d.id, 'cpf', d.cpf, 'nome', d.nome,
             'valor', d.valor_total, 'pago_em', d.pago_em,
             'dias', floor(EXTRACT(EPOCH FROM (now() - COALESCE(d.pago_em, d.created_at))) / 86400)::int
           ) AS x
      FROM public.pedidos_documento d
     WHERE d.conferido_em IS NULL AND d.status = 'pago'
  ) s;

  v_pagar := public.caixa_a_pagar(p_token);
  v_med := COALESCE(jsonb_array_length(v_pagar->'medicos'), 0);
  SELECT count(*)::int INTO v_pac FROM jsonb_array_elements(COALESCE(v_pagar->'pacientes','[]'::jsonb)) e
   WHERE COALESCE((e->>'saldo_brl')::numeric, 0) > 0;

  SELECT jsonb_build_object(
           'medicos',    0,
           'avaliacoes', (SELECT count(*) FROM public.creditos_avaliacao WHERE pago AND NOT COALESCE(nf_emitida,false)),
           'indicador',  0   -- (R3) crédito de indicação não é pago, logo não gera NF
         ) INTO v_nf;

  RETURN jsonb_build_object(
    'ok', true,
    'assinaturas_a_conferir', jsonb_build_object('n', jsonb_array_length(v_ass), 'linhas', v_ass),
    'pedidos_a_conferir',     jsonb_build_object('n', jsonb_array_length(v_ped), 'linhas', v_ped),
    'comissoes_a_pagar',      jsonb_build_object('medicos', v_med, 'indicadores', 0, 'pacientes', v_pac),
    'nf_pendente',            v_nf
  );
END;
$$;

-- Estorno: só existe pagamento de médico para desfazer.
CREATE OR REPLACE FUNCTION public.caixa_estornar(
  p_token text, p_papel text, p_chave text, p_data_pagamento timestamptz, p_motivo text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_nf int := 0; v_n1 int := 0; v_total numeric := 0;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  IF p_papel <> 'medico' THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'So ha estorno de pagamento a MEDICO. Credito de indicacao nunca e pago em dinheiro.');
  END IF;
  IF p_data_pagamento IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Informe o lote (data do pagamento)');
  END IF;

  SELECT count(*) INTO v_nf FROM public.creditos_avaliacao
    WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND COALESCE(nf_emitida,false);
  IF v_nf > 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Esse pagamento ja tem NOTA FISCAL emitida (' || v_nf || ' linha(s)). Estorno automatico bloqueado: cancele a NF primeiro.');
  END IF;

  SELECT COALESCE(sum(valor_brl),0) INTO v_total FROM public.creditos_avaliacao
    WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND pago;

  UPDATE public.creditos_avaliacao
     SET pago = false, data_pagamento = NULL, valor_usd = NULL, cotacao = NULL, valor_brl = NULL
   WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND pago;
  GET DIAGNOSTICS v_n1 = ROW_COUNT;

  IF v_n1 = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhum pagamento encontrado nesse lote (ja estornado?)');
  END IF;

  INSERT INTO public.caixa_estornos (papel, chave, data_pagamento, n_linhas, total_brl, motivo)
  VALUES (p_papel, p_chave, p_data_pagamento, v_n1, v_total, NULLIF(btrim(coalesce(p_motivo,'')), ''));

  RETURN jsonb_build_object('ok', true, 'n_linhas', v_n1, 'total_brl', v_total, 'abatimentos_reabertos', 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.caixa_lotes_pagos(p_token text, p_papel text, p_chave text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  IF p_papel <> 'medico' THEN
    RETURN jsonb_build_object('ok', true, 'lotes', '[]'::jsonb);
  END IF;
  SELECT COALESCE(jsonb_agg(t ORDER BY t.data_pagamento DESC), '[]'::jsonb) INTO v FROM (
    SELECT data_pagamento, count(*) AS n_linhas, sum(COALESCE(valor_brl,0)) AS total_brl,
           bool_or(COALESCE(nf_emitida,false)) AS tem_nf
      FROM public.creditos_avaliacao
     WHERE medico_crm = p_chave AND pago AND data_pagamento IS NOT NULL
     GROUP BY data_pagamento
  ) t;
  RETURN jsonb_build_object('ok', true, 'lotes', v);
END;
$$;

-- NF: só o pagamento ao médico existe.
CREATE OR REPLACE FUNCTION public.caixa_nf(
  p_token text, p_tabela text, p_id text, p_emitida boolean, p_numero text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  IF p_tabela NOT IN ('assinaturas','pedidos_documento','creditos_avaliacao') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Tabela invalida');
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET nf_emitida=$1, nf_numero=$2, nf_data=CASE WHEN $1 THEN COALESCE(nf_data, current_date) ELSE NULL END WHERE id::text = $3',
    p_tabela) USING p_emitida, NULLIF(btrim(coalesce(p_numero,'')),''), p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.caixa_relatorio_nf(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_rec jsonb; v_pag jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  SELECT jsonb_build_object(
    'com_nf_n',  count(*) FILTER (WHERE nf_emitida),
    'com_nf_brl', COALESCE(sum(valor) FILTER (WHERE nf_emitida), 0),
    'sem_nf_n',  count(*) FILTER (WHERE NOT nf_emitida),
    'sem_nf_brl', COALESCE(sum(valor) FILTER (WHERE NOT nf_emitida), 0)
  ) INTO v_rec FROM (
    SELECT nf_emitida, COALESCE(valor_pago, 0) AS valor FROM public.assinaturas WHERE status = 'ativa'
    UNION ALL
    SELECT nf_emitida, COALESCE(valor_total, 0) FROM public.pedidos_documento WHERE pago_em IS NOT NULL
  ) r;
  SELECT jsonb_build_object(
    'com_nf_n',  count(*) FILTER (WHERE nf_emitida),
    'com_nf_brl', COALESCE(sum(valor) FILTER (WHERE nf_emitida), 0),
    'sem_nf_n',  count(*) FILTER (WHERE NOT nf_emitida),
    'sem_nf_brl', COALESCE(sum(valor) FILTER (WHERE NOT nf_emitida), 0)
  ) INTO v_pag FROM (
    SELECT nf_emitida, COALESCE(valor_brl, 0) AS valor FROM public.creditos_avaliacao WHERE pago
  ) p;
  RETURN jsonb_build_object('ok', true, 'recebimentos', v_rec, 'pagamentos', v_pag);
END;
$$;

-- Extrato: o papel 'indicador' perde a chave PIX e os valores em dólar.
CREATE OR REPLACE FUNCTION public.caixa_extrato(p_token text, p_papel text, p_chave text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_usd_av numeric; v_cot numeric; v_nome text; v_pix text;
  v_l1 jsonb; v_ab jsonb; v_cpf text; v_cod text; v_c jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd_av := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_usd_avaliacao'), 15);
  v_cot    := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);

  IF p_papel = 'medico' THEN
    SELECT nome, pix_chave INTO v_nome, v_pix FROM public.medicos WHERE crm = p_chave;
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', created_at, 'cpf', '…'||right(regexp_replace(cpf_paciente,'\D','','g'),3),
        'elegivel', elegivel, 'pago', pago, 'data_pagamento', data_pagamento,
        'valor_usd', COALESCE(valor_usd, v_usd_av), 'valor_brl', valor_brl,
        'nf_emitida', nf_emitida, 'nf_numero', nf_numero
      ) ORDER BY created_at DESC), '[]'::jsonb) INTO v_l1
      FROM public.creditos_avaliacao WHERE medico_crm = p_chave;
    RETURN jsonb_build_object('ok', true, 'papel', 'medico', 'chave', p_chave, 'nome', v_nome, 'pix', v_pix,
      'encaminhamentos', '[]'::jsonb, 'avaliacoes', v_l1, 'usd_enc', 0, 'usd_av', v_usd_av, 'cotacao', v_cot);
  END IF;

  IF p_papel = 'indicador' THEN
    SELECT nome, cpf INTO v_nome, v_cpf FROM public.indicadores WHERE codigo = p_chave;
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', created_at, 'cpf', '…'||right(regexp_replace(cpf_paciente,'\D','','g'),3),
        'pago', false, 'abatido', COALESCE(abatido,false)
      ) ORDER BY created_at DESC), '[]'::jsonb) INTO v_l1
      FROM public.creditos_indicador WHERE indicador_codigo = p_chave;
    RETURN jsonb_build_object('ok', true, 'papel', 'indicador', 'chave', p_chave, 'nome', v_nome, 'pix', NULL,
      'creditos', v_l1, 'usd', 0, 'cotacao', 1);
  END IF;

  IF p_papel = 'paciente' THEN
    v_cpf := regexp_replace(coalesce(p_chave,''), '\D', '', 'g');
    SELECT codigo, nome INTO v_cod, v_nome FROM public.indicadores
      WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf AND COALESCE(tipo,'')='paciente' LIMIT 1;
    IF v_nome IS NULL THEN SELECT nome INTO v_nome FROM public.profiles WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1; END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', c.created_at, 'cpf', '…'||right(regexp_replace(c.cpf_paciente,'\D','','g'),3),
        'pago', false, 'abatido', COALESCE(c.abatido,false)
      ) ORDER BY c.created_at DESC), '[]'::jsonb) INTO v_l1
      FROM public.creditos_indicador c WHERE c.indicador_codigo = v_cod;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', created_at, 'tipo', tipo, 'valor_brl', valor_brl, 'obs', obs,
        'liquidado', (liquidado_em IS NOT NULL)
      ) ORDER BY created_at DESC), '[]'::jsonb) INTO v_ab
      FROM public.abatimentos_paciente
     WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf;

    v_c := CASE WHEN v_cod IS NULL THEN NULL ELSE public.indicador_conta(v_cod) END;

    RETURN jsonb_build_object('ok', true, 'papel', 'paciente', 'chave', v_cpf, 'nome', v_nome, 'codigo', v_cod,
      'creditos', v_l1, 'abatimentos', v_ab,
      'saldo_brl', COALESCE((v_c->>'saldo_brl')::numeric, 0),
      'usd', 0, 'cotacao', 1);
  END IF;

  RETURN jsonb_build_object('ok', false, 'erro', 'Papel invalido');
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Admin — a lista de indicadores fala em reais e sem chave de pagamento.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_listar_indicadores(p_crm text, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE resultado jsonb; v_brl numeric;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  v_brl := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'credito_indicacao_brl'), 0);

  WITH
  cred AS (
    SELECT indicador_codigo AS codigo,
           count(*) FILTER (WHERE NOT COALESCE(abatido,false)) AS pendentes,
           count(*) FILTER (WHERE COALESCE(abatido,false))     AS usados
      FROM public.creditos_indicador GROUP BY indicador_codigo
  ),
  pre AS (
    SELECT indicador_codigo AS codigo, count(*) AS n
      FROM public.indicacoes_precadastro GROUP BY indicador_codigo
  )
  SELECT jsonb_build_object(
    'ok', true,
    'credito_brl', v_brl,
    'indicadores', COALESCE(jsonb_agg(jsonb_build_object(
      'id',                 i.id,
      'codigo',             i.codigo,
      'nome',               i.nome,
      'cpf',                i.cpf,
      'celular',            i.celular,
      'tipo',               i.tipo,
      'ativo',              i.ativo,
      'reservados',         COALESCE(p.n, 0),
      -- (R3) "a pagar" não existe mais: crédito só abate uso da plataforma.
      'creditos_a_usar',    COALESCE(c.pendentes, 0),
      'creditos_usados',    COALESCE(c.usados, 0)
    ) ORDER BY COALESCE(c.pendentes, 0) DESC, i.created_at DESC), '[]'::jsonb)
  )
  INTO resultado
  FROM public.indicadores i
  LEFT JOIN cred c ON c.codigo = i.codigo
  LEFT JOIN pre  p ON p.codigo = i.codigo;

  RETURN resultado;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. O gatilho para de falar em dólar na mensagem da ADM.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_credita_indicacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text; v_ind text; v_rows int;
  v_nome text; v_brl numeric; v_cpfd text; v_msg text;
BEGIN
  IF NEW.status <> 'ativa' THEN RETURN NEW; END IF;
  SELECT cpf INTO v_cpf FROM public.profiles WHERE id = NEW.user_id;
  IF v_cpf IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM public.creditos_indicador WHERE cpf_paciente = v_cpf) THEN
    RETURN NEW;
  END IF;

  SELECT indicador_codigo INTO v_ind FROM public.indicacoes_precadastro
    WHERE cpf_paciente = v_cpf AND confirmado = true
    ORDER BY created_at DESC LIMIT 1;
  IF v_ind IS NULL OR btrim(v_ind) = '' THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_ind) THEN RETURN NEW; END IF;

  v_brl := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'credito_indicacao_brl'), 0);
  v_cpfd := regexp_replace(coalesce(v_cpf,''), '\D', '', 'g');
  v_cpfd := CASE WHEN length(v_cpfd) = 11
                 THEN '***.' || substr(v_cpfd,4,3) || '.' || substr(v_cpfd,7,3) || '-**'
                 ELSE coalesce(v_cpf,'-') END;

  INSERT INTO public.creditos_indicador (indicador_codigo, cpf_paciente, assinatura_id, elegivel)
  VALUES (v_ind, v_cpf, NEW.id, true)
  ON CONFLICT (cpf_paciente) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN NEW; END IF;

  SELECT nome INTO v_nome FROM public.indicadores WHERE codigo = v_ind;
  v_msg := '🤝 Nova indicação confirmada!' || E'\n' ||
           'Indicador: ' || COALESCE(NULLIF(v_nome,''), v_ind) || ' (' || v_ind || ')' || E'\n' ||
           'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
           'Crédito de R$ ' || to_char(v_brl, 'FM999990.00') ||
           ' para ABATER anuidade/documentos. NÃO é pagamento em dinheiro.';
  PERFORM public.tg_enviar(v_msg);
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. A chave em dólar da conversão perdeu o último leitor.
-- ---------------------------------------------------------------------------
DELETE FROM public.config WHERE chave = 'comissao_usd_por_conversao';

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO
--   SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prosrc LIKE '%comissao_usd_por_conversao%';
--   -- espera: 0 linhas
--
--   SELECT public.caixa_abater('<token>', '<cpf>', 'pix', 10, NULL);
--   -- espera: ok=false, "Tipo invalido..."
--
--   SELECT to_regprocedure('public.caixa_pagar_indicador(text,text)');   -- NULL
--   SELECT to_regprocedure('public.paciente_salvar_pix(text,text,text,text,text,text,boolean,text,text)'); -- NULL
--   SELECT chave, valor FROM public.config WHERE chave='credito_indicacao_brl';
-- ---------------------------------------------------------------------------
