-- ============================================================================
-- migrate_pendencias.sql — o "robô de pendências"
--
-- POR QUE ISTO EXISTE: o modelo do Dr. Ramos é "confia primeiro, verifica
-- depois". A primeira metade está no código — o paciente clica "JÁ PAGUEI", a
-- assinatura nasce `ativa`, a comissão é gerada na hora. A segunda metade não
-- existia em lugar nenhum: a obrigação de conferir se o PIX entrou morava só na
-- memória do administrador. Com 4 pacientes dá para lembrar; com 200, não.
--
-- DUAS PARTES:
--
-- (1) O MARCADOR. `assinaturas` e `pedidos_documento` ganham `conferido_em` /
--     `conferido_obs`. Havia como BLOQUEAR uma assinatura, não havia como dizer
--     "conferi, o dinheiro entrou". Sem isso, uma lista de pendências mostraria
--     os mesmos itens para sempre — e lista que não se limpa vira ruído, que é
--     pior do que não ter lista. O marcador não é acabamento: é o que faz o
--     painel funcionar.
--
-- (2) OS AGREGADORES. `caixa_pendencias` (dinheiro) e `admin_pendencias`
--     (clínico/operacional). Quase tudo já era derivável do que existe — estas
--     funções reúnem, não criam encanamento novo. A separação segue as senhas
--     que já são separadas: cada um vê o que pode resolver.
--
-- ⚠ `conferido_em` NÃO é o mesmo que `status`/`pago`. Status é o que o
--   PACIENTE declarou; `conferido_em` é o que a TESOURARIA confirmou. Misturar
--   os dois apagaria justamente a distinção que este trabalho existe para criar.
--
-- Idempotente.
-- ============================================================================

-- ── 1) O marcador de conferência ─────────────────────────────────────────────
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS conferido_em  timestamptz,
  ADD COLUMN IF NOT EXISTS conferido_obs text;

ALTER TABLE public.pedidos_documento
  ADD COLUMN IF NOT EXISTS conferido_em  timestamptz,
  ADD COLUMN IF NOT EXISTS conferido_obs text;

COMMENT ON COLUMN public.assinaturas.conferido_em IS
  'Quando a TESOURARIA confirmou o recebimento. NULL = o paciente declarou pagamento e ninguem conferiu ainda. Diferente de `status`, que e a declaracao do paciente.';
COMMENT ON COLUMN public.pedidos_documento.conferido_em IS
  'Idem: quando a tesouraria confirmou o recebimento deste pedido.';

-- Índices parciais: as duas consultas do painel filtram exatamente por isto.
CREATE INDEX IF NOT EXISTS idx_assinaturas_nao_conferidas
  ON public.assinaturas (created_at) WHERE conferido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_pedidos_nao_conferidos
  ON public.pedidos_documento (created_at) WHERE conferido_em IS NULL;

-- ── 1b) Baixa das pendências CLÍNICAS ────────────────────────────────────────
-- Mesma lição do marcador de dinheiro, aplicada ao clínico: sem um jeito de dar
-- baixa, "paciente em estado CRÍTICO" e "pedido do paciente" ficariam na lista
-- até o próximo ciclo do OBA — que pode levar meses — mesmo depois de o médico
-- já ter ligado e resolvido. A lista deixaria de ser confiável.
--
-- Um jsonb (e não uma coluna por tipo) porque são pendências de naturezas
-- diferentes sobre a MESMA linha, e a lista pode crescer sem nova migration.
-- Chaves em uso: 'critico', 'pedidos'.
--
-- As DÚVIDAS ficam de fora de propósito: elas se resolvem sozinhas quando o
-- médico revisa (existe linha de revisão posterior ao ciclo) — não precisa de
-- baixa manual, e oferecer uma seria convidar a "resolver" sem revisar.
ALTER TABLE public.oba_anamnese
  ADD COLUMN IF NOT EXISTS pendencias_ok jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.oba_anamnese.pendencias_ok IS
  'Baixa manual de pendencias clinicas do painel do Admin. Ex.: {"critico":"2026-08-06T...","pedidos":"..."}. Nao altera nada clinico — so tira da lista de afazeres.';

-- Recebe o ID DA LINHA, não o CPF: o painel mostra o CPF mascarado, e mandar o
-- CPF cheio de volta só para dar baixa desfaria a máscara sem necessidade.
CREATE OR REPLACE FUNCTION public.admin_pendencia_baixar(
  p_crm text, p_token text, p_id uuid, p_tipo text, p_desfazer boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_n int;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  IF p_tipo NOT IN ('critico','pedidos') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Tipo invalido');
  END IF;

  UPDATE public.oba_anamnese
     SET pendencias_ok = CASE WHEN p_desfazer
           THEN COALESCE(pendencias_ok,'{}'::jsonb) - p_tipo
           ELSE COALESCE(pendencias_ok,'{}'::jsonb) || jsonb_build_object(p_tipo, now()) END
   WHERE id = p_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n = 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Anamnese nao encontrada'); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_pendencia_baixar(text, text, uuid, text, boolean) TO anon, authenticated;


-- ── 2) Marcar / desmarcar conferido ──────────────────────────────────────────
-- Mesmo padrão do `caixa_nf` (`id::text = $x`), porque os ids têm tipos
-- diferentes: `assinaturas.id` é uuid e `pedidos_documento.id` é bigint.
CREATE OR REPLACE FUNCTION public.caixa_conferir(
  p_token text, p_tabela text, p_id text, p_conferido boolean, p_obs text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_n int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  IF p_tabela NOT IN ('assinaturas','pedidos_documento') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Tabela invalida');
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET conferido_em = CASE WHEN $1 THEN COALESCE(conferido_em, now()) ELSE NULL END,
                          conferido_obs = CASE WHEN $1 THEN $2 ELSE NULL END
      WHERE id::text = $3', p_tabela)
    USING p_conferido, NULLIF(btrim(coalesce(p_obs,'')),''), p_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n = 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Registro nao encontrado'); END IF;
  RETURN jsonb_build_object('ok', true, 'n', v_n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.caixa_conferir(text, text, text, boolean, text) TO anon, authenticated;


-- ── 3) Pendências de DINHEIRO (Caixa) ────────────────────────────────────────
-- Cada bloco devolve `n` (para o contador) e as linhas (para a lista).
CREATE OR REPLACE FUNCTION public.caixa_pendencias(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_ass jsonb; v_ped jsonb; v_nf jsonb;
  v_med int; v_ind int; v_pac int; v_pagar jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;

  -- (a) Assinaturas declaradas pelo paciente e AINDA NÃO conferidas.
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

  -- (b) Pedidos que o paciente marcou como pagos e ninguém conferiu.
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

  -- (c) Comissões a pagar — reaproveita a régua já existente, sem duplicar.
  v_pagar := public.caixa_a_pagar(p_token);
  v_med := COALESCE(jsonb_array_length(v_pagar->'medicos'), 0);
  v_ind := COALESCE(jsonb_array_length(v_pagar->'indicadores'), 0);
  SELECT count(*)::int INTO v_pac FROM jsonb_array_elements(COALESCE(v_pagar->'pacientes','[]'::jsonb)) e
   WHERE COALESCE((e->>'saldo_brl')::numeric, 0) > 0;

  -- (d) Nota fiscal pendente sobre o que JÁ foi pago.
  SELECT jsonb_build_object(
           'medicos',    (SELECT count(*) FROM public.creditos_medico    WHERE pago AND NOT COALESCE(nf_emitida,false)),
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
$function$;

GRANT EXECUTE ON FUNCTION public.caixa_pendencias(text) TO anon, authenticated;


-- ── 4) Pendências CLÍNICAS / OPERACIONAIS (Admin) ────────────────────────────
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

  -- (a) Médicos aguardando validação (selfie com a carteira). Enquanto NULL, o
  --     crédito deles fica retido — é a pendência que custa dinheiro a eles.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'crm', m.crm, 'nome', m.nome, 'desde', m.created_at
         ) ORDER BY m.created_at), '[]'::jsonb) INTO v_med
    FROM public.medicos m WHERE m.validado IS NULL;

  SELECT count(*)::int INTO v_presc
    FROM public.medicos_prescritores WHERE NOT COALESCE(ativo, false);

  -- (b) Última anamnese de cada CPF. As três pendências clínicas saem dela, e
  --     calcular uma vez evita varrer a tabela três vezes.
  WITH ult AS (
    SELECT DISTINCT ON (o.cpf) o.id, o.cpf, o.relatorio_oba, o.estado_clinico, o.created_at, o.pendencias_ok
      FROM public.oba_anamnese o
     WHERE NOT COALESCE(o.revisao_medica, false)
     ORDER BY o.cpf, o.created_at DESC
  )
  SELECT
    -- Dúvidas do paciente que nenhum médico revisou ainda.
    --
    -- ⚠ A régua é "existe REVISÃO POSTERIOR a este ciclo?", e não ler
    -- `_revisado_por_medico` nesta linha. Esse marcador é gravado só na LINHA DA
    -- REVISÃO — que a CTE descarta de propósito, porque o ciclo do paciente é
    -- que carrega as dúvidas. Lendo o marcador aqui, a condição seria SEMPRE
    -- verdadeira e a pendência ficaria na lista para sempre, mesmo revisada:
    -- exatamente a "lista que não se limpa" que esta migração existe para evitar.
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'cpf', '***.' || substr(regexp_replace(u.cpf,'\D','','g'),4,3) || '.' || substr(regexp_replace(u.cpf,'\D','','g'),7,3) || '-**',
              'n', jsonb_array_length(u.relatorio_oba->'form_snapshot'->'duvidas'),
              'em', u.created_at) ORDER BY u.created_at), '[]'::jsonb)
       FROM ult u
      WHERE jsonb_typeof(u.relatorio_oba->'form_snapshot'->'duvidas') = 'array'
        AND jsonb_array_length(u.relatorio_oba->'form_snapshot'->'duvidas') > 0
        AND NOT EXISTS (
              SELECT 1 FROM public.oba_anamnese r
               WHERE r.cpf = u.cpf
                 AND COALESCE(r.revisao_medica, false)
                 AND r.created_at > u.created_at)),
    -- Pedidos que o paciente fez na conclusão (teleconsulta / exames).
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'cpf', '***.' || substr(regexp_replace(u.cpf,'\D','','g'),4,3) || '.' || substr(regexp_replace(u.cpf,'\D','','g'),7,3) || '-**',
              'id', u.id,
              'pedidos', u.relatorio_oba->'_pedidos',
              'em', u.created_at) ORDER BY u.created_at), '[]'::jsonb)
       FROM ult u
      WHERE jsonb_typeof(u.relatorio_oba->'_pedidos') = 'object'
        AND NOT (COALESCE(u.pendencias_ok,'{}'::jsonb) ? 'pedidos')),
    -- Estado clínico crítico na avaliação mais recente.
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'cpf', '***.' || substr(regexp_replace(u.cpf,'\D','','g'),4,3) || '.' || substr(regexp_replace(u.cpf,'\D','','g'),7,3) || '-**',
              'id', u.id,
              'estado', u.estado_clinico,
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

NOTIFY pgrst, 'reload schema';
