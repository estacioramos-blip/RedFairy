-- ============================================================================
-- migrate_cfm_r2_remove_comissao_indicacao.sql   (RODAR 2º — depois de R1)
--
-- REESTRUTURAÇÃO ÉTICO-REGULATÓRIA — 09/09/2026. Ver o cabeçalho de
-- migrate_cfm_r1_valor_avaliacao.sql para o motivo completo (CFM 2.336/2023 e
-- CFM 2.170/2017 — captação de clientela).
--
-- R2: o médico DEIXA DE RECEBER por paciente que ele traz. Pagar por paciente
-- trazido é captação de clientela, e o responsável técnico responde por isso
-- perante o CRM mesmo quando o dinheiro sai para outra pessoa.
--
-- O QUE SAI:
--   • tabela `creditos_medico` inteira (crédito por conversão)
--   • o ramo do médico no gatilho de crédito
--   • a régua "crédito de indicação liberado após a 1ª avaliação completa"
--     (fn_libera_creditos_pendentes + 2 triggers + medico_tem_avaliacao_completa)
--   • médico da fila A PAGAR por encaminhamento; extratos, NF e estorno disso
--
-- O QUE FICA — e por quê:
--   • ENCAMINHAR (QR/link ?ref=CRM) e RECOMENDAR (CPF) continuam existindo como
--     FERRAMENTA CLÍNICA: servem para o médico trazer o paciente dele para a
--     plataforma e manter acesso ao prontuário. Passam a não gerar centavo
--     nenhum. `encaminhamentos_medico` e `medico_encaminhar_cpf` ficam de pé,
--     agora só como registro de VÍNCULO.
--   • `creditos_avaliacao` (R1) fica intocada: é trabalho médico prestado.
--
-- ⚠ ARMADILHA — POR ISSO A ORDEM IMPORTA: `creditos_medico` NÃO era só dinheiro.
--   `medico_tem_vinculo` a usava como uma das provas de que o médico pode abrir
--   o prontuário daquele paciente. Apagar a tabela sem reescrever essa função
--   TIRARIA DO MÉDICO O ACESSO AOS PACIENTES DELE. A reescrita está no passo 2,
--   ANTES do DROP TABLE, e foi autorizada explicitamente (decisão A3).
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. O gatilho de crédito perde o ramo do médico — e o nome, que passou a
--    mentir. `fn_credita_medico` não credita mais médico nenhum.
--    Vira `fn_credita_indicacao` (R3/R4 refinam depois).
-- ---------------------------------------------------------------------------
DROP TRIGGER  IF EXISTS trg_credita_medico ON public.assinaturas;
DROP FUNCTION IF EXISTS public.fn_credita_medico();

CREATE OR REPLACE FUNCTION public.fn_credita_indicacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text; v_ind text; v_rows int;
  v_nome text; v_pix text; v_usd numeric; v_cot numeric;
  v_cpfd text; v_msg text;
BEGIN
  IF NEW.status <> 'ativa' THEN RETURN NEW; END IF;
  SELECT cpf INTO v_cpf FROM public.profiles WHERE id = NEW.user_id;
  IF v_cpf IS NULL THEN RETURN NEW; END IF;

  -- 1× NA VIDA por CPF: renovação anual é mérito da plataforma, não indicação
  -- nova. (Antes olhava também creditos_medico, que deixou de existir.)
  IF EXISTS (SELECT 1 FROM public.creditos_indicador WHERE cpf_paciente = v_cpf) THEN
    RETURN NEW;
  END IF;

  SELECT indicador_codigo INTO v_ind FROM public.indicacoes_precadastro
    WHERE cpf_paciente = v_cpf AND confirmado = true
    ORDER BY created_at DESC LIMIT 1;

  -- (R2) O bloco que procurava o MÉDICO mais recente em triagens/avaliacoes/
  -- encaminhamentos_medico saiu inteiro: não há mais crédito de médico por
  -- conversão. O vínculo clínico daquele médico continua existindo em
  -- `encaminhamentos_medico` e em `profiles.medico_origem` (gravado no cadastro
  -- por consume_triagem_on_signup) — ver `medico_tem_vinculo` no passo 2.
  IF v_ind IS NULL OR btrim(v_ind) = '' THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_ind) THEN
    RETURN NEW;
  END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);
  v_cpfd := regexp_replace(coalesce(v_cpf,''), '\D', '', 'g');
  v_cpfd := CASE WHEN length(v_cpfd) = 11
                 THEN '***.' || substr(v_cpfd,4,3) || '.' || substr(v_cpfd,7,3) || '-**'
                 ELSE coalesce(v_cpf,'-') END;

  INSERT INTO public.creditos_indicador (indicador_codigo, cpf_paciente, assinatura_id, elegivel)
  VALUES (v_ind, v_cpf, NEW.id, true)
  ON CONFLICT (cpf_paciente) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN NEW; END IF;

  SELECT nome, COALESCE(NULLIF(pix_chave,''), usdc_wallet) INTO v_nome, v_pix
    FROM public.indicadores WHERE codigo = v_ind;
  v_msg := '💸 Nova indicação paga (INDICADOR)!' || E'\n' ||
           'Indicador: ' || COALESCE(NULLIF(v_nome,''), v_ind) || ' (' || v_ind || ')' || E'\n' ||
           'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
           'Pagar: US$ ' || to_char(v_usd, 'FM999990.00') ||
           CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
           'Receber em: ' || COALESCE(NULLIF(v_pix,''), '(sem PIX/USDC cadastrado)');
  PERFORM public.tg_enviar(v_msg);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_credita_indicacao
  AFTER INSERT ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_credita_indicacao();

-- A régua "só libera o crédito de indicação depois da 1ª avaliação completa"
-- existia para qualificar o médico ANTES de pagar a comissão dele. Sem comissão,
-- não há o que liberar.
DROP TRIGGER  IF EXISTS trg_libera_creditos     ON public.avaliacoes;
DROP TRIGGER  IF EXISTS trg_libera_creditos_upd ON public.avaliacoes;
DROP FUNCTION IF EXISTS public.fn_libera_creditos_pendentes();
DROP FUNCTION IF EXISTS public.medico_tem_avaliacao_completa(text);

-- ---------------------------------------------------------------------------
-- 2. ⚠ ACESSO AO PRONTUÁRIO — reescrever ANTES do DROP TABLE.
--
--    `medico_tem_vinculo` decide se um médico pode abrir os dados de um
--    paciente. Ela listava `creditos_medico` entre as provas de vínculo. As
--    fontes que sobram cobrem exatamente os mesmos casos:
--      • profiles.medico_origem — gravado no cadastro do paciente
--        (consume_triagem_on_signup), que era a MESMA origem do crédito;
--      • triagens / avaliacoes — o médico atendeu de fato;
--      • encaminhamentos_medico — o médico registrou o CPF (RECOMENDAR);
--      • creditos_avaliacao — o médico avaliou (R1).
--    Nenhum médico perde acesso a paciente que já era dele.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.medico_tem_vinculo(p_cpf text, p_crm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  WITH n AS (
    SELECT regexp_replace(coalesce(p_cpf,''), '\D', '', 'g') AS cpf,
           upper(btrim(coalesce(p_crm,'')))                  AS crm
  )
  SELECT (SELECT cpf FROM n) <> '' AND (SELECT crm FROM n) <> '' AND (
       -- é a origem do paciente (gravada no cadastro)
       EXISTS (SELECT 1 FROM public.profiles p, n
                WHERE regexp_replace(coalesce(p.cpf,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(p.medico_origem,''))) = n.crm)
       -- já avaliou
    OR EXISTS (SELECT 1 FROM public.avaliacoes a, n
                WHERE regexp_replace(coalesce(a.cpf,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(a.medico_crm,''))) = n.crm)
       -- já triou
    OR EXISTS (SELECT 1 FROM public.triagens t, n
                WHERE regexp_replace(coalesce(t.cpf,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(t.medico_crm,''))) = n.crm)
       -- encaminhamento registrado (ferramenta clínica; não gera mais crédito)
    OR EXISTS (SELECT 1 FROM public.encaminhamentos_medico e, n
                WHERE regexp_replace(coalesce(e.cpf_paciente,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(e.medico_crm,''))) = n.crm)
       -- crédito de AVALIAÇÃO (R1) já registrado
    OR EXISTS (SELECT 1 FROM public.creditos_avaliacao v, n
                WHERE regexp_replace(coalesce(v.cpf_paciente,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(v.medico_crm,''))) = n.crm)
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Tesouraria — o médico só recebe por AVALIAÇÃO.
-- ---------------------------------------------------------------------------

-- 3.1 Baixa: some o lote de encaminhamento.
CREATE OR REPLACE FUNCTION public.caixa_pagar_medico(p_token text, p_crm text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_crm text; v_usd_av numeric; v_cot numeric; v_n int; v_val boolean;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;

  v_crm := upper(btrim(coalesce(p_crm,'')));

  SELECT validado INTO v_val FROM public.medicos WHERE crm = v_crm;
  IF v_val IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Medico ainda nao validado. Peca a selfie com a carteira profissional pelo WhatsApp e valide em Admin > Medicos antes de pagar.');
  END IF;

  v_usd_av := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_usd_avaliacao'), 15);
  v_cot    := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;

  -- `creditos_avaliacao` não nasce de assinatura: o trabalho de AVALIAR não
  -- depende de pagamento de paciente nenhum. Por isso não há credito_liberado()
  -- aqui — nunca houve.
  UPDATE public.creditos_avaliacao
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_av, cotacao=v_cot, valor_brl=round(v_usd_av*v_cot,2)
   WHERE upper(btrim(medico_crm)) = v_crm AND elegivel AND NOT pago;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Nenhuma avaliacao a pagar para este CRM. Confira a aba A PAGAR.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'n_av', v_n, 'n_enc', 0,
    'total_brl', round(v_n * v_usd_av * v_cot, 2), 'cotacao', v_cot);
END;
$$;

-- 3.2 Fila A PAGAR: médicos só por avaliação.
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
      'n_enc', 0, 'n_av', s.n_av,
      'total_usd', s.n_av * v_usd_av
    ) ORDER BY s.crm), '[]'::jsonb) INTO v_med
  FROM (
    SELECT medico_crm AS crm, count(*) AS n_av FROM public.creditos_avaliacao
      WHERE elegivel AND NOT pago GROUP BY medico_crm
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

-- 3.2b Contadores que o MÉDICO vê no app: só avaliação.
--      As quatro chaves do encaminhamento continuam no retorno, zeradas, para
--      não quebrar cliente antigo que ainda as leia enquanto o deploy não sai.
CREATE OR REPLACE FUNCTION public.listar_creditos_medico(p_crm text, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_av int; v_av_rec int; v_av_arec int;
  v_usd_av numeric; v_cot numeric; v_pix text; v_crm text;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  v_crm := upper(btrim(coalesce(p_crm,'')));

  SELECT count(*), count(*) FILTER (WHERE pago), count(*) FILTER (WHERE NOT pago)
    INTO v_av, v_av_rec, v_av_arec
    FROM public.creditos_avaliacao WHERE medico_crm = v_crm;

  v_usd_av := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'valor_usd_avaliacao'), 15);
  v_cot    := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);
  SELECT pix_chave INTO v_pix FROM public.medicos WHERE crm = v_crm;

  RETURN jsonb_build_object('ok', true,
    'cadastrados', 0, 'recebidos', 0, 'a_receber', 0, 'pendentes_elegib', 0,
    'avaliacoes', COALESCE(v_av,0), 'aval_recebidas', COALESCE(v_av_rec,0),
    'aval_a_receber', COALESCE(v_av_arec,0),
    'valor_usd', 0, 'valor_usd_avaliacao', v_usd_av,
    'cotacao', v_cot, 'pix', COALESCE(v_pix,''));
END;
$$;

-- 3.3 Extrato: papel médico só tem avaliações.
CREATE OR REPLACE FUNCTION public.caixa_extrato(p_token text, p_papel text, p_chave text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_usd numeric; v_usd_av numeric; v_cot numeric; v_nome text; v_pix text;
  v_l1 jsonb; v_ab jsonb; v_cpf text; v_cod text; v_c jsonb;
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
        'valor_usd', COALESCE(valor_usd, v_usd_av), 'valor_brl', valor_brl,
        'nf_emitida', nf_emitida, 'nf_numero', nf_numero
      ) ORDER BY created_at DESC), '[]'::jsonb) INTO v_l1
      FROM public.creditos_avaliacao WHERE medico_crm = p_chave;
    -- `encaminhamentos` continua no retorno, sempre vazio, para não quebrar
    -- cliente antigo que ainda leia a chave. R2 tirou a fonte, não o campo.
    RETURN jsonb_build_object('ok', true, 'papel', 'medico', 'chave', p_chave, 'nome', v_nome, 'pix', v_pix,
      'encaminhamentos', '[]'::jsonb, 'avaliacoes', v_l1, 'usd_enc', 0, 'usd_av', v_usd_av, 'cotacao', v_cot);
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

-- 3.4 Lotes pagos: papel médico só tem avaliação.
CREATE OR REPLACE FUNCTION public.caixa_lotes_pagos(p_token text, p_papel text, p_chave text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;

  IF p_papel = 'medico' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.data_pagamento DESC), '[]'::jsonb) INTO v FROM (
      SELECT data_pagamento, count(*) AS n_linhas, sum(COALESCE(valor_brl,0)) AS total_brl,
             bool_or(COALESCE(nf_emitida,false)) AS tem_nf
        FROM public.creditos_avaliacao
       WHERE medico_crm = p_chave AND pago AND data_pagamento IS NOT NULL
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
END;
$$;

-- 3.5 Estorno: papel médico só desfaz avaliação.
CREATE OR REPLACE FUNCTION public.caixa_estornar(
  p_token text, p_papel text, p_chave text, p_data_pagamento timestamptz, p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_nf int := 0; v_n1 int := 0; v_total numeric := 0;
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

  IF p_papel = 'medico' THEN
    SELECT count(*) INTO v_nf FROM public.creditos_avaliacao
      WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND COALESCE(nf_emitida,false);
  ELSE
    SELECT count(*) INTO v_nf FROM public.creditos_indicador
      WHERE indicador_codigo = p_chave AND data_pagamento = p_data_pagamento AND COALESCE(nf_emitida,false);
  END IF;

  IF v_nf > 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Esse pagamento ja tem NOTA FISCAL emitida (' || v_nf || ' linha(s)). Estorno automatico bloqueado: cancele a NF primeiro.');
  END IF;

  IF p_papel = 'medico' THEN
    SELECT COALESCE(sum(valor_brl),0) INTO v_total FROM public.creditos_avaliacao
      WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND pago;

    UPDATE public.creditos_avaliacao
       SET pago = false, data_pagamento = NULL, valor_usd = NULL, cotacao = NULL, valor_brl = NULL
     WHERE medico_crm = p_chave AND data_pagamento = p_data_pagamento AND pago;
    GET DIAGNOSTICS v_n1 = ROW_COUNT;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext('indic:' || p_chave));

    SELECT COALESCE(sum(valor_brl),0) INTO v_total FROM public.creditos_indicador
      WHERE indicador_codigo = p_chave AND data_pagamento = p_data_pagamento AND pago;

    UPDATE public.creditos_indicador
       SET pago = false, data_pagamento = NULL, valor_usd = NULL, cotacao = NULL, valor_brl = NULL
     WHERE indicador_codigo = p_chave AND data_pagamento = p_data_pagamento AND pago;
    GET DIAGNOSTICS v_n1 = ROW_COUNT;

    SELECT cpf INTO v_cpf FROM public.indicadores WHERE codigo = p_chave LIMIT 1;
    IF v_cpf IS NOT NULL THEN
      UPDATE public.abatimentos_paciente
         SET liquidado_em = NULL
       WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = regexp_replace(coalesce(v_cpf,''),'\D','','g')
         AND liquidado_em = p_data_pagamento;
      GET DIAGNOSTICS v_nled = ROW_COUNT;
    END IF;
  END IF;

  IF v_n1 = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhum pagamento encontrado nesse lote (ja estornado?)');
  END IF;

  INSERT INTO public.caixa_estornos (papel, chave, data_pagamento, n_linhas, total_brl, motivo)
  VALUES (p_papel, p_chave, p_data_pagamento, v_n1, v_total, NULLIF(btrim(coalesce(p_motivo,'')), ''));

  RETURN jsonb_build_object('ok', true, 'n_linhas', v_n1, 'total_brl', v_total,
                            'abatimentos_reabertos', v_nled);
END;
$$;

-- 3.6 Nota fiscal: `creditos_medico` sai da allowlist e do relatório.
CREATE OR REPLACE FUNCTION public.caixa_nf(
  p_token text, p_tabela text, p_id text, p_emitida boolean, p_numero text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  IF p_tabela NOT IN ('assinaturas','pedidos_documento','creditos_indicador','creditos_avaliacao') THEN
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
    UNION ALL
    SELECT nf_emitida, COALESCE(valor_brl, 0) FROM public.creditos_indicador WHERE pago
  ) p;
  RETURN jsonb_build_object('ok', true, 'recebimentos', v_rec, 'pagamentos', v_pag);
END;
$$;

-- 3.7 Bloqueio de assinatura: só o crédito de indicação depende dela.
CREATE OR REPLACE FUNCTION public.caixa_bloquear_assinatura(
  p_token text, p_id uuid, p_bloquear boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
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
    FROM public.creditos_indicador WHERE assinatura_id = p_id;

  RETURN jsonb_build_object('ok', true, 'status', v_novo,
    'creditos_afetados', COALESCE(v_susp,0),
    'creditos_ja_pagos', COALESCE(v_pagos,0));
END;
$$;

-- 3.8 Pendências: NF pendente não conta mais encaminhamento.
CREATE OR REPLACE FUNCTION public.caixa_pendencias(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_ass jsonb; v_ped jsonb; v_nf jsonb;
  v_med int; v_ind int; v_pac int; v_pagar jsonb;
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
     WHERE a.conferido_em IS NULL
       AND a.status = 'ativa'
  ) s;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'pago_em'), '[]'::jsonb) INTO v_ped FROM (
    SELECT jsonb_build_object(
             'id', d.id, 'cpf', d.cpf, 'nome', d.nome,
             'valor', d.valor_total, 'pago_em', d.pago_em,
             'dias', floor(EXTRACT(EPOCH FROM (now() - COALESCE(d.pago_em, d.created_at))) / 86400)::int
           ) AS x
      FROM public.pedidos_documento d
     WHERE d.conferido_em IS NULL
       AND d.status = 'pago'
  ) s;

  v_pagar := public.caixa_a_pagar(p_token);
  v_med := COALESCE(jsonb_array_length(v_pagar->'medicos'), 0);
  v_ind := COALESCE(jsonb_array_length(v_pagar->'indicadores'), 0);
  SELECT count(*)::int INTO v_pac FROM jsonb_array_elements(COALESCE(v_pagar->'pacientes','[]'::jsonb)) e
   WHERE COALESCE((e->>'saldo_brl')::numeric, 0) > 0;

  SELECT jsonb_build_object(
           'medicos',    0,   -- (R2) encaminhamento não gera mais pagamento nem NF
           'avaliacoes', (SELECT count(*) FROM public.creditos_avaliacao WHERE pago AND NOT COALESCE(nf_emitida,false)),
           'indicador',  (SELECT count(*) FROM public.creditos_indicador WHERE pago AND NOT COALESCE(nf_emitida,false))
         ) INTO v_nf;

  RETURN jsonb_build_object(
    'ok', true,
    'assinaturas_a_conferir', jsonb_build_object('n', jsonb_array_length(v_ass), 'linhas', v_ass),
    'pedidos_a_conferir',     jsonb_build_object('n', jsonb_array_length(v_ped), 'linhas', v_ped),
    'comissoes_a_pagar',      jsonb_build_object('medicos', v_med, 'indicadores', v_ind, 'pacientes', v_pac),
    'nf_pendente',            v_nf
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Admin — contadores e extrato do médico passam a ser de AVALIAÇÃO.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_listar_medicos(p_crm text, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  resultado jsonb;
  v_valor_usd numeric;
  v_cotacao   numeric;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- (R2) passa a ser o valor da AVALIAÇÃO — é o único pagamento que sobrou.
  v_valor_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'valor_usd_avaliacao'), 15);
  v_cotacao   := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);

  WITH
  screenings AS (
    SELECT cpf, medico_crm FROM public.triagens
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
    UNION ALL
    SELECT cpf, medico_crm FROM public.avaliacoes
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
  ),
  triados AS (
    SELECT medico_crm AS crm, count(DISTINCT cpf) AS n FROM screenings GROUP BY medico_crm
  ),
  conv AS (
    SELECT medico_crm AS crm,
           count(*)                                 AS n,
           count(*) FILTER (WHERE elegivel AND NOT pago) AS pendentes,
           count(*) FILTER (WHERE elegivel AND pago)     AS pagos,
           0                                        AS aguardando
      FROM public.creditos_avaliacao GROUP BY medico_crm
  )
  SELECT jsonb_build_object(
    'ok', true,
    'valor_usd_avaliacao', v_valor_usd,   -- (R2) era 'comissao_usd'. Não há comissão.
    'cotacao_dolar', v_cotacao,
    'medicos', COALESCE(jsonb_agg(jsonb_build_object(
      'id',                  m.id,
      'nome',                m.nome,
      'crm',                 m.crm,
      'uf',                  m.uf,
      'celular',             m.celular,
      'email',               m.email,
      'cep',                 m.cep,
      'pix_chave',           m.pix_chave,
      'is_admin',            m.is_admin,
      'created_at',          m.created_at,
      -- "afiliado" virou só "tem os dados para receber pela avaliação"
      -- (o programa 4DOC de indicação deixou de existir — ver R2 no CLAUDE.md).
      'afiliado',            (m.cep IS NOT NULL AND btrim(m.cep) <> ''
                              AND m.cpf IS NOT NULL AND btrim(m.cpf) <> ''
                              AND m.pix_chave IS NOT NULL AND btrim(m.pix_chave) <> ''),
      'n_triados',           COALESCE(t.n, 0),
      'n_convertidos',       COALESCE(cv.n, 0),
      'creditos_pendentes',  COALESCE(cv.pendentes, 0),
      'creditos_pagos',      COALESCE(cv.pagos, 0),
      'creditos_aguardando', 0
    ) ORDER BY COALESCE(cv.pendentes, 0) DESC, COALESCE(cv.n, 0) DESC, m.nome), '[]'::jsonb)
  )
  INTO resultado
  FROM public.medicos m
  LEFT JOIN triados t  ON t.crm  = m.crm
  LEFT JOIN conv    cv ON cv.crm = m.crm;

  RETURN resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_extrato_medico(p_crm text, p_token text, p_medico_crm text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  resultado jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- (R2) a lista deixa de ser "conversões" e passa a ser AVALIAÇÕES feitas.
  -- A chave do JSON continua 'conversoes' para não quebrar a tela do Admin.
  SELECT jsonb_build_object(
    'ok', true,
    'conversoes', COALESCE(jsonb_agg(jsonb_build_object(
      'cpf',            c.cpf_paciente,
      'nome',           p.nome,
      'data_conversao', c.created_at,
      'pago',           c.pago,
      'data_pagamento', c.data_pagamento
    ) ORDER BY c.created_at DESC), '[]'::jsonb)
  )
  INTO resultado
  FROM public.creditos_avaliacao c
  LEFT JOIN public.profiles p ON p.cpf = c.cpf_paciente
  WHERE c.medico_crm = p_medico_crm;

  RETURN resultado;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Reserva do indicador: a trava "já faz parte do projeto" olhava as duas
--    tabelas de crédito. Agora só existe uma.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.precadastrar_indicacao(p_codigo text, p_cpf text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := translate(coalesce(p_cpf, ''), '.- /()', '');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = p_codigo AND ativo) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Indicador inválido');
  END IF;
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF inválido');
  END IF;
  IF EXISTS (SELECT 1 FROM public.creditos_indicador WHERE cpf_paciente = v_cpf) THEN
    RETURN jsonb_build_object('ok', false, 'ja_no_projeto', true, 'erro', 'ESSE PACIENTE JÁ FAZ PARTE DO PROJETO');
  END IF;
  INSERT INTO public.indicacoes_precadastro (cpf_paciente, indicador_codigo)
  VALUES (v_cpf, p_codigo);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Limpeza de paciente (ferramenta de teste) para de citar a tabela morta.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_limpar_paciente(p_crm text, p_token text, p_cpf text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_uid uuid;
  v_cod text;
  v_auth_ok boolean := false;
  v_del jsonb := '{}'::jsonb;
  n int;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido (precisa de 11 digitos)');
  END IF;
  IF EXISTS (SELECT 1 FROM public.medicos WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Esse CPF pertence a um MEDICO — abortado (use apenas para pacientes)');
  END IF;

  SELECT id     INTO v_uid FROM public.profiles    WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1;
  SELECT codigo INTO v_cod FROM public.indicadores WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf AND COALESCE(tipo,'')='paciente' LIMIT 1;

  DELETE FROM public.abatimentos_paciente   WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('abatimentos_paciente', n);
  DELETE FROM public.creditos_avaliacao     WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('creditos_avaliacao', n);
  DELETE FROM public.encaminhamentos_medico WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('encaminhamentos_medico', n);
  DELETE FROM public.extratos_oba           WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('extratos_oba', n);
  DELETE FROM public.opiniao_medica         WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('opiniao_medica', n);
  DELETE FROM public.prescricoes            WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('prescricoes', n);

  DELETE FROM public.creditos_indicador     WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf OR (v_cod IS NOT NULL AND indicador_codigo = v_cod); GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('creditos_indicador', n);
  DELETE FROM public.indicacoes_precadastro WHERE regexp_replace(coalesce(cpf_paciente,''),'\D','','g') = v_cpf OR (v_cod IS NOT NULL AND indicador_codigo = v_cod); GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('indicacoes_precadastro', n);

  DELETE FROM public.oba_anamnese      WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('oba_anamnese', n);
  DELETE FROM public.avaliacoes        WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('avaliacoes', n);
  DELETE FROM public.triagens          WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('triagens', n);
  DELETE FROM public.pedidos_documento WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('pedidos_documento', n);

  IF v_uid IS NOT NULL THEN
    DELETE FROM public.assinaturas WHERE user_id = v_uid; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('assinaturas', n);
  END IF;

  DELETE FROM public.indicadores WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('indicadores', n);
  DELETE FROM public.profiles    WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf; GET DIAGNOSTICS n = ROW_COUNT; v_del := v_del || jsonb_build_object('profiles', n);

  IF v_uid IS NOT NULL THEN
    BEGIN
      DELETE FROM auth.users WHERE id = v_uid;
      v_auth_ok := true;
    EXCEPTION WHEN OTHERS THEN
      v_auth_ok := false;
    END;
  END IF;

  RETURN jsonb_build_object('ok', true, 'cpf', v_cpf, 'user_id', v_uid, 'indicador_codigo', v_cod,
                            'apagados', v_del, 'auth_removida', v_auth_ok);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. A tabela morre por último — nada mais a referencia.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.creditos_medico;

-- ---------------------------------------------------------------------------
-- 8. GRANTs das funções recriadas (CREATE OR REPLACE preserva; as NOVAS não).
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.fn_credita_indicacao()          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.medico_tem_vinculo(text, text)  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO
--   SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prosrc LIKE '%creditos_medico%';
--   -- espera: 0 linhas
--
--   SELECT to_regclass('public.creditos_medico');          -- espera: NULL
--   SELECT tgname FROM pg_trigger WHERE NOT tgisinternal
--     AND tgrelid IN ('public.assinaturas'::regclass,'public.avaliacoes'::regclass);
--   -- espera: trg_credita_indicacao, trg_log_prescricao (os trg_libera_* sumiram)
--
--   -- vínculo continua de pé para o médico de teste:
--   SELECT public.medico_tem_vinculo('01352980754', '6302/BA');
-- ---------------------------------------------------------------------------
