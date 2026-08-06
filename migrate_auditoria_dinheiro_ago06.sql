-- ============================================================================
-- migrate_auditoria_dinheiro_ago06.sql
--
-- Cinco correções vindas da simulação das réguas de dinheiro (06/08/2026),
-- feita antes do lançamento. Cada uma tem o cenário numérico que a provou.
-- ============================================================================


-- ── 1) O médico podia FABRICAR o paciente que ele mesmo avalia ───────────────
--
-- `medico_avaliar_paciente` exige `paciente_existe`, que aceitava `avaliacoes`
-- e `oba_anamnese`. Só que `oba_pode_ver` — o porteiro dessas duas escritas — é
--     token_medico_ok(...) OR token_paciente_ok(cpf, ...)
-- e o ramo do médico NÃO OLHA O CPF. Ou seja: o token de médico grava em
-- QUALQUER CPF.
--
-- Receita completa: gerar um CPF com dígito verificador válido, gravar uma
-- avaliação nele (autorizado), e chamar `medico_avaliar_paciente` — o CPF agora
-- "existe" e nascem US$ 15. `creditos_avaliacao` não tem `assinatura_id`, então
-- `credito_lastreado` não alcança; a única trava restante é `medicos.validado`.
-- O UNIQUE limita a 1 por CPF, mas CPFs são infinitos: 20 CPFs = US$ 300.
--
-- CORREÇÃO: só `profiles` conta como prova de existência. É a única das três
-- tabelas que o médico NÃO cria sozinho — nasce do cadastro do paciente, com
-- CPF e senha dele.
--
-- Não quebra nada: a tela do médico (`carregarPacienteAvaliar`) JÁ exige perfil
-- cadastrado e recusa com "Paciente não cadastrado" antes de chegar aqui. Esta
-- mudança só faz o servidor cobrar o que a tela já cobrava.
CREATE OR REPLACE FUNCTION public.paciente_existe(p_cpf text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH d AS (SELECT regexp_replace(coalesce(p_cpf,''), '\D', '', 'g') AS cpf)
  SELECT public.cpf_valido((SELECT cpf FROM d))
     AND EXISTS (SELECT 1 FROM public.profiles t
                  WHERE regexp_replace(coalesce(t.cpf,''), '\D','','g') = (SELECT cpf FROM d));
$function$;

-- A mensagem prometia o que a régua não entrega ("ao menos uma triagem"):
-- quem só fez triagem era recusado por um texto dizendo que triagem bastava.
CREATE OR REPLACE FUNCTION public.medico_avaliar_paciente(
  p_crm text, p_token text, p_cpf text, p_opiniao text, p_sugestao text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_nao_afiliado'), 15);
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
$function$;

GRANT EXECUTE ON FUNCTION public.medico_avaliar_paciente(text, text, text, text, text) TO anon, authenticated;


-- ── 2) `admin_pendencias` comparava CPF CRU ─────────────────────────────────
--
-- `oba_anamnese.cpf` recebe formatos DIFERENTES conforme a porta: o painel do
-- paciente manda dígitos, mas o Calculator manda `inputs.cpf`, que é o CPF
-- MASCARADO que o médico digitou. `admin_pendencias` era a única função que
-- comparava sem normalizar (`DISTINCT ON (o.cpf)` e `r.cpf = u.cpf`).
--
-- Efeito: ciclo gravado como `01352980754` e revisão como `013.529.807-54` não
-- casam — a régua "existe revisão posterior" nunca acha, e a dúvida fica na
-- lista PARA SEMPRE. Exatamente a "lista que não se limpa" que a função diz ter
-- eliminado. (O `OBAModal` também passa a gravar normalizado — ver commit.)
CREATE OR REPLACE FUNCTION public.admin_pendencias(p_crm text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_med jsonb; v_presc int; v_duv jsonb; v_ped jsonb; v_crit jsonb; v_venc int; v_extr int;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'crm', m.crm, 'nome', m.nome, 'desde', m.created_at
         ) ORDER BY m.created_at), '[]'::jsonb) INTO v_med
    FROM public.medicos m WHERE m.validado IS NULL;

  SELECT count(*)::int INTO v_presc
    FROM public.medicos_prescritores WHERE NOT COALESCE(ativo, false);

  -- `cpfn` = CPF normalizado. Tudo abaixo compara por ele, nunca pelo cru.
  WITH linhas AS (
    SELECT o.id, regexp_replace(coalesce(o.cpf,''), '\D','','g') AS cpfn,
           o.relatorio_oba, o.estado_clinico, o.created_at, o.pendencias_ok, o.revisao_medica
      FROM public.oba_anamnese o
  ), ult AS (
    SELECT DISTINCT ON (l.cpfn) l.*
      FROM linhas l WHERE NOT COALESCE(l.revisao_medica, false)
     ORDER BY l.cpfn, l.created_at DESC
  )
  SELECT
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'cpf', '***.' || substr(u.cpfn,4,3) || '.' || substr(u.cpfn,7,3) || '-**',
              'n', jsonb_array_length(u.relatorio_oba->'form_snapshot'->'duvidas'),
              'em', u.created_at) ORDER BY u.created_at), '[]'::jsonb)
       FROM ult u
      WHERE jsonb_typeof(u.relatorio_oba->'form_snapshot'->'duvidas') = 'array'
        AND jsonb_array_length(u.relatorio_oba->'form_snapshot'->'duvidas') > 0
        AND NOT EXISTS (SELECT 1 FROM linhas r
                         WHERE r.cpfn = u.cpfn
                           AND COALESCE(r.revisao_medica, false)
                           AND r.created_at > u.created_at)),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'cpf', '***.' || substr(u.cpfn,4,3) || '.' || substr(u.cpfn,7,3) || '-**',
              'id', u.id, 'pedidos', u.relatorio_oba->'_pedidos',
              'em', u.created_at) ORDER BY u.created_at), '[]'::jsonb)
       FROM ult u
      WHERE jsonb_typeof(u.relatorio_oba->'_pedidos') = 'object'
        AND NOT (COALESCE(u.pendencias_ok,'{}'::jsonb) ? 'pedidos')),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'cpf', '***.' || substr(u.cpfn,4,3) || '.' || substr(u.cpfn,7,3) || '-**',
              'id', u.id, 'estado', u.estado_clinico,
              'em', u.created_at) ORDER BY u.created_at), '[]'::jsonb)
       FROM ult u
      WHERE upper(coalesce(u.estado_clinico,'')) IN ('CRITICO','CRÍTICO')
        AND NOT (COALESCE(u.pendencias_ok,'{}'::jsonb) ? 'critico'))
  INTO v_duv, v_ped, v_crit;

  SELECT count(*)::int INTO v_venc
    FROM public.assinaturas a
   WHERE a.status = 'ativa' AND a.data_fim IS NOT NULL
     AND a.data_fim < now() + interval '15 days';

  SELECT count(*)::int INTO v_extr
    FROM public.extratos_oba WHERE NOT COALESCE(entregue, false);

  RETURN jsonb_build_object(
    'ok', true,
    'medicos_a_validar',     jsonb_build_object('n', jsonb_array_length(v_med),  'linhas', v_med),
    'prescritores_a_ativar', v_presc,
    'duvidas_sem_revisao',   jsonb_build_object('n', jsonb_array_length(v_duv),  'linhas', v_duv),
    'pedidos_do_paciente',   jsonb_build_object('n', jsonb_array_length(v_ped),  'linhas', v_ped),
    'estado_critico',        jsonb_build_object('n', jsonb_array_length(v_crit), 'linhas', v_crit),
    'anuidades_vencendo',    v_venc,
    'extratos_a_entregar',   v_extr
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_pendencias(text, text) TO anon, authenticated;


-- ── 3) `caixa_a_pagar`: o bloco dos MÉDICOS ignorava o lastro ────────────────
--
-- Os blocos de indicador e de paciente-indicador aplicam `credito_lastreado`;
-- o de médico não. Efeito prático: crédito de assinatura BLOQUEADA continua
-- listado como "a pagar" e somado no total, mas `caixa_pagar_medico` se recusa
-- a pagá-lo — a linha nunca sai da lista e o total exibido fica inflado. É a
-- lista que não se limpa, de novo, agora no dinheiro.
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
          AND public.credito_lastreado(assinatura_id)    -- ⬅ NOVO
        GROUP BY medico_crm
      UNION ALL
      -- `creditos_avaliacao` NÃO tem `assinatura_id`: o crédito de AVALIAR não
      -- nasce de assinatura nenhuma, então não há lastro a checar aqui.
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
       AND public.credito_lastreado(c.assinatura_id)
       AND COALESCE(i2.tipo,'') <> 'paciente'
     GROUP BY c.indicador_codigo
  ) s JOIN public.indicadores i ON i.codigo = s.codigo;

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


-- ── 4) `assinatura_minha` escolhia a linha VENCIDA e se contradizia ──────────
--
-- `ORDER BY data_fim DESC NULLS LAST` põe uma linha VENCIDA na frente de uma com
-- `data_fim` nulo (não-nulo sempre vence nulo nessa ordenação). Com as duas no
-- mesmo CPF, a função devolvia a vencida (`vencida=true`, `dias_restantes=-30`)
-- junto com `valida=true` (que vem do EXISTS). A tela mostrava acesso liberado E
-- o banner "sua anuidade venceu" ao mesmo tempo.
--
-- Agora a ordenação prefere, antes de tudo, uma linha VÁLIDA — e só entre as
-- válidas (ou só entre as vencidas) desempata pela data.
CREATE OR REPLACE FUNCTION public.assinatura_minha(p_cpf text, p_pac_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_valida boolean;
  v jsonb;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  v_valida := public.assinatura_valida_cpf(v_cpf);

  SELECT jsonb_build_object(
           'id', a.id, 'status', a.status,
           'data_inicio', a.data_inicio, 'data_fim', a.data_fim,
           'valor_pago', a.valor_pago,
           'vencida', (a.data_fim IS NOT NULL AND a.data_fim < now()),
           'valida',  v_valida,
           'dias_restantes', CASE WHEN a.data_fim IS NULL THEN NULL
                                  ELSE ceil(EXTRACT(EPOCH FROM (a.data_fim - now())) / 86400)::int END
         )
    INTO v
    FROM public.assinaturas a
    JOIN public.profiles p ON p.id = a.user_id
   WHERE regexp_replace(coalesce(p.cpf,''), '\D','','g') = v_cpf
     AND a.status = 'ativa'
   -- ⬅ A linha VÁLIDA vem primeiro; só depois desempata pela data.
   ORDER BY (a.data_fim IS NULL OR a.data_fim >= now()) DESC,
            a.data_fim DESC NULLS LAST
   LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'assinatura', v, 'valida', COALESCE(v_valida, false));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.assinatura_minha(text, text) TO anon, authenticated;


-- ── 5) Pagamento do indicador liquidava o ledger SEM TETO ────────────────────
--
-- Cenário que quebra (crédito = R$50):
--   3 créditos, ledger R$100  →  saldo R$50.
--   O Caixa BLOQUEIA 2 assinaturas: sobram 1 crédito lastreado (R$50) contra
--   R$100 de ledger. O saldo real é −R$50, mas o `GREATEST(...,0)` mostra 0.
--   Pagar então liquidava os R$100 INTEIROS do ledger e ainda marcava o crédito
--   restante como pago — o indicador terminava com R$150 de benefício tendo
--   R$50 de crédito lastreado.
--
-- O comentário original dizia que `caixa_abater` impede o ledger de passar do
-- total. Impede NO INSTANTE DO ABATIMENTO — não depois de um bloqueio.
--
-- CORREÇÃO: liquida do mais antigo para o mais novo, só até o valor que os
-- créditos pagos realmente cobrem. O excesso fica ABERTO e segue descontando
-- de créditos futuros, que é a dívida real.
CREATE OR REPLACE FUNCTION public.caixa_pagar_indicador(p_token text, p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_c jsonb; v_usd numeric; v_cot numeric; v_unit numeric;
  v_saldo numeric; v_ledger numeric; v_vivos int; v_cobre numeric; v_n int; v_nled int := 0;
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
  v_vivos  := (v_c->>'vivos')::int;
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

  -- Quanto de ledger estes créditos de fato cobrem.
  v_cobre := LEAST(v_ledger, v_n * v_unit);

  IF v_n > 0 AND v_cobre > 0 THEN
    WITH acum AS (
      SELECT a.id, sum(a.valor_brl) OVER (ORDER BY a.created_at, a.id) AS ate_aqui
        FROM public.abatimentos_paciente a
       WHERE regexp_replace(coalesce(a.cpf_paciente,''), '\D','','g') = (v_c->>'cpf')
         AND a.liquidado_em IS NULL
    )
    UPDATE public.abatimentos_paciente x
       SET liquidado_em = now()
      FROM acum
     WHERE x.id = acum.id
       AND acum.ate_aqui <= v_cobre + 0.001;   -- folga p/ arredondamento
    GET DIAGNOSTICS v_nled = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('ok', true,
    'n', v_n,
    'total_brl',   v_saldo,
    'abatido_brl', v_cobre,
    'ledger_restante', round(v_ledger - v_cobre, 2),
    'abatimentos_liquidados', v_nled,
    'cotacao', v_cot);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.caixa_pagar_indicador(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
