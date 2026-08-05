-- ============================================================================
-- migrate_saldo_indicador_unico.sql   (item 1 da auditoria ago/2026)
--
-- PROBLEMA: o crédito do indicador pode ser gasto de TRÊS jeitos, e as regras
-- não enxergam umas às outras.
--
--   (1) `abatido = true`  — vira desconto na anuidade do próprio indicador
--                           (`aplicar_abatimento`).
--   (2) `pago = true`     — sai em dinheiro pelo Caixa
--                           (`caixa_pagar_indicador`).
--   (3) `abatimentos_paciente` — encontro de contas do Caixa (`caixa_abater`):
--       o saldo do indicador abate o que o paciente deve (anuidade estendida,
--       documento). NÃO marca nada em `creditos_indicador` — só grava o valor
--       em reais numa tabela à parte.
--
-- (1) e (2) se excluem corretamente. Mas NINGUÉM além do próprio `caixa_abater`
-- olha para (3). Consequência, com números:
--
--   3 créditos × R$ 50 = R$ 150 ganhos.
--   Caixa abate R$ 100 na anuidade do paciente  →  ledger 100, saldo real 50.
--   Só que os 3 créditos continuam `pago=false, abatido=false`.
--   · `caixa_pagar_indicador` paga os 3 EM DINHEIRO       → R$ 150 (era R$ 50).
--   · `aplicar_abatimento` queima os 3 como desconto      → R$ 150 de novo.
--   · `saldo_indicador` exibe os 3 na vitrine             → promessa de R$ 150.
--   O mesmo crédito é entregue duas vezes.
--
-- Além disso `saldo_indicador` nem sequer exclui `pago`: mostrava como saldo
-- disponível crédito que já tinha saído em dinheiro.
--
-- SOLUÇÃO — UMA fórmula, num lugar só:
--
--     saldo_brl = créditos_vivos × valor_unitário − ledger_em_aberto
--
-- onde `créditos_vivos` = não pago, não abatido e com assinatura lastreada
-- (`credito_lastreado`, do item 2), e `ledger_em_aberto` = a soma dos
-- abatimentos ainda não liquidados. Todas as quatro funções que mexem com esse
-- dinheiro passam a chamar `indicador_conta()` em vez de cada uma calcular o
-- seu próprio saldo com um filtro diferente.
--
-- Por que a coluna `liquidado_em` é necessária: quando o Caixa paga o saldo em
-- dinheiro, ele zera a conta — marca os créditos como `pago` E dá baixa nos
-- lançamentos do ledger que acabaram de ser acertados. Sem essa baixa, o ledger
-- continuaria sendo subtraído para sempre e o saldo ficaria negativo (ou comeria
-- créditos futuros que nada têm a ver com aquele acerto).
--
-- Como as operações que queimam crédito trabalham com linhas inteiras e o
-- ledger trabalha com reais, quem queima uma fração de crédito devolve o troco
-- ao ledger. Assim a conta fecha exatamente, sem sobra nem perda.
--
-- ⚠ NÃO mexi em `creditos_indicador.elegivel`: hoje nenhuma dessas funções o
-- consulta, e passar a consultar poderia travar pagamento legítimo. Fica como
-- está — se tiver significado para o indicador, é decisão à parte.
--
-- Estado do banco ao escrever: 0 créditos, 0 abatimentos. Nada retroativo.
-- Idempotente.
-- ============================================================================

-- ── 0) Baixa dos lançamentos do ledger ───────────────────────────────────────
ALTER TABLE public.abatimentos_paciente
  ADD COLUMN IF NOT EXISTS liquidado_em timestamptz;

COMMENT ON COLUMN public.abatimentos_paciente.liquidado_em IS
  'Quando este abatimento foi acertado num pagamento em dinheiro. Enquanto NULL, continua descontando do saldo do indicador.';


-- ── 1) A conta do indicador — fonte única ────────────────────────────────────
-- Devolve {vivos, unit_brl, ledger_brl, saldo_brl}. A cotação fica TRAVADA pelo
-- primeiro abatimento em aberto: dentro de um mesmo acerto o câmbio não pode
-- mexer debaixo do pé do indicador. Liquidado tudo, o próximo ciclo volta a
-- usar a cotação corrente.
CREATE OR REPLACE FUNCTION public.indicador_conta(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf    text;
  v_usd    numeric;
  v_cot    numeric;
  v_unit   numeric;
  v_vivos  int;
  v_ledger numeric;
BEGIN
  SELECT regexp_replace(coalesce(cpf,''), '\D', '', 'g') INTO v_cpf
    FROM public.indicadores WHERE codigo = p_codigo LIMIT 1;
  IF v_cpf IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Indicador nao encontrado');
  END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);

  -- Cotação travada pelo acerto em aberto, se houver.
  v_cot := COALESCE((SELECT a.cotacao FROM public.abatimentos_paciente a
                      WHERE regexp_replace(coalesce(a.cpf_paciente,''), '\D','','g') = v_cpf
                        AND a.liquidado_em IS NULL
                        AND COALESCE(a.cotacao, 0) > 0
                      ORDER BY a.created_at ASC LIMIT 1), v_cot);
  v_unit := v_usd * v_cot;

  SELECT count(*) INTO v_vivos
    FROM public.creditos_indicador c
   WHERE c.indicador_codigo = p_codigo
     AND NOT COALESCE(c.pago, false)
     AND NOT COALESCE(c.abatido, false)
     AND public.credito_lastreado(c.assinatura_id);

  SELECT COALESCE(sum(a.valor_brl), 0) INTO v_ledger
    FROM public.abatimentos_paciente a
   WHERE regexp_replace(coalesce(a.cpf_paciente,''), '\D','','g') = v_cpf
     AND a.liquidado_em IS NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'cpf', v_cpf,
    'vivos', v_vivos,
    'usd_unit', v_usd,
    'cotacao', v_cot,
    'unit_brl', v_unit,
    'ledger_brl', round(v_ledger, 2),
    -- GREATEST não é para esconder erro: `caixa_abater` recusa abater mais do
    -- que o saldo, então o ledger nunca deveria passar do total. É rede.
    'saldo_brl', GREATEST(round(v_vivos * v_unit - v_ledger, 2), 0)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.indicador_conta(text) TO anon, authenticated;


-- ── 2) Vitrine do saldo ──────────────────────────────────────────────────────
-- Antes: contava `abatido = false` e MAIS NADA — nem excluía `pago`, nem via o
-- ledger. Exibia como disponível dinheiro que já tinha sido entregue.
CREATE OR REPLACE FUNCTION public.saldo_indicador(p_cpf text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := translate(coalesce(p_cpf,''),'.- /()','');
  v_cod text; v_c jsonb;
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT codigo INTO v_cod FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok',true,'qtd',0,'saldo_brl',0); END IF;

  v_c := public.indicador_conta(v_cod);
  RETURN jsonb_build_object(
    'ok', true,
    'qtd',            (v_c->>'vivos')::int,
    'valor_unit_brl', (v_c->>'unit_brl')::numeric,
    'abatido_brl',    (v_c->>'ledger_brl')::numeric,
    'saldo_brl',      (v_c->>'saldo_brl')::numeric
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.saldo_indicador(text) TO anon, authenticated;


-- ── 3) Desconto na anuidade ──────────────────────────────────────────────────
-- Antes calculava quantos créditos cabiam na anuidade e queimava direto,
-- ignorando o que o Caixa já tinha abatido. Agora parte do saldo REAL.
-- O troco (fração de crédito que sobra) volta para o ledger, senão a conta não
-- fecha: queimar 1 crédito de R$ 50 para dar R$ 40 de desconto perderia R$ 10.
CREATE OR REPLACE FUNCTION public.aplicar_abatimento(p_cpf text, p_anuidade_brl numeric, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf   text := translate(coalesce(p_cpf,''),'.- /()','');
  v_cod   text; v_c jsonb; v_unit numeric; v_saldo numeric;
  v_desc  numeric; v_queimar int; v_troco numeric; v_ids bigint[]; v_usados int;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok',false,'erro','Nao autorizado','a_pagar_brl',p_anuidade_brl);
  END IF;
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok',false,'a_pagar_brl',p_anuidade_brl); END IF;
  SELECT codigo INTO v_cod FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok',true,'desconto_brl',0,'a_pagar_brl',p_anuidade_brl,'usados',0); END IF;

  -- Serializa por indicador. Sem isto, duas chamadas simultâneas (duplo clique
  -- do paciente, ou paciente e Caixa ao mesmo tempo) leem o MESMO saldo antes
  -- de qualquer commit, escolhem os MESMOS créditos e cada uma acha que
  -- consumiu os seus — dois descontos, um crédito só. Trava por chave, não a
  -- tabela inteira, e cai sozinha no fim da transação.
  PERFORM pg_advisory_xact_lock(hashtext('indic:' || v_cod));

  v_c     := public.indicador_conta(v_cod);
  v_unit  := (v_c->>'unit_brl')::numeric;
  v_saldo := (v_c->>'saldo_brl')::numeric;
  IF v_unit <= 0 OR v_saldo <= 0 THEN
    RETURN jsonb_build_object('ok',true,'desconto_brl',0,'a_pagar_brl',p_anuidade_brl,'usados',0);
  END IF;

  v_desc    := LEAST(v_saldo, GREATEST(coalesce(p_anuidade_brl,0), 0));
  IF v_desc <= 0 THEN
    RETURN jsonb_build_object('ok',true,'desconto_brl',0,'a_pagar_brl',p_anuidade_brl,'usados',0);
  END IF;
  v_queimar := floor(v_desc / v_unit);
  v_troco   := round(v_desc - v_queimar * v_unit, 2);

  IF v_queimar > 0 THEN
    SELECT array_agg(id) INTO v_ids FROM (
      SELECT c.id FROM public.creditos_indicador c
       WHERE c.indicador_codigo = v_cod
         AND NOT COALESCE(c.pago, false)
         AND NOT COALESCE(c.abatido, false)
         AND public.credito_lastreado(c.assinatura_id)
       ORDER BY c.created_at ASC LIMIT v_queimar
    ) s;
    v_usados := COALESCE(array_length(v_ids,1), 0);
    IF v_usados > 0 THEN
      UPDATE public.creditos_indicador SET abatido = true, abatido_em = now() WHERE id = ANY(v_ids);
    END IF;
  ELSE
    v_usados := 0;
  END IF;

  -- Troco vira lançamento no ledger: R$ consumidos que não fecharam um crédito
  -- inteiro. Sem isto, a diferença sumiria a favor da plataforma.
  IF v_troco > 0 THEN
    INSERT INTO public.abatimentos_paciente (cpf_paciente, tipo, valor_brl, cotacao, obs)
    VALUES (v_cpf, 'anuidade', v_troco, (v_c->>'cotacao')::numeric, 'troco do desconto de anuidade');
  END IF;

  RETURN jsonb_build_object('ok',true,
    'desconto_brl', v_desc,
    'a_pagar_brl',  GREATEST(round(coalesce(p_anuidade_brl,0) - v_desc, 2), 0),
    'usados',       v_usados);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.aplicar_abatimento(text, numeric, text) TO anon, authenticated;


-- ── 4) Pagamento em dinheiro pelo Caixa ──────────────────────────────────────
-- Antes pagava `n × US$ × cotação` por crédito vivo, sem descontar o que já
-- tinha sido entregue como abatimento. Agora paga o SALDO e, ao zerar a conta,
-- dá baixa nos lançamentos do ledger — senão eles continuariam descontando de
-- créditos futuros que nada têm a ver com este acerto.
CREATE OR REPLACE FUNCTION public.caixa_pagar_indicador(p_token text, p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_c jsonb; v_usd numeric; v_cot numeric; v_saldo numeric; v_ledger numeric; v_n int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;

  PERFORM pg_advisory_xact_lock(hashtext('indic:' || p_codigo));   -- ver aplicar_abatimento

  v_c := public.indicador_conta(p_codigo);
  IF NOT COALESCE((v_c->>'ok')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'erro', COALESCE(v_c->>'erro','Indicador nao encontrado'));
  END IF;
  v_usd    := (v_c->>'usd_unit')::numeric;
  v_cot    := (v_c->>'cotacao')::numeric;
  v_saldo  := (v_c->>'saldo_brl')::numeric;
  v_ledger := (v_c->>'ledger_brl')::numeric;
  IF v_cot <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)');
  END IF;

  UPDATE public.creditos_indicador
     SET pago=true, data_pagamento=now(), valor_usd=v_usd, cotacao=v_cot, valor_brl=round(v_usd*v_cot,2)
   WHERE indicador_codigo=p_codigo
     AND NOT COALESCE(pago, false)
     AND NOT COALESCE(abatido, false)
     AND public.credito_lastreado(assinatura_id);
  GET DIAGNOSTICS v_n = ROW_COUNT;

  -- Conta zerada: os abatimentos que reduziram este pagamento estão acertados.
  IF v_n > 0 AND v_ledger > 0 THEN
    UPDATE public.abatimentos_paciente
       SET liquidado_em = now()
     WHERE regexp_replace(coalesce(cpf_paciente,''), '\D','','g') = (v_c->>'cpf')
       AND liquidado_em IS NULL;
  END IF;

  RETURN jsonb_build_object('ok', true,
    'n', v_n,
    'total_brl',   v_saldo,                 -- ⬅ o saldo, não n × unitário
    'abatido_brl', v_ledger,
    'cotacao', v_cot);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.caixa_pagar_indicador(text, text) TO anon, authenticated;


-- ── 5) Encontro de contas do Caixa ───────────────────────────────────────────
-- Este já estava certo (é o único que enxergava o ledger). Passa a usar a fonte
-- única para não voltar a divergir, e ganha `credito_lastreado` — sem isso,
-- crédito de assinatura bloqueada ainda podia virar abatimento.
CREATE OR REPLACE FUNCTION public.caixa_abater(p_token text, p_cpf text, p_tipo text, p_valor numeric, p_obs text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_cod text; v_c jsonb; v_saldo numeric; v_cot numeric; v_uid uuid; v_rows int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  IF p_tipo NOT IN ('anuidade','documento','pix') THEN RETURN jsonb_build_object('ok', false, 'erro', 'Tipo invalido'); END IF;
  IF coalesce(p_valor,0) <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Valor invalido'); END IF;

  SELECT codigo INTO v_cod FROM public.indicadores
   WHERE regexp_replace(coalesce(cpf,''), '\D','','g') = v_cpf
     AND COALESCE(tipo,'') = 'paciente' LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente nao e indicador'); END IF;

  -- Ver aplicar_abatimento: dois abatimentos simultâneos de R$100 sobre um
  -- saldo de R$150 passavam os dois, porque nenhum enxergava o outro.
  PERFORM pg_advisory_xact_lock(hashtext('indic:' || v_cod));

  v_c     := public.indicador_conta(v_cod);
  v_saldo := (v_c->>'saldo_brl')::numeric;
  v_cot   := (v_c->>'cotacao')::numeric;
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;

  IF p_valor > v_saldo + 0.01 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Saldo insuficiente (saldo: R$ ' || to_char(v_saldo,'FM999990.00') || ')');
  END IF;

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
  VALUES (v_cpf, p_tipo, round(p_valor,2), v_cot, NULLIF(btrim(coalesce(p_obs,'')),''));
  RETURN jsonb_build_object('ok', true, 'saldo_novo', round(v_saldo - p_valor, 2));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.caixa_abater(text, text, text, numeric, text) TO anon, authenticated;


-- ── 6) A tela "A PAGAR" do Caixa ─────────────────────────────────────────────
-- Deixar esta função de fora seria repetir o erro que a migração diz corrigir:
-- ela calculava o saldo do paciente-indicador com a fórmula própria e, como não
-- conhece `liquidado_em`, passaria a subtrair para sempre um abatimento já
-- acertado. Na prática o Caixa veria saldo NEGATIVO e o botão de abater ficaria
-- travado (`disabled={saldo_brl < anuidade}`) para quem tem saldo de verdade.
-- Agora cada linha pergunta à fonte única.
--
-- De quebra, o bloco dos INDICADORES puros ganha `credito_lastreado`: ele
-- listava como "a pagar" crédito de assinatura bloqueada, que é justamente o
-- que o item 2 tirou da fila em `caixa_pagar_indicador`. A lista prometia um
-- pagamento que a função de pagar (corretamente) se recusa a fazer.
CREATE OR REPLACE FUNCTION public.caixa_a_pagar(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_usd_enc numeric; v_usd_av numeric; v_cot numeric;
  v_med jsonb; v_ind jsonb; v_pac jsonb; v_anuidade numeric;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd_enc := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_nao_afiliado'), 15);
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
        WHERE elegivel AND NOT pago GROUP BY medico_crm
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
       AND public.credito_lastreado(c.assinatura_id)     -- ⬅ NOVO
       AND COALESCE(i2.tipo,'') <> 'paciente'
     GROUP BY c.indicador_codigo
  ) s JOIN public.indicadores i ON i.codigo = s.codigo;

  -- PACIENTES-INDICADORES: agora pela fonte única.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'codigo', i.codigo, 'cpf', i.cpf, 'nome', i.nome,
      'n_creditos',   (k.c->>'vivos')::int,
      'creditos_brl', round(((k.c->>'vivos')::numeric) * ((k.c->>'unit_brl')::numeric), 2),
      'abatido_brl',  (k.c->>'ledger_brl')::numeric,
      'saldo_brl',    (k.c->>'saldo_brl')::numeric
    ) ORDER BY i.nome), '[]'::jsonb) INTO v_pac
  FROM public.indicadores i
  CROSS JOIN LATERAL (SELECT public.indicador_conta(i.codigo) AS c) k
  WHERE COALESCE(i.tipo,'') = 'paciente'
    AND ( (k.c->>'vivos')::int > 0 OR (k.c->>'ledger_brl')::numeric > 0 );

  RETURN jsonb_build_object('ok', true, 'medicos', v_med, 'indicadores', v_ind, 'pacientes', v_pac,
                            'usd_enc', v_usd_enc, 'usd_av', v_usd_av, 'cotacao', v_cot, 'valor_anuidade', v_anuidade);
END; $function$;

GRANT EXECUTE ON FUNCTION public.caixa_a_pagar(text) TO anon, authenticated;


-- ── 7) Extrato do paciente-indicador ─────────────────────────────────────────
-- Mesmo motivo do anterior: o `saldo_brl` do extrato tinha fórmula própria (sem
-- `liquidado_em`, sem `credito_lastreado`) e divergiria da tela e do pagamento.
-- A LISTA de créditos e de abatimentos continua mostrando TUDO, inclusive o que
-- já foi pago ou liquidado — extrato serve para ver histórico. O que muda é só
-- o número do saldo, que passa a ser o mesmo em todo lugar.
CREATE OR REPLACE FUNCTION public.caixa_extrato(p_token text, p_papel text, p_chave text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_usd numeric; v_usd_av numeric; v_cot numeric; v_nome text; v_pix text;
  v_l1 jsonb; v_l2 jsonb; v_ab jsonb; v_cpf text; v_cod text; v_c jsonb;
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
      WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf AND COALESCE(tipo,'')='paciente' LIMIT 1;
    IF v_nome IS NULL THEN SELECT nome INTO v_nome FROM public.profiles WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1; END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'data', c.created_at, 'cpf', '…'||right(regexp_replace(c.cpf_paciente,'\D','','g'),3),
        'pago', c.pago, 'abatido', COALESCE(c.abatido,false)
      ) ORDER BY c.created_at DESC), '[]'::jsonb) INTO v_l1
      FROM public.creditos_indicador c WHERE c.indicador_codigo = v_cod;

    -- `liquidado` na lista para o Caixa distinguir o abatimento ainda em aberto
    -- (que reduz o saldo) do que já foi acertado num pagamento.
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
END; $function$;

GRANT EXECUTE ON FUNCTION public.caixa_extrato(text, text, text) TO anon, authenticated;


-- ── 8) Estorno: desfazer TAMBÉM a baixa do ledger ────────────────────────────
-- Furo criado pela própria coluna nova. `caixa_estornar` foi escrita antes de
-- `liquidado_em` existir e desfaz só `creditos_indicador`. Com a mudança da
-- seção 4, pagar passou a fazer DUAS coisas — marcar os créditos e dar baixa no
-- ledger — e o estorno só desfazia a primeira. Sequência:
--
--   2 créditos (R$100) + ledger aberto R$100 (anuidade já estendida) → saldo 0.
--   Tesoureiro paga por engano: créditos viram `pago`, ledger vira `liquidado`.
--   Estorna: créditos voltam a vivos (R$100), mas o ledger CONTINUA liquidado.
--   → saldo R$100 "novo em folha", enquanto o paciente já levou os R$100 em
--     anuidade estendida. A plataforma pagaria duas vezes — exatamente o bug
--     que esta migração existe para fechar, reaberto pela porta de trás.
--
-- O casamento é exato porque `caixa_pagar_indicador` grava `data_pagamento` e
-- `liquidado_em` no MESMO `now()` — dentro de uma transação, `now()` é o
-- instante da transação, não do comando. O lote é identificado pelo carimbo.
CREATE OR REPLACE FUNCTION public.caixa_estornar(
  p_token text, p_papel text, p_chave text,
  p_data_pagamento timestamp with time zone, p_motivo text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_nf int := 0; v_n1 int := 0; v_n2 int := 0; v_total numeric := 0;
  v_cpf text; v_nled int := 0;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  IF p_papel NOT IN ('medico', 'indicador') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Papel invalido');
  END IF;
  IF p_data_pagamento IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Informe o lote (data do pagamento)');
  END IF;

  -- TRAVA: nota fiscal emitida impede o estorno automático.
  IF p_papel = 'medico' THEN
    SELECT count(*) INTO v_nf FROM (
      SELECT 1 FROM public.creditos_medico
        WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND COALESCE(nf_emitida,false)
      UNION ALL
      SELECT 1 FROM public.creditos_avaliacao
        WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND COALESCE(nf_emitida,false)
    ) x;
  ELSE
    SELECT count(*) INTO v_nf FROM public.creditos_indicador
      WHERE indicador_codigo = p_chave AND data_pagamento = p_data_pagamento AND COALESCE(nf_emitida,false);
  END IF;

  IF v_nf > 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Esse pagamento ja tem NOTA FISCAL emitida (' || v_nf || ' linha(s)). Estorno automatico bloqueado: cancele a NF primeiro.');
  END IF;

  -- Soma o que está sendo devolvido ANTES de limpar os valores.
  IF p_papel = 'medico' THEN
    SELECT COALESCE(sum(valor_brl),0) INTO v_total FROM (
      SELECT valor_brl FROM public.creditos_medico
        WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND pago
      UNION ALL
      SELECT valor_brl FROM public.creditos_avaliacao
        WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND pago
    ) y;

    UPDATE public.creditos_medico
       SET pago = false, data_pagamento = NULL, valor_usd = NULL, cotacao = NULL, valor_brl = NULL
     WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND pago;
    GET DIAGNOSTICS v_n1 = ROW_COUNT;

    UPDATE public.creditos_avaliacao
       SET pago = false, data_pagamento = NULL, valor_usd = NULL, cotacao = NULL, valor_brl = NULL
     WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND pago;
    GET DIAGNOSTICS v_n2 = ROW_COUNT;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext('indic:' || p_chave));

    SELECT COALESCE(sum(valor_brl),0) INTO v_total FROM public.creditos_indicador
      WHERE indicador_codigo = p_chave AND data_pagamento = p_data_pagamento AND pago;

    UPDATE public.creditos_indicador
       SET pago = false, data_pagamento = NULL, valor_usd = NULL, cotacao = NULL, valor_brl = NULL
     WHERE indicador_codigo = p_chave AND data_pagamento = p_data_pagamento AND pago;
    GET DIAGNOSTICS v_n1 = ROW_COUNT;

    -- ⬅ NOVO: reabre os abatimentos liquidados NAQUELE mesmo lote.
    SELECT cpf INTO v_cpf FROM public.indicadores WHERE codigo = p_chave LIMIT 1;
    IF v_cpf IS NOT NULL THEN
      UPDATE public.abatimentos_paciente
         SET liquidado_em = NULL
       WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = regexp_replace(coalesce(v_cpf,''),'\D','','g')
         AND liquidado_em = p_data_pagamento;
      GET DIAGNOSTICS v_nled = ROW_COUNT;
    END IF;
  END IF;

  IF (v_n1 + v_n2) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhum pagamento encontrado nesse lote (ja estornado?)');
  END IF;

  INSERT INTO public.caixa_estornos (papel, chave, data_pagamento, n_linhas, total_brl, motivo)
  VALUES (p_papel, p_chave, p_data_pagamento, v_n1 + v_n2, v_total, NULLIF(btrim(coalesce(p_motivo,'')), ''));

  RETURN jsonb_build_object('ok', true, 'n_linhas', v_n1 + v_n2, 'total_brl', v_total,
                            'abatimentos_reabertos', v_nled);
END; $function$;

GRANT EXECUTE ON FUNCTION public.caixa_estornar(text, text, text, timestamp with time zone, text) TO anon, authenticated;


-- ── 9) Desarmar `admin_liquidar_indicador` ───────────────────────────────────
-- O corpo antigo faz `UPDATE ... SET pago=true WHERE NOT pago` — sem excluir
-- `abatido`, sem `credito_lastreado`, sem ledger, sem lock. Ou seja, paga de
-- novo crédito já queimado como desconto. Hoje ela é inalcançável (conferi:
-- anon, authenticated e PUBLIC todos sem EXECUTE), mas a única coisa que separa
-- a plataforma de um pagamento em dobro é um GRANT — e neste projeto um REVOKE
-- já vazou uma vez por esquecer o `FROM PUBLIC`.
--
-- A decisão de produto já foi tomada ("a baixa é só na Tesouraria" — o botão
-- saiu do Admin). Então em vez de manter a fórmula velha carregada, a função
-- passa a RECUSAR e apontar o caminho certo. Não apaguei: a assinatura continua
-- de pé, e voltar atrás é trocar o corpo.
CREATE OR REPLACE FUNCTION public.admin_liquidar_indicador(p_crm text, p_token text, p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN jsonb_build_object('ok', false, 'erro',
    'Baixa de comissao e feita apenas no CAIXA (Tesouraria), que desconta o encontro de contas. Use caixa_pagar_indicador.');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_liquidar_indicador(text, text, text) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
