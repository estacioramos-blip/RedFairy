-- =============================================================================
-- migrate_caixa.sql   (CAIXA — tesouraria manual: conciliação, NF, encontro de contas)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
--
-- Rotina INDEPENDENTE (?modo=caixa) para pessoa autorizada com senha própria:
--   • ENTRADAS: anuidades (assinaturas) + documentos (pedidos_documento), carimbo de NF.
--   • A PAGAR: comissões devidas por pessoa (médico: encaminhar+avaliar; indicador puro),
--     baixa manual congela US$/cotação/R$ na linha (extrato fiel pra sempre).
--   • ENCONTRO DE CONTAS (paciente-indicador): saldo = créditos − abatimentos;
--     abate ANUIDADE FUTURA (estende assinatura +12m), DOCUMENTO, ou paga EXCEDENTE.
--   • EXTRATOS por médico/indicador/paciente (texto p/ WhatsApp — front monta).
--   • RELATÓRIO NF: com nota emitida × nota pendente (entradas e pagamentos).
--
-- Princípio: livro fino SOBRE as tabelas existentes (não duplica dados). Quando o
-- Stripe chegar, ele preenche automaticamente o que hoje é carimbado à mão.
--
-- Senha inicial do caixa: 'oba2026' — TROCAR no primeiro acesso (botão na tela).
-- Idempotente: ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT.
-- =============================================================================

-- 1) COLUNAS NOVAS ---------------------------------------------------------------
-- NF nas ENTRADAS
ALTER TABLE public.assinaturas       ADD COLUMN IF NOT EXISTS nf_emitida boolean DEFAULT false;
ALTER TABLE public.assinaturas       ADD COLUMN IF NOT EXISTS nf_numero  text;
ALTER TABLE public.assinaturas       ADD COLUMN IF NOT EXISTS nf_data    date;
ALTER TABLE public.pedidos_documento ADD COLUMN IF NOT EXISTS nf_emitida boolean DEFAULT false;
ALTER TABLE public.pedidos_documento ADD COLUMN IF NOT EXISTS nf_numero  text;
ALTER TABLE public.pedidos_documento ADD COLUMN IF NOT EXISTS nf_data    date;
-- NF + valores CONGELADOS na baixa (US$, cotação e R$ do momento do pagamento)
ALTER TABLE public.creditos_medico    ADD COLUMN IF NOT EXISTS valor_usd numeric;
ALTER TABLE public.creditos_medico    ADD COLUMN IF NOT EXISTS cotacao   numeric;
ALTER TABLE public.creditos_medico    ADD COLUMN IF NOT EXISTS valor_brl numeric;
ALTER TABLE public.creditos_medico    ADD COLUMN IF NOT EXISTS nf_emitida boolean DEFAULT false;
ALTER TABLE public.creditos_medico    ADD COLUMN IF NOT EXISTS nf_numero  text;
ALTER TABLE public.creditos_medico    ADD COLUMN IF NOT EXISTS nf_data    date;
ALTER TABLE public.creditos_indicador ADD COLUMN IF NOT EXISTS valor_usd numeric;
ALTER TABLE public.creditos_indicador ADD COLUMN IF NOT EXISTS cotacao   numeric;
ALTER TABLE public.creditos_indicador ADD COLUMN IF NOT EXISTS valor_brl numeric;
ALTER TABLE public.creditos_indicador ADD COLUMN IF NOT EXISTS nf_emitida boolean DEFAULT false;
ALTER TABLE public.creditos_indicador ADD COLUMN IF NOT EXISTS nf_numero  text;
ALTER TABLE public.creditos_indicador ADD COLUMN IF NOT EXISTS nf_data    date;
ALTER TABLE public.creditos_avaliacao ADD COLUMN IF NOT EXISTS valor_usd numeric;
ALTER TABLE public.creditos_avaliacao ADD COLUMN IF NOT EXISTS cotacao   numeric;
ALTER TABLE public.creditos_avaliacao ADD COLUMN IF NOT EXISTS valor_brl numeric;
ALTER TABLE public.creditos_avaliacao ADD COLUMN IF NOT EXISTS nf_emitida boolean DEFAULT false;
ALTER TABLE public.creditos_avaliacao ADD COLUMN IF NOT EXISTS nf_numero  text;
ALTER TABLE public.creditos_avaliacao ADD COLUMN IF NOT EXISTS nf_data    date;

-- 2) LIVRO DE ABATIMENTOS (encontro de contas do paciente-indicador) --------------
CREATE TABLE IF NOT EXISTS public.abatimentos_paciente (
  id           bigserial PRIMARY KEY,
  cpf_paciente text NOT NULL,
  tipo         text NOT NULL CHECK (tipo IN ('anuidade','documento','pix')),
  valor_brl    numeric NOT NULL,
  obs          text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.abatimentos_paciente ENABLE ROW LEVEL SECURITY;  -- acesso só via RPC

-- 3) AUTENTICAÇÃO DO CAIXA (senha própria + token de sessão, padrão do indicador) --
INSERT INTO public.config (chave, valor)
VALUES ('caixa_senha_hash', crypt('oba2026', gen_salt('bf', 10)))
ON CONFLICT (chave) DO NOTHING;

CREATE OR REPLACE FUNCTION public.caixa_token_ok(p_token text)
  RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
  SELECT coalesce(p_token,'') <> ''
     AND EXISTS (SELECT 1 FROM public.config WHERE chave='caixa_token_hash'
                   AND valor = encode(digest(p_token,'sha256'),'hex'))
     AND EXISTS (SELECT 1 FROM public.config WHERE chave='caixa_token_exp'
                   AND NULLIF(valor,'')::timestamptz > now());
$$;

CREATE OR REPLACE FUNCTION public.caixa_login(p_senha text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v_hash text; v_token text;
BEGIN
  SELECT valor INTO v_hash FROM public.config WHERE chave='caixa_senha_hash';
  IF v_hash IS NULL OR crypt(coalesce(p_senha,''), v_hash) <> v_hash THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Senha incorreta');
  END IF;
  v_token := encode(gen_random_bytes(24),'hex');
  INSERT INTO public.config (chave, valor) VALUES
    ('caixa_token_hash', encode(digest(v_token,'sha256'),'hex')),
    ('caixa_token_exp',  (now() + interval '7 days')::text)
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;
  RETURN jsonb_build_object('ok', true, 'token', v_token);
END; $$;

CREATE OR REPLACE FUNCTION public.caixa_trocar_senha(p_token text, p_nova text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  IF coalesce(length(p_nova),0) < 6 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Senha muito curta (minimo 6)'); END IF;
  UPDATE public.config SET valor = crypt(p_nova, gen_salt('bf',10)) WHERE chave='caixa_senha_hash';
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 4) ENTRADAS ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.caixa_entradas(p_token text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v_anu jsonb; v_doc jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id, 'nome', p.nome, 'cpf', p.cpf, 'valor', a.valor_pago, 'status', a.status,
      'data', a.created_at, 'data_fim', a.data_fim,
      'nf_emitida', a.nf_emitida, 'nf_numero', a.nf_numero, 'nf_data', a.nf_data
    ) ORDER BY a.created_at DESC), '[]'::jsonb)
    INTO v_anu
    FROM public.assinaturas a LEFT JOIN public.profiles p ON p.id = a.user_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', d.id, 'nome', d.nome, 'cpf', d.cpf, 'valor', d.valor_total, 'status', d.status,
      'data', COALESCE(d.pago_em, d.created_at), 'tipos', d.tipos_documento,
      'nf_emitida', d.nf_emitida, 'nf_numero', d.nf_numero, 'nf_data', d.nf_data
    ) ORDER BY COALESCE(d.pago_em, d.created_at) DESC), '[]'::jsonb)
    INTO v_doc
    FROM public.pedidos_documento d;
  RETURN jsonb_build_object('ok', true, 'anuidades', v_anu, 'documentos', v_doc);
END; $$;

-- 5) CARIMBO DE NF (genérico, tabela na whitelist) ----------------------------------
CREATE OR REPLACE FUNCTION public.caixa_nf(p_token text, p_tabela text, p_id text, p_emitida boolean, p_numero text DEFAULT NULL)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  IF p_tabela NOT IN ('assinaturas','pedidos_documento','creditos_medico','creditos_indicador','creditos_avaliacao') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Tabela invalida');
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET nf_emitida=$1, nf_numero=$2, nf_data=CASE WHEN $1 THEN COALESCE(nf_data, current_date) ELSE NULL END WHERE id::text = $3',
    p_tabela) USING p_emitida, NULLIF(btrim(coalesce(p_numero,'')),''), p_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 6) A PAGAR (agrupado por pessoa) ---------------------------------------------------
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
  v_anuidade:= COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_anuidade'), 149.90);

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

-- 7) BAIXAS (congela US$/cotação/R$ na linha) ----------------------------------------
CREATE OR REPLACE FUNCTION public.caixa_pagar_medico(p_token text, p_crm text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v_usd_enc numeric; v_usd_av numeric; v_cot numeric; v_n1 int; v_n2 int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd_enc := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_nao_afiliado'), 15);
  v_cot     := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;
  UPDATE public.creditos_medico
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_enc, cotacao=v_cot, valor_brl=round(v_usd_enc*v_cot,2)
   WHERE medico_crm=p_crm AND elegivel AND NOT pago;
  GET DIAGNOSTICS v_n1 = ROW_COUNT;
  UPDATE public.creditos_avaliacao
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_av, cotacao=v_cot, valor_brl=round(v_usd_av*v_cot,2)
   WHERE medico_crm=p_crm AND elegivel AND NOT pago;
  GET DIAGNOSTICS v_n2 = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'n_enc', v_n1, 'n_av', v_n2,
    'total_brl', round((v_n1*v_usd_enc + v_n2*v_usd_av)*v_cot, 2), 'cotacao', v_cot);
END; $$;

CREATE OR REPLACE FUNCTION public.caixa_pagar_indicador(p_token text, p_codigo text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v_usd numeric; v_cot numeric; v_n int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;
  UPDATE public.creditos_indicador
     SET pago=true, data_pagamento=now(), valor_usd=v_usd, cotacao=v_cot, valor_brl=round(v_usd*v_cot,2)
   WHERE indicador_codigo=p_codigo AND NOT pago AND NOT COALESCE(abatido,false);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'n', v_n, 'total_brl', round(v_n*v_usd*v_cot,2), 'cotacao', v_cot);
END; $$;

-- 8) ENCONTRO DE CONTAS (abater anuidade/documento, pagar excedente) ------------------
CREATE OR REPLACE FUNCTION public.caixa_abater(p_token text, p_cpf text, p_tipo text, p_valor numeric, p_obs text DEFAULT NULL)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_usd numeric; v_cot numeric; v_n int; v_abatido numeric; v_saldo numeric; v_uid uuid; v_rows int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  IF p_tipo NOT IN ('anuidade','documento','pix') THEN RETURN jsonb_build_object('ok', false, 'erro', 'Tipo invalido'); END IF;
  IF coalesce(p_valor,0) <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Valor invalido'); END IF;
  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;

  -- saldo atual = créditos (não pagos) × US$ × cotação − abatimentos já feitos
  SELECT count(*) INTO v_n
    FROM public.creditos_indicador c
    JOIN public.indicadores i ON i.codigo = c.indicador_codigo
   WHERE i.cpf = v_cpf AND COALESCE(i.tipo,'')='paciente' AND NOT c.pago;
  SELECT COALESCE(sum(valor_brl),0) INTO v_abatido FROM public.abatimentos_paciente WHERE cpf_paciente = v_cpf;
  v_saldo := round(v_n * v_usd * v_cot - v_abatido, 2);
  IF p_valor > v_saldo + 0.01 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Saldo insuficiente (saldo: R$ ' || to_char(v_saldo,'FM999990.00') || ')');
  END IF;

  -- ANUIDADE FUTURA: além de registrar, ESTENDE a assinatura ativa em +12 meses.
  IF p_tipo = 'anuidade' THEN
    SELECT id INTO v_uid FROM public.profiles WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1;
    IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente nao encontrado'); END IF;
    UPDATE public.assinaturas
       SET data_fim = GREATEST(COALESCE(data_fim, now()), now()) + interval '12 months', updated_at = now()
     WHERE user_id = v_uid AND status = 'ativa';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Paciente sem assinatura ativa para estender'); END IF;
  END IF;

  INSERT INTO public.abatimentos_paciente (cpf_paciente, tipo, valor_brl, obs)
  VALUES (v_cpf, p_tipo, round(p_valor,2), NULLIF(btrim(coalesce(p_obs,'')),''));
  RETURN jsonb_build_object('ok', true, 'saldo_novo', round(v_saldo - p_valor, 2));
END; $$;

-- 9) EXTRATO por pessoa ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.caixa_extrato(p_token text, p_papel text, p_chave text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_usd numeric; v_usd_av numeric; v_cot numeric; v_nome text; v_pix text;
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
      'saldo_brl', round(COALESCE(v_n,0)*v_usd*v_cot - v_abatido, 2), 'usd', v_usd, 'cotacao', v_cot);
  END IF;

  RETURN jsonb_build_object('ok', false, 'erro', 'Papel invalido');
END; $$;

-- 10) RELATÓRIO NF ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.caixa_relatorio_nf(p_token text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v_rec jsonb; v_pag jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  -- RECEBIMENTOS (anuidades ativas + documentos pagos)
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
  -- PAGAMENTOS (comissões pagas nas 3 tabelas)
  SELECT jsonb_build_object(
    'com_nf_n',  count(*) FILTER (WHERE nf_emitida),
    'com_nf_brl', COALESCE(sum(valor) FILTER (WHERE nf_emitida), 0),
    'sem_nf_n',  count(*) FILTER (WHERE NOT nf_emitida),
    'sem_nf_brl', COALESCE(sum(valor) FILTER (WHERE NOT nf_emitida), 0)
  ) INTO v_pag FROM (
    SELECT nf_emitida, COALESCE(valor_brl, 0) AS valor FROM public.creditos_medico WHERE pago
    UNION ALL
    SELECT nf_emitida, COALESCE(valor_brl, 0) FROM public.creditos_avaliacao WHERE pago
    UNION ALL
    SELECT nf_emitida, COALESCE(valor_brl, 0) FROM public.creditos_indicador WHERE pago
  ) p;
  RETURN jsonb_build_object('ok', true, 'recebimentos', v_rec, 'pagamentos', v_pag);
END; $$;

-- 11) GRANTS + reload --------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.caixa_token_ok(text)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_login(text)                             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_trocar_senha(text, text)                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_entradas(text)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_nf(text, text, text, boolean, text)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_a_pagar(text)                           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_pagar_medico(text, text)                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_pagar_indicador(text, text)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_abater(text, text, text, numeric, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_extrato(text, text, text)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_relatorio_nf(text)                      TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
