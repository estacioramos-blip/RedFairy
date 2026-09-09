-- ============================================================================
-- migrate_cfm_r1_valor_avaliacao.sql   (RODAR 1º — antes de R2, R3 e R4)
--
-- REESTRUTURAÇÃO ÉTICO-REGULATÓRIA DO PROGRAMA DE INDICAÇÃO — 09/09/2026
--
-- MOTIVO (não reverter sem ler): o médico responsável técnico responde perante
-- o CFM/CRM pelo mecanismo de incentivo da plataforma, MESMO quando quem recebe
-- é leigo. Resolução CFM 2.336/2023 e Resolução CFM 2.170/2017 (captação de
-- clientela). O princípio que passa a valer:
--
--     PAGAR POR TRABALHO MÉDICO FEITO  →  permitido
--     DAR DESCONTO POR FIDELIDADE      →  permitido
--     PAGAR POR PACIENTE TRAZIDO       →  NÃO
--
-- R1 (esta migration): o médico que AVALIA um paciente continua recebendo em
-- dólar digital. É remuneração por trabalho prestado — a única forma de
-- pagamento que sobrevive à reforma. NADA muda no gatilho, no valor ou no
-- fluxo: esta migration só CORRIGE O NOME DA CHAVE.
--
-- Por que renomear: a chave chamava-se `comissao_usd_nao_afiliado` e foi
-- REPROPOSITADA em jun/2026 (migrate_medico_avaliar.sql) para ser o valor do
-- AVALIAR. O nome ficou mentindo sobre o uso, e em jun/2026 isso já causou um
-- bug real: `admin_listar_indicadores` lia a chave errada confiando no rótulo.
-- Agora que a outra chave (`comissao_usd_por_conversao`) vai desaparecer em R2,
-- deixar um nome enganoso para trás seria plantar o mesmo bug de novo.
--
--     comissao_usd_nao_afiliado  →  valor_usd_avaliacao
--
-- Sem dado a migrar (0 linhas em todas as tabelas de crédito) e sem mudança de
-- comportamento: mesmo valor, mesmos leitores, mesmo momento de crédito.
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. A chave nova nasce com o valor que a antiga tinha (não com um default
--    escrito aqui: número em código envelhece calado).
-- ---------------------------------------------------------------------------
INSERT INTO public.config (chave, valor)
SELECT 'valor_usd_avaliacao', valor
  FROM public.config WHERE chave = 'comissao_usd_nao_afiliado'
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

-- Se por algum motivo a antiga não existir, garante a nova com o default
-- histórico (15) — mesmo COALESCE que as funções já usavam.
INSERT INTO public.config (chave, valor)
SELECT 'valor_usd_avaliacao', '15'
 WHERE NOT EXISTS (SELECT 1 FROM public.config WHERE chave = 'valor_usd_avaliacao');

-- ---------------------------------------------------------------------------
-- 2. Os cinco leitores da chave passam a ler o nome novo.
--    (medico_avaliar_paciente · caixa_pagar_medico · caixa_a_pagar ·
--     listar_creditos_medico · caixa_extrato)
--    Corpos reproduzidos integralmente: só a linha do COALESCE muda.
-- ---------------------------------------------------------------------------

-- 2.1 — R1: credita o médico por AVALIAR, NA HORA da avaliação.
-- ⚠ O crédito NÃO depende de o paciente assinar: é trabalho médico prestado.
-- (O popup do app dizia "AVALIA e que se CADASTRA" — o texto é que estava
--  errado, e sai nesta reforma. O motor sempre creditou no ato.)
CREATE OR REPLACE FUNCTION public.medico_avaliar_paciente(
  p_crm text, p_token text, p_cpf text, p_opiniao text, p_sugestao text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text; v_crm text; v_usd numeric; v_cot numeric;
  v_nome text; v_pix text; v_rows int; v_cpfd text; v_msg text; v_novo boolean := false;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  v_crm := upper(btrim(coalesce(p_crm,'')));
  v_cpf := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT public.paciente_existe(v_cpf) THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Este CPF nao tem cadastro no sistema. O paciente precisa se cadastrar antes de ser avaliado.');
  END IF;

  -- (R1) nome novo da chave. Era comissao_usd_nao_afiliado.
  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'valor_usd_avaliacao'), 15);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);

  INSERT INTO public.creditos_avaliacao (medico_crm, cpf_paciente, valor, elegivel)
  VALUES (v_crm, v_cpf, v_usd::int, true)
  ON CONFLICT (medico_crm, cpf_paciente) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_novo := (v_rows > 0);

  IF coalesce(btrim(p_opiniao),'') <> '' THEN
    INSERT INTO public.opiniao_medica (cpf_paciente, medico_crm, texto, created_at)
    VALUES (v_cpf, v_crm, btrim(p_opiniao), now())
    ON CONFLICT (cpf_paciente) DO UPDATE
      SET texto = EXCLUDED.texto, medico_crm = EXCLUDED.medico_crm, created_at = now();
  END IF;

  v_cpfd := '***.' || substr(v_cpf,4,3) || '.' || substr(v_cpf,7,3) || '-**';

  IF v_novo THEN
    SELECT nome, pix_chave INTO v_nome, v_pix FROM public.medicos WHERE crm = v_crm;
    v_msg := '🩺 Nova AVALIAÇÃO médica!' || E'\n' ||
             'Médico: ' || COALESCE(NULLIF(v_nome,''), v_crm) || ' (CRM ' || v_crm || ')' || E'\n' ||
             'Avaliou o paciente ' || v_cpfd || '.' || E'\n' ||
             'Pagar: US$ ' || to_char(v_usd, 'FM999990.00') ||
             CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
             'PIX: ' || COALESCE(NULLIF(v_pix,''), '(médico sem chave PIX cadastrada)');
    PERFORM public.tg_enviar(v_msg);
  END IF;

  IF coalesce(btrim(p_sugestao),'') <> '' THEN
    PERFORM public.tg_enviar('💡 SUGESTÃO DE MELHORIA (CRM ' || v_crm || ', paciente ' || v_cpfd || '):' || E'\n' || btrim(p_sugestao));
  END IF;

  RETURN jsonb_build_object('ok', true, 'credito_novo', v_novo, 'valor_usd', v_usd);
END;
$$;

-- 2.2 — Baixa do médico no Caixa (ainda paga encaminhamento nesta etapa; R2 tira).
CREATE OR REPLACE FUNCTION public.caixa_pagar_medico(p_token text, p_crm text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_crm text; v_usd_enc numeric; v_usd_av numeric; v_cot numeric; v_n1 int; v_n2 int; v_val boolean; v_pend int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;

  v_crm := upper(btrim(coalesce(p_crm,'')));

  SELECT validado INTO v_val FROM public.medicos WHERE crm = v_crm;
  IF v_val IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Medico ainda nao validado. Peca a selfie com a carteira profissional pelo WhatsApp e valide em Admin > Medicos antes de pagar.');
  END IF;

  v_usd_enc := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_usd_avaliacao'), 15);
  v_cot     := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;

  UPDATE public.creditos_medico
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_enc, cotacao=v_cot, valor_brl=round(v_usd_enc*v_cot,2)
   WHERE upper(btrim(medico_crm)) = v_crm AND elegivel AND NOT pago
     AND public.credito_liberado(assinatura_id);
  GET DIAGNOSTICS v_n1 = ROW_COUNT;

  UPDATE public.creditos_avaliacao
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_av, cotacao=v_cot, valor_brl=round(v_usd_av*v_cot,2)
   WHERE upper(btrim(medico_crm)) = v_crm AND elegivel AND NOT pago;
  GET DIAGNOSTICS v_n2 = ROW_COUNT;

  IF (v_n1 + v_n2) = 0 THEN
    SELECT count(*) INTO v_pend FROM public.creditos_medico
     WHERE upper(btrim(medico_crm)) = v_crm AND elegivel AND NOT pago
       AND public.credito_lastreado(assinatura_id)
       AND NOT public.credito_liberado(assinatura_id);
    RETURN jsonb_build_object('ok', false, 'erro',
      CASE WHEN v_pend > 0
        THEN v_pend || ' credito(s) aguardando a confirmacao do PIX da assinatura (aba Pendencias).'
        ELSE 'Nenhum credito elegivel e lastreado para este CRM. Confira a aba A PAGAR.' END);
  END IF;

  RETURN jsonb_build_object('ok', true, 'n_enc', v_n1, 'n_av', v_n2,
    'total_brl', round((v_n1*v_usd_enc + v_n2*v_usd_av)*v_cot, 2), 'cotacao', v_cot);
END;
$$;

-- 2.3 — Fila de pagamento do Caixa.
CREATE OR REPLACE FUNCTION public.caixa_a_pagar(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_usd_enc numeric; v_usd_av numeric; v_cot numeric;
  v_med jsonb; v_ind jsonb; v_pac jsonb; v_anuidade numeric;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd_enc := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_usd_avaliacao'), 15);
  v_cot     := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  v_anuidade:= COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_anuidade'), 200);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'crm', s.crm, 'nome', m.nome, 'pix', m.pix_chave,
      'n_enc', s.n_enc, 'n_av', s.n_av,
      'total_usd', s.n_enc * v_usd_enc + s.n_av * v_usd_av
    ) ORDER BY s.crm), '[]'::jsonb) INTO v_med
  FROM (
    SELECT crm, sum(n_enc) AS n_enc, sum(n_av) AS n_av FROM (
      SELECT medico_crm AS crm, count(*) AS n_enc, 0 AS n_av FROM public.creditos_medico
        WHERE elegivel AND NOT pago
          AND public.credito_liberado(assinatura_id)
        GROUP BY medico_crm
      UNION ALL
      SELECT medico_crm, 0, count(*) FROM public.creditos_avaliacao
        WHERE elegivel AND NOT pago GROUP BY medico_crm
    ) u GROUP BY crm
  ) s LEFT JOIN public.medicos m ON m.crm = s.crm;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'codigo', s.codigo, 'nome', i.nome, 'pix', COALESCE(NULLIF(i.pix_chave,''), i.usdc_wallet),
      'titular', i.pix_titular, 'n', s.n, 'total_usd', s.n * v_usd_enc
    ) ORDER BY s.codigo), '[]'::jsonb) INTO v_ind
  FROM (
    SELECT c.indicador_codigo AS codigo, count(*) AS n
      FROM public.creditos_indicador c
      JOIN public.indicadores i2 ON i2.codigo = c.indicador_codigo
     WHERE NOT c.pago AND NOT COALESCE(c.abatido, false)
       AND public.credito_liberado(c.assinatura_id)
       AND COALESCE(i2.tipo,'') <> 'paciente'
     GROUP BY c.indicador_codigo
  ) s JOIN public.indicadores i ON i.codigo = s.codigo;

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

  RETURN jsonb_build_object('ok', true, 'medicos', v_med, 'indicadores', v_ind, 'pacientes', v_pac,
                            'usd_enc', v_usd_enc, 'usd_av', v_usd_av, 'cotacao', v_cot, 'valor_anuidade', v_anuidade);
END;
$$;

-- 2.4 — Contadores que o médico vê no app.
CREATE OR REPLACE FUNCTION public.listar_creditos_medico(p_crm text, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cad int; v_rec int; v_arec int; v_pend int;
  v_av int; v_av_rec int; v_av_arec int;
  v_usd numeric; v_usd_av numeric; v_cot numeric; v_pix text; v_crm text;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  v_crm := upper(btrim(coalesce(p_crm,'')));

  SELECT count(*),
         count(*) FILTER (WHERE pago),
         count(*) FILTER (WHERE elegivel AND NOT pago),
         count(*) FILTER (WHERE NOT elegivel AND NOT pago)
    INTO v_cad, v_rec, v_arec, v_pend
    FROM public.creditos_medico WHERE medico_crm = v_crm;

  SELECT count(*), count(*) FILTER (WHERE pago), count(*) FILTER (WHERE NOT pago)
    INTO v_av, v_av_rec, v_av_arec
    FROM public.creditos_avaliacao WHERE medico_crm = v_crm;

  v_usd    := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  v_usd_av := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'valor_usd_avaliacao'), 15);
  v_cot    := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);
  SELECT pix_chave INTO v_pix FROM public.medicos WHERE crm = v_crm;

  RETURN jsonb_build_object('ok', true,
    'cadastrados', COALESCE(v_cad,0), 'recebidos', COALESCE(v_rec,0),
    'a_receber', COALESCE(v_arec,0), 'pendentes_elegib', COALESCE(v_pend,0),
    'avaliacoes', COALESCE(v_av,0), 'aval_recebidas', COALESCE(v_av_rec,0),
    'aval_a_receber', COALESCE(v_av_arec,0),
    'valor_usd', v_usd, 'valor_usd_avaliacao', v_usd_av,
    'cotacao', v_cot, 'pix', COALESCE(v_pix,''));
END;
$$;

-- 2.5 — Extrato do Caixa (papel médico lê o valor da avaliação).
CREATE OR REPLACE FUNCTION public.caixa_extrato(p_token text, p_papel text, p_chave text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_usd numeric; v_usd_av numeric; v_cot numeric; v_nome text; v_pix text;
  v_l1 jsonb; v_l2 jsonb; v_ab jsonb; v_cpf text; v_cod text; v_c jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd    := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_usd_av := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_usd_avaliacao'), 15);
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
      WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf AND COALESCE(tipo,'')='paciente' LIMIT 1;
    IF v_nome IS NULL THEN SELECT nome INTO v_nome FROM public.profiles WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1; END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', c.created_at, 'cpf', '…'||right(regexp_replace(c.cpf_paciente,'\D','','g'),3),
        'pago', c.pago, 'abatido', COALESCE(c.abatido,false)
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
      'usd', v_usd,
      'cotacao', COALESCE((v_c->>'cotacao')::numeric, v_cot));
  END IF;

  RETURN jsonb_build_object('ok', false, 'erro', 'Papel invalido');
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. A chave antiga sai. Confira antes que nada mais a lê:
--       (nenhum resultado esperado no grep do repo por comissao_usd_nao_afiliado)
-- ---------------------------------------------------------------------------
DELETE FROM public.config WHERE chave = 'comissao_usd_nao_afiliado';

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO
--   SELECT chave, valor FROM public.config
--    WHERE chave IN ('valor_usd_avaliacao','comissao_usd_nao_afiliado');
--   -- espera: 1 linha, valor_usd_avaliacao
--
--   SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prosrc LIKE '%comissao_usd_nao_afiliado%';
--   -- espera: 0 linhas
-- ---------------------------------------------------------------------------
