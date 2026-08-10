-- ============================================================================
-- migrate_conferencia_e_renovacao.sql
--
-- Duas decisões do Estácio (08/08/2026). Vão JUNTAS porque a segunda mexe na
-- régua que a primeira usa.
--
-- (2) COMISSÃO SÓ DEPOIS DA CONFERÊNCIA. Hoje o "JÁ PAGUEI" cria a assinatura na
--     confiança e a comissão nasce pagável na hora. A metade "verifica depois"
--     do modelo passou a existir em 05/08 (`conferido_em`), mas nada de dinheiro
--     a consultava. Decisão: o crédito APARECE (o indicador precisa saber que
--     ganhou) mas fica "aguardando confirmação" — não vira dinheiro nem desconto
--     enquanto o PIX não for conferido no Caixa.
--
-- (3) RENOVAR ENCERRA A ASSINATURA ANTERIOR. `assinatura_registrar_pagamento`
--     insere linha nova e nunca fecha a antiga: quem renovou acumula 2+ linhas
--     'ativa'. Efeito grave: `caixa_bloquear_assinatura` bloqueia UMA — as
--     outras seguem validando o CPF e o acesso NÃO é cortado.
--
-- ⚠ O CRUZAMENTO, e o motivo de irem juntas: `credito_lastreado` exigia
--   `status = 'ativa'`. Se a renovação mudasse o status da linha antiga, a
--   comissão daquele ciclo — possivelmente ainda NÃO PAGA — sairia da fila em
--   silêncio, como se a assinatura tivesse sido bloqueada por falta de
--   pagamento. São coisas opostas: "substituída por renovação" é sucesso,
--   "bloqueada" é calote. A régua passa a olhar o que importa: não estar
--   BLOQUEADA.
--
-- Idempotente.
-- ============================================================================


-- ── 1) Lastro: o que vale é NÃO estar bloqueada ─────────────────────────────
-- Antes: `status = 'ativa'`. Uma assinatura substituída por renovação deixaria
-- de lastrear o crédito do próprio ciclo dela — o indicador perderia comissão
-- por causa de o paciente ter renovado, que é o contrário do que se quer.
CREATE OR REPLACE FUNCTION public.credito_lastreado(p_assinatura_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT p_assinatura_id IS NULL
      OR EXISTS (SELECT 1 FROM public.assinaturas a
                  WHERE a.id = p_assinatura_id
                    AND COALESCE(a.status,'') <> 'bloqueada');
$function$;


-- ── 2) Liberado = lastreado E CONFERIDO ─────────────────────────────────────
-- Função à parte, de propósito. `credito_lastreado` continua respondendo
-- "este crédito é legítimo?" (usada para EXIBIR), e esta responde "pode virar
-- dinheiro agora?" (usada para PAGAR e ABATER). Misturar as duas faria o
-- crédito sumir da vista do indicador enquanto o PIX não fosse conferido — e a
-- decisão foi que ele veja, marcado como pendente.
CREATE OR REPLACE FUNCTION public.credito_liberado(p_assinatura_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT p_assinatura_id IS NULL       -- crédito sem assinatura de origem (AVALIAR)
      OR EXISTS (SELECT 1 FROM public.assinaturas a
                  WHERE a.id = p_assinatura_id
                    AND COALESCE(a.status,'') <> 'bloqueada'
                    AND a.conferido_em IS NOT NULL);
$function$;

REVOKE EXECUTE ON FUNCTION public.credito_liberado(uuid) FROM PUBLIC, anon, authenticated;


-- ── 3) Renovar encerra a anterior ───────────────────────────────────────────
-- 'substituida' e não 'bloqueada': são coisas opostas. A régua de lastro sabe a
-- diferença (item 1), então a comissão do ciclo antigo continua de pé.
CREATE OR REPLACE FUNCTION public.assinatura_registrar_pagamento(p_cpf text, p_pac_token text, p_valor numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_uid uuid;
  v_id  uuid;
  v_ant int;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT p.id INTO v_uid FROM public.profiles p
   WHERE regexp_replace(coalesce(p.cpf,''), '\D','','g') = v_cpf LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Perfil nao encontrado');
  END IF;

  -- ⬅ NOVO: encerra o que estava valendo. Sem isto as linhas 'ativa' se
  -- acumulavam e bloquear uma não cortava o acesso (as outras seguiam
  -- validando o CPF em `assinatura_valida_cpf`).
  UPDATE public.assinaturas
     SET status = 'substituida', updated_at = now()
   WHERE user_id = v_uid AND status = 'ativa';
  GET DIAGNOSTICS v_ant = ROW_COUNT;

  INSERT INTO public.assinaturas (user_id, status, data_inicio, data_fim, valor_pago)
  VALUES (v_uid, 'ativa', now(), now() + interval '365 days', p_valor)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'substituidas', v_ant);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.assinatura_registrar_pagamento(text, text, numeric) TO anon, authenticated;


-- ── 4) A conta do indicador separa LIBERADO de PENDENTE ─────────────────────
-- `vivos` (o que existe e é legítimo) x `liberados` (o que já pode ser gasto).
-- `saldo_brl` passa a ser o LIBERADO — é ele que o abatimento e o pagamento
-- consultam. `pendente_brl` é o que o indicador vê como "aguardando
-- confirmação".
CREATE OR REPLACE FUNCTION public.indicador_conta(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text; v_usd numeric; v_cot numeric; v_unit numeric;
  v_vivos int; v_lib int; v_ledger numeric;
BEGIN
  SELECT regexp_replace(coalesce(cpf,''), '\D', '', 'g') INTO v_cpf
    FROM public.indicadores WHERE codigo = p_codigo LIMIT 1;
  IF v_cpf IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Indicador nao encontrado');
  END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  v_cot := COALESCE((SELECT a.cotacao FROM public.abatimentos_paciente a
                      WHERE regexp_replace(coalesce(a.cpf_paciente,''), '\D','','g') = v_cpf
                        AND a.liquidado_em IS NULL AND COALESCE(a.cotacao, 0) > 0
                      ORDER BY a.created_at ASC LIMIT 1), v_cot);
  v_unit := v_usd * v_cot;

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
    'vivos', v_lib,                    -- compatibilidade: quem já lia 'vivos'
                                       -- espera "o que dá para pagar"
    'vivos_total', v_vivos,
    'pendentes', v_vivos - v_lib,
    'usd_unit', v_usd,
    'cotacao', v_cot,
    'unit_brl', v_unit,
    'ledger_brl', round(v_ledger, 2),
    'pendente_brl', round((v_vivos - v_lib) * v_unit, 2),
    'saldo_brl', GREATEST(round(v_lib * v_unit - v_ledger, 2), 0)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.indicador_conta(text) TO anon, authenticated;


-- ── 5) Vitrine do saldo: mostra o pendente ──────────────────────────────────
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
    'saldo_brl',      (v_c->>'saldo_brl')::numeric,
    'qtd_pendente',   (v_c->>'pendentes')::int,
    'pendente_brl',   (v_c->>'pendente_brl')::numeric
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.saldo_indicador(text) TO anon, authenticated;


-- ── 6) Quem GASTA passa a exigir liberação ──────────────────────────────────
-- `aplicar_abatimento` e `caixa_pagar_indicador` já leem o saldo por
-- `indicador_conta`, que agora só conta os liberados — mas a SELEÇÃO das linhas
-- a queimar/pagar tinha o `credito_lastreado` cru. Sem trocar aqui, o abatimento
-- queimaria uma linha pendente para dar um desconto calculado sobre outra.
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

  PERFORM pg_advisory_xact_lock(hashtext('indic:' || v_cod));

  v_c     := public.indicador_conta(v_cod);
  v_unit  := (v_c->>'unit_brl')::numeric;
  v_saldo := (v_c->>'saldo_brl')::numeric;
  IF v_unit <= 0 OR v_saldo <= 0 THEN
    RETURN jsonb_build_object('ok',true,'desconto_brl',0,'a_pagar_brl',p_anuidade_brl,'usados',0,
                              'pendente_brl',(v_c->>'pendente_brl')::numeric);
  END IF;

  v_desc := LEAST(v_saldo, GREATEST(coalesce(p_anuidade_brl,0), 0));
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
         AND public.credito_liberado(c.assinatura_id)     -- ⬅ liberado, não só lastreado
       ORDER BY c.created_at ASC LIMIT v_queimar
    ) s;
    v_usados := COALESCE(array_length(v_ids,1), 0);
    IF v_usados > 0 THEN
      UPDATE public.creditos_indicador SET abatido = true, abatido_em = now() WHERE id = ANY(v_ids);
    END IF;
  ELSE
    v_usados := 0;
  END IF;

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


CREATE OR REPLACE FUNCTION public.caixa_pagar_indicador(p_token text, p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_c jsonb; v_usd numeric; v_cot numeric; v_unit numeric;
  v_saldo numeric; v_ledger numeric; v_cobre numeric; v_n int; v_nled int := 0; v_pend numeric;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;

  PERFORM pg_advisory_xact_lock(hashtext('indic:' || p_codigo));

  v_c := public.indicador_conta(p_codigo);
  IF NOT COALESCE((v_c->>'ok')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'erro', COALESCE(v_c->>'erro','Indicador nao encontrado'));
  END IF;
  v_usd    := (v_c->>'usd_unit')::numeric;
  v_cot    := (v_c->>'cotacao')::numeric;
  v_unit   := (v_c->>'unit_brl')::numeric;
  v_saldo  := (v_c->>'saldo_brl')::numeric;
  v_ledger := (v_c->>'ledger_brl')::numeric;
  v_pend   := (v_c->>'pendente_brl')::numeric;
  IF v_cot <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)');
  END IF;

  UPDATE public.creditos_indicador
     SET pago=true, data_pagamento=now(), valor_usd=v_usd, cotacao=v_cot, valor_brl=round(v_usd*v_cot,2)
   WHERE indicador_codigo=p_codigo
     AND NOT COALESCE(pago, false)
     AND NOT COALESCE(abatido, false)
     AND public.credito_liberado(assinatura_id);            -- ⬅ só o conferido
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      CASE WHEN v_pend > 0
        THEN 'Nenhum credito liberado. Ha R$ ' || to_char(v_pend,'FM999990.00') ||
             ' aguardando a confirmacao do PIX da assinatura (aba Pendencias).'
        ELSE 'Nenhum credito a pagar para este indicador.' END,
      'pendente_brl', v_pend);
  END IF;

  v_cobre := LEAST(v_ledger, v_n * v_unit);
  IF v_cobre > 0 THEN
    WITH acum AS (
      SELECT a.id, sum(a.valor_brl) OVER (ORDER BY a.created_at, a.id) AS ate_aqui
        FROM public.abatimentos_paciente a
       WHERE regexp_replace(coalesce(a.cpf_paciente,''), '\D','','g') = (v_c->>'cpf')
         AND a.liquidado_em IS NULL
    )
    UPDATE public.abatimentos_paciente x
       SET liquidado_em = now()
      FROM acum
     WHERE x.id = acum.id AND acum.ate_aqui <= v_cobre + 0.001;
    GET DIAGNOSTICS v_nled = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('ok', true,
    'n', v_n, 'total_brl', v_saldo, 'abatido_brl', v_cobre,
    'ledger_restante', round(v_ledger - v_cobre, 2),
    'abatimentos_liquidados', v_nled,
    'pendente_brl', v_pend, 'cotacao', v_cot);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.caixa_pagar_indicador(text, text) TO anon, authenticated;


-- ── 7) Comissão do MÉDICO idem ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.caixa_pagar_medico(p_token text, p_crm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_nao_afiliado'), 15);
  v_cot     := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;

  UPDATE public.creditos_medico
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_enc, cotacao=v_cot, valor_brl=round(v_usd_enc*v_cot,2)
   WHERE upper(btrim(medico_crm)) = v_crm AND elegivel AND NOT pago
     AND public.credito_liberado(assinatura_id);            -- ⬅ só o conferido
  GET DIAGNOSTICS v_n1 = ROW_COUNT;

  -- `creditos_avaliacao` não nasce de assinatura (assinatura_id nem existe na
  -- tabela): o trabalho de AVALIAR não depende de pagamento de paciente nenhum.
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
END; $function$;

GRANT EXECUTE ON FUNCTION public.caixa_pagar_medico(text, text) TO anon, authenticated;

-- ── 8) A lista "A PAGAR" mostra só o que É pagável ──────────────────────────
-- Sem isto, o crédito pendente de conferência ficaria listado como "a pagar" e
-- o pagamento o recusaria — a linha nunca sairia da lista. É a "lista que não se
-- limpa" que já apareceu três vezes nesta auditoria. O pendente aparece no
-- painel de PENDÊNCIAS, como "aguardando conferência", que é onde se age.
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
END; $function$;

GRANT EXECUTE ON FUNCTION public.caixa_a_pagar(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
