-- =============================================================================
-- migrate_abatimento_anuidade.sql   (Fase 5 — créditos abatem a anuidade)
-- =============================================================================
-- RASCUNHO PARA REVISÃO (rodar no Supabase Dashboard -> SQL Editor).
--
-- O paciente-indicador usa os créditos que ganhou (US$10 por indicado que pagou) para
-- ABATER a própria anuidade. 1 crédito = US$10 × cotacao_dolar (R$).
--   * saldo_indicador(cpf)            -> saldo disponível (display, NÃO consome).
--   * aplicar_abatimento(cpf, anuidade) -> consome créditos p/ cobrir a anuidade, marca
--     abatido, devolve { desconto_brl, a_pagar_brl, usados }. Chamado NO pagamento.
-- =============================================================================

ALTER TABLE public.creditos_indicador
  ADD COLUMN IF NOT EXISTS abatido    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abatido_em timestamptz;

-- Saldo disponível (R$) — para mostrar o desconto antes de pagar.
CREATE OR REPLACE FUNCTION public.saldo_indicador(p_cpf text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_cpf  text := translate(coalesce(p_cpf,''),'.- /()','');
  v_cod  text;
  v_qtd  int;
  v_usd  numeric;
  v_cot  numeric;
  v_unit numeric;
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT codigo INTO v_cod FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok',true,'qtd',0,'saldo_brl',0); END IF;

  SELECT count(*) INTO v_qtd FROM public.creditos_indicador
    WHERE indicador_codigo = v_cod AND abatido = false;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_nao_afiliado'),
                    (SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  v_unit := v_usd * v_cot;   -- 1 crédito em R$ (0 se a cotação não estiver configurada)

  RETURN jsonb_build_object('ok',true,'qtd',v_qtd,'valor_unit_brl',v_unit,'saldo_brl', v_qtd * v_unit);
END;
$$;

-- Aplica o abatimento na hora do pagamento: consome créditos (mais antigos primeiro) até
-- cobrir a anuidade, marca abatido e devolve o quanto abateu e o que falta pagar.
CREATE OR REPLACE FUNCTION public.aplicar_abatimento(p_cpf text, p_anuidade_brl numeric)
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
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok',false,'a_pagar_brl',p_anuidade_brl); END IF;
  SELECT codigo INTO v_cod FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok',true,'desconto_brl',0,'a_pagar_brl',p_anuidade_brl,'usados',0); END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_nao_afiliado'),
                    (SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  v_unit := v_usd * v_cot;
  IF v_unit <= 0 THEN RETURN jsonb_build_object('ok',true,'desconto_brl',0,'a_pagar_brl',p_anuidade_brl,'usados',0); END IF;

  v_max := ceil(p_anuidade_brl / v_unit);   -- nº máx. de créditos p/ cobrir a anuidade

  SELECT array_agg(id) INTO v_ids FROM (
    SELECT id FROM public.creditos_indicador
      WHERE indicador_codigo = v_cod AND abatido = false
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

GRANT EXECUTE ON FUNCTION public.saldo_indicador(text)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_abatimento(text, numeric)   TO anon, authenticated;
