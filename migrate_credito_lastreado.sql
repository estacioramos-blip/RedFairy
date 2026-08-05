-- ============================================================================
-- migrate_credito_lastreado.sql
--
-- PROBLEMA (auditoria financeira ago/2026): o "JÁ PAGUEI" cria a assinatura NA
-- CONFIANÇA (desenho deliberado do Dr. Ramos — confia primeiro, verifica
-- depois). O trigger dispara na hora e gera a comissão de conversão, com aviso
-- no Telegram dizendo "cadastrou e pagou".
--
-- Só que a metade "verifica depois" não existia de verdade: se o PIX nunca
-- chega e o Caixa BLOQUEIA a assinatura (`caixa_bloquear_assinatura` só muda
-- `status`), o crédito CONTINUA elegível na fila de pagamento. Ou seja: o
-- acesso do paciente é cortado, mas a plataforma paga a comissão assim mesmo.
-- É o furo direto no modelo — bloquear não desfazia nada.
--
-- SOLUÇÃO — DERIVAR, não duplicar estado:
-- `creditos_medico` e `creditos_indicador` já guardam `assinatura_id`. Em vez
-- de criar uma coluna "suspenso" (mais um estado para manter em sincronia, que
-- inevitavelmente diverge), a elegibilidade passa a ser DERIVADA da assinatura
-- que deu origem ao crédito. Bloqueou → o crédito some da fila; desbloqueou →
-- volta sozinho, sem nenhum passo extra e sem risco de ficar preso.
--
-- ⚠ POR QUE NÃO REUSEI `elegivel`: aquele campo JÁ TEM outro significado no
-- crédito do médico — `fn_credita_medico` o define com
-- `medico_tem_avaliacao_completa()`, ou seja, "o médico já fez a 1ª avaliação
-- completa" (regra da reserva). Sobrecarregá-lo faria o desbloqueio PROMOVER
-- créditos que estavam parados esperando a avaliação, pagando o que não devia.
--
-- Alcance: só onde o crédito vira DINHEIRO ou DESCONTO (pagar, listar a pagar,
-- saldo e abatimento). Relatórios e extratos continuam mostrando tudo — ver um
-- crédito suspenso no extrato é desejável; o que não pode é ele ser pago.
--
-- `creditos_avaliacao` NÃO entra: é o crédito de AVALIAR, não nasce de
-- assinatura nenhuma (nem tem a coluna) e não depende de pagamento do paciente.
--
-- Idempotente. Assinaturas das funções preservadas.
-- ============================================================================

-- ── 1) A régua ───────────────────────────────────────────────────────────────
-- Crédito sem assinatura vinculada (legado//outros caminhos) segue válido: a
-- ausência de lastro não é prova de calote, e negar por omissão puniria o
-- médico por um dado que o sistema não guardou.
CREATE OR REPLACE FUNCTION public.credito_lastreado(p_assinatura_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT p_assinatura_id IS NULL
      OR EXISTS (SELECT 1 FROM public.assinaturas a
                  WHERE a.id = p_assinatura_id AND a.status = 'ativa');
$function$;

GRANT EXECUTE ON FUNCTION public.credito_lastreado(uuid) TO anon, authenticated;


-- ── 2) PAGAR médico: não paga crédito de assinatura bloqueada ────────────────
CREATE OR REPLACE FUNCTION public.caixa_pagar_medico(p_token text, p_crm text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_usd_enc numeric; v_usd_av numeric; v_cot numeric; v_n1 int; v_n2 int; v_val boolean;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;

  SELECT validado INTO v_val FROM public.medicos WHERE crm = upper(btrim(coalesce(p_crm,'')));
  IF v_val IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Medico ainda nao validado. Peca a selfie com a carteira profissional pelo WhatsApp e valide em Admin > Medicos antes de pagar.');
  END IF;

  v_usd_enc := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_nao_afiliado'), 15);
  v_cot     := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;

  UPDATE public.creditos_medico
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_enc, cotacao=v_cot, valor_brl=round(v_usd_enc*v_cot,2)
   WHERE medico_crm=p_crm AND elegivel AND NOT pago
     AND public.credito_lastreado(assinatura_id);          -- ⬅ assinatura bloqueada não paga
  GET DIAGNOSTICS v_n1 = ROW_COUNT;

  -- creditos_avaliacao: sem assinatura de origem, não entra na régua.
  UPDATE public.creditos_avaliacao
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_av, cotacao=v_cot, valor_brl=round(v_usd_av*v_cot,2)
   WHERE medico_crm=p_crm AND elegivel AND NOT pago;
  GET DIAGNOSTICS v_n2 = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'n_enc', v_n1, 'n_av', v_n2,
    'total_brl', round((v_n1*v_usd_enc + v_n2*v_usd_av)*v_cot, 2), 'cotacao', v_cot);
END; $function$;


-- ── 3) PAGAR indicador: idem ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.caixa_pagar_indicador(p_token text, p_codigo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_usd numeric; v_cot numeric; v_n int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;
  UPDATE public.creditos_indicador
     SET pago=true, data_pagamento=now(), valor_usd=v_usd, cotacao=v_cot, valor_brl=round(v_usd*v_cot,2)
   WHERE indicador_codigo=p_codigo AND NOT pago AND NOT COALESCE(abatido,false)
     AND public.credito_lastreado(assinatura_id);          -- ⬅ idem
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'n', v_n, 'total_brl', round(v_n*v_usd*v_cot,2), 'cotacao', v_cot);
END; $function$;


-- ── 4) SALDO do paciente-indicador: crédito suspenso não vira desconto ───────
CREATE OR REPLACE FUNCTION public.saldo_indicador(p_cpf text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  text := translate(coalesce(p_cpf,''),'.- /()','');
  v_cod  text; v_qtd int; v_usd numeric; v_cot numeric; v_unit numeric;
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT codigo INTO v_cod FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok',true,'qtd',0,'saldo_brl',0); END IF;

  SELECT count(*) INTO v_qtd FROM public.creditos_indicador
    WHERE indicador_codigo = v_cod AND abatido = false
      AND public.credito_lastreado(assinatura_id);         -- ⬅ idem
  -- (a exclusão de `pago` continua sendo feita em aplicar_abatimento, que é
  --  quem de fato queima o crédito — aqui é só a vitrine do saldo.)

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  v_unit := v_usd * v_cot;

  RETURN jsonb_build_object('ok',true,'qtd',v_qtd,'valor_unit_brl',v_unit,'saldo_brl', v_qtd * v_unit);
END;
$function$;


-- ── 5) ABATIMENTO: não queima crédito suspenso ───────────────────────────────
CREATE OR REPLACE FUNCTION public.aplicar_abatimento(p_cpf text, p_anuidade_brl numeric, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  text := translate(coalesce(p_cpf,''),'.- /()','');
  v_cod  text; v_usd numeric; v_cot numeric; v_unit numeric;
  v_max  int; v_ids bigint[]; v_usados int; v_desc numeric;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok',false,'erro','Nao autorizado','a_pagar_brl',p_anuidade_brl);
  END IF;
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok',false,'a_pagar_brl',p_anuidade_brl); END IF;
  SELECT codigo INTO v_cod FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok',true,'desconto_brl',0,'a_pagar_brl',p_anuidade_brl,'usados',0); END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  v_unit := v_usd * v_cot;
  IF v_unit <= 0 THEN RETURN jsonb_build_object('ok',true,'desconto_brl',0,'a_pagar_brl',p_anuidade_brl,'usados',0); END IF;

  v_max := ceil(p_anuidade_brl / v_unit);

  SELECT array_agg(id) INTO v_ids FROM (
    SELECT id FROM public.creditos_indicador
      WHERE indicador_codigo = v_cod
        AND abatido = false
        AND NOT COALESCE(pago, false)                      -- crédito já pago não vira desconto
        AND public.credito_lastreado(assinatura_id)        -- ⬅ nem crédito de assinatura bloqueada
      ORDER BY created_at ASC LIMIT v_max
  ) s;
  v_usados := COALESCE(array_length(v_ids,1), 0);

  IF v_usados > 0 THEN
    UPDATE public.creditos_indicador SET abatido = true, abatido_em = now() WHERE id = ANY(v_ids);
  END IF;

  v_desc := LEAST(v_usados * v_unit, p_anuidade_brl);
  RETURN jsonb_build_object('ok',true,'desconto_brl',v_desc,'a_pagar_brl', GREATEST(p_anuidade_brl - v_desc, 0),'usados',v_usados);
END;
$function$;


-- ── 6) Bloquear/desbloquear passa a AVISAR o efeito no dinheiro ──────────────
-- O status em si já resolve (a régua é derivada), mas o tesoureiro precisa
-- SABER o que a ação dele fez — inclusive o caso que o sistema não conserta
-- sozinho: crédito daquela assinatura que JÁ FOI PAGO. Aí é estorno, decisão
-- humana, e ele só toma essa decisão se for avisado.
CREATE OR REPLACE FUNCTION public.caixa_bloquear_assinatura(p_token text, p_id uuid, p_bloquear boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_novo text; v_afetadas int; v_susp int; v_pagos int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  v_novo := CASE WHEN p_bloquear THEN 'bloqueada' ELSE 'ativa' END;
  UPDATE public.assinaturas SET status = v_novo, updated_at = now() WHERE id = p_id;
  GET DIAGNOSTICS v_afetadas = ROW_COUNT;
  IF v_afetadas = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Assinatura nao encontrada');
  END IF;

  SELECT count(*) FILTER (WHERE NOT COALESCE(pago,false)),
         count(*) FILTER (WHERE COALESCE(pago,false))
    INTO v_susp, v_pagos
    FROM (
      SELECT pago FROM public.creditos_medico    WHERE assinatura_id = p_id
      UNION ALL
      SELECT pago FROM public.creditos_indicador WHERE assinatura_id = p_id
    ) c;

  RETURN jsonb_build_object('ok', true, 'status', v_novo,
    'creditos_afetados', COALESCE(v_susp,0),
    'creditos_ja_pagos', COALESCE(v_pagos,0));
END; $function$;

NOTIFY pgrst, 'reload schema';
