-- ============================================================
-- migrate_caixa_estorno.sql  (achado M4 da auditoria de jul/2026)
--
-- A Tesouraria não tinha ESTORNO: um pagamento lançado errado só podia ser
-- desfeito na mão, direto no banco. Como o Caixa paga em LOTE (um UPDATE por
-- pessoa, marcando todos os créditos pendentes de uma vez), um clique errado
-- carimbava dezenas de linhas sem volta.
--
-- COMO O LOTE É IDENTIFICADO: `caixa_pagar_*` faz um único UPDATE com
-- `data_pagamento = now()`. Dentro de uma transação, now() é constante — então
-- TODAS as linhas de um mesmo pagamento compartilham o timestamp EXATO. Esse
-- timestamp é a chave natural do lote, e é o que o extrato já devolve por linha.
--
-- TRAVA IMPORTANTE: se qualquer linha do lote já tem NOTA FISCAL emitida, o
-- estorno é RECUSADO. Desfazer um pagamento já faturado não é corrigir digitação
-- — é problema contábil, e tem que passar por decisão humana, não por um botão.
--
-- O estorno é REGISTRADO em caixa_estornos: dinheiro que volta sem deixar rastro
-- é pior do que dinheiro que não volta.
-- ============================================================

-- 1) Trilha de auditoria dos estornos ---------------------------------------
CREATE TABLE IF NOT EXISTS public.caixa_estornos (
  id              bigserial PRIMARY KEY,
  papel           text NOT NULL CHECK (papel IN ('medico', 'indicador')),
  chave           text NOT NULL,             -- CRM do médico ou código do indicador
  data_pagamento  timestamptz NOT NULL,      -- o lote estornado
  n_linhas        int NOT NULL,
  total_brl       numeric,
  motivo          text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.caixa_estornos ENABLE ROW LEVEL SECURITY;  -- acesso só via RPC


-- 2) Lotes de pagamento de uma pessoa (para a tela oferecer o que estornar) --
CREATE OR REPLACE FUNCTION public.caixa_lotes_pagos(p_token text, p_papel text, p_chave text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;

  IF p_papel = 'medico' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.data_pagamento DESC), '[]'::jsonb) INTO v FROM (
      SELECT data_pagamento,
             sum(n)                          AS n_linhas,
             sum(total)                       AS total_brl,
             bool_or(tem_nf)                  AS tem_nf
        FROM (
          SELECT data_pagamento, count(*) AS n, sum(COALESCE(valor_brl,0)) AS total,
                 bool_or(COALESCE(nf_emitida,false)) AS tem_nf
            FROM public.creditos_medico
           WHERE medico_crm = p_chave AND pago AND data_pagamento IS NOT NULL
           GROUP BY data_pagamento
          UNION ALL
          SELECT data_pagamento, count(*), sum(COALESCE(valor_brl,0)),
                 bool_or(COALESCE(nf_emitida,false))
            FROM public.creditos_avaliacao
           WHERE medico_crm = p_chave AND pago AND data_pagamento IS NOT NULL
           GROUP BY data_pagamento
        ) u
       GROUP BY data_pagamento
    ) t;
    RETURN jsonb_build_object('ok', true, 'lotes', v);
  END IF;

  IF p_papel = 'indicador' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.data_pagamento DESC), '[]'::jsonb) INTO v FROM (
      SELECT data_pagamento, count(*) AS n_linhas, sum(COALESCE(valor_brl,0)) AS total_brl,
             bool_or(COALESCE(nf_emitida,false)) AS tem_nf
        FROM public.creditos_indicador
       WHERE indicador_codigo = p_chave AND pago AND data_pagamento IS NOT NULL
       GROUP BY data_pagamento
    ) t;
    RETURN jsonb_build_object('ok', true, 'lotes', v);
  END IF;

  RETURN jsonb_build_object('ok', false, 'erro', 'Papel invalido');
END; $$;

GRANT EXECUTE ON FUNCTION public.caixa_lotes_pagos(text, text, text) TO anon, authenticated;


-- 3) ESTORNO de um lote -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.caixa_estornar(
  p_token text, p_papel text, p_chave text, p_data_pagamento timestamptz, p_motivo text DEFAULT NULL
)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_nf int := 0; v_n1 int := 0; v_n2 int := 0; v_total numeric := 0;
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
    SELECT COALESCE(sum(valor_brl),0) INTO v_total FROM public.creditos_indicador
      WHERE indicador_codigo = p_chave AND data_pagamento = p_data_pagamento AND pago;

    UPDATE public.creditos_indicador
       SET pago = false, data_pagamento = NULL, valor_usd = NULL, cotacao = NULL, valor_brl = NULL
     WHERE indicador_codigo = p_chave AND data_pagamento = p_data_pagamento AND pago;
    GET DIAGNOSTICS v_n1 = ROW_COUNT;
  END IF;

  IF (v_n1 + v_n2) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhum pagamento encontrado nesse lote (ja estornado?)');
  END IF;

  INSERT INTO public.caixa_estornos (papel, chave, data_pagamento, n_linhas, total_brl, motivo)
  VALUES (p_papel, p_chave, p_data_pagamento, v_n1 + v_n2, v_total, NULLIF(btrim(coalesce(p_motivo,'')), ''));

  RETURN jsonb_build_object('ok', true, 'n_linhas', v_n1 + v_n2, 'total_brl', v_total);
END; $$;

GRANT EXECUTE ON FUNCTION public.caixa_estornar(text, text, text, timestamptz, text) TO anon, authenticated;


-- 4) Histórico de estornos (para a tela mostrar o rastro) -------------------
CREATE OR REPLACE FUNCTION public.caixa_estornos_lista(p_token text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb) INTO v
    FROM (SELECT * FROM public.caixa_estornos ORDER BY created_at DESC LIMIT 200) t;
  RETURN jsonb_build_object('ok', true, 'linhas', v);
END; $$;

GRANT EXECUTE ON FUNCTION public.caixa_estornos_lista(text) TO anon, authenticated;

-- 5) BUG DE DUPLO BENEFÍCIO em aplicar_abatimento ---------------------------
-- ⚠ Achado do code-reviewer durante esta revisão. NÃO é do estorno — é um bug
-- PRÉ-EXISTENTE, na costura entre "pagar o indicador em dinheiro" e "abater a
-- anuidade do paciente com o mesmo crédito".
--
-- `caixa_pagar_indicador` exclui créditos já abatidos (NOT abatido) antes de
-- pagar. Mas o inverso NÃO era verdade: `aplicar_abatimento` escolhia créditos
-- só por `abatido = false`, sem olhar `pago`. Resultado: um crédito já PAGO em
-- PIX ao indicador podia depois virar desconto de anuidade do paciente — o mesmo
-- crédito saindo duas vezes, uma como dinheiro e outra como desconto.
--
-- A correção é a linha `AND NOT COALESCE(pago,false)` na seleção dos IDs. O
-- resto da função é idêntico ao que já estava no banco
-- (migrate_fix_tesouraria_creditos.sql), reproduzido aqui porque
-- CREATE OR REPLACE exige o corpo inteiro.
CREATE OR REPLACE FUNCTION public.aplicar_abatimento(p_cpf text, p_anuidade_brl numeric, p_token text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_cpf  text := translate(coalesce(p_cpf,''),'.- /()','');
  v_cod  text;
  v_usd  numeric; v_cot numeric; v_unit numeric;
  v_max  int;
  v_ids  bigint[];
  v_usados int;
  v_desc numeric;
BEGIN
  -- A3: exige token do próprio paciente (o CPF do abatimento tem que ser o dele).
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok',false,'erro','Nao autorizado','a_pagar_brl',p_anuidade_brl);
  END IF;
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok',false,'a_pagar_brl',p_anuidade_brl); END IF;
  SELECT codigo INTO v_cod FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok',true,'desconto_brl',0,'a_pagar_brl',p_anuidade_brl,'usados',0); END IF;

  -- A2: conversão do indicador = comissao_usd_por_conversao (US$10).
  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  v_unit := v_usd * v_cot;
  IF v_unit <= 0 THEN RETURN jsonb_build_object('ok',true,'desconto_brl',0,'a_pagar_brl',p_anuidade_brl,'usados',0); END IF;

  v_max := ceil(p_anuidade_brl / v_unit);

  SELECT array_agg(id) INTO v_ids FROM (
    SELECT id FROM public.creditos_indicador
      WHERE indicador_codigo = v_cod
        AND abatido = false
        AND NOT COALESCE(pago, false)   -- ⬅ A CORREÇÃO: crédito já pago não pode virar desconto
      ORDER BY created_at ASC LIMIT v_max
  ) s;
  v_usados := COALESCE(array_length(v_ids,1), 0);

  IF v_usados > 0 THEN
    UPDATE public.creditos_indicador SET abatido = true, abatido_em = now() WHERE id = ANY(v_ids);
  END IF;

  v_desc := LEAST(v_usados * v_unit, p_anuidade_brl);
  RETURN jsonb_build_object('ok',true,'desconto_brl',v_desc,'a_pagar_brl', GREATEST(p_anuidade_brl - v_desc, 0),'usados',v_usados);
END;
$$;

NOTIFY pgrst, 'reload schema';

-- Conferência.
SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_pode
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('caixa_lotes_pagos', 'caixa_estornar', 'caixa_estornos_lista')
 ORDER BY p.proname;

-- Conferência do bug de duplo benefício: deve devolver true.
SELECT position('AND NOT COALESCE(pago, false)' in pg_get_functiondef(p.oid)) > 0 AS abatimento_ignora_pagos
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'aplicar_abatimento';
