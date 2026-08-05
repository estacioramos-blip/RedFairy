-- ============================================================================
-- migrate_pedidos_documento_rpcs.sql
--
-- DOIS PROBLEMAS na mesma tabela (auditoria ago/2026):
--
-- (7) ESCRITA ABERTA A QUALQUER UM. `pedidos_documento` tem duas policies com
--     regra `true` para o papel público: "Qualquer um pode inserir" e "Qualquer
--     um pode atualizar" (UPDATE, `qual = true`, SEM filtro). Com a chave anon
--     — que é pública e está no bundle — dá para:
--       · marcar QUALQUER pedido como `pago` (corrompe justamente a lista que o
--         Caixa usa para conciliar com os PIX recebidos), e
--       · reescrever `texto_documentos`, que é o CONTEÚDO do pedido médico /
--         prescrição. Esse é o pior: altera o que foi solicitado ao paciente.
--     Isso mina o modelo "confia primeiro, verifica depois" do Dr. Ramos — a
--     verificação depende de um registro que hoje qualquer um pode falsificar.
--
-- (6) PEDIDO GRÁTIS INFINITO. `PatientDashboard` conta os pedidos de
--     `valor_total = 0` para saber se o paciente já usou o gratuito. Mas a única
--     policy de SELECT exige o papel `authenticated`, e o paciente NUNCA é
--     `authenticated` (pseudo-sessão por token; roda como `anon`). O RLS filtra
--     tudo e a contagem volta ZERO — sempre, sem erro. Falha 100% silenciosa:
--     basta recarregar para pedir de novo, indefinidamente.
--
-- SOLUÇÃO: mesmo padrão das Fases 1-3 — RPC SECURITY DEFINER gateada por token
-- ANTES, e só então apagar as policies. A contagem passa a ser feita por dentro,
-- onde o RLS não cega.
--
-- ── O CASO DO VISITANTE ANÔNIMO (decisão de desenho, não descuido) ───────────
-- O botão "Modo Médico — avaliação rápida SEM CADASTRO" (App.jsx) leva alguém
-- SEM login nenhum até o painel de documentos. Esse visitante não tem token de
-- espécie alguma. Exigir token dele quebraria um fluxo de produto que hoje
-- funciona — e, pior, quebraria em SILÊNCIO.
--
-- Então a autorização do INSERT tem três caminhos, e o que separa os dois
-- primeiros do terceiro é ONDE está o incentivo para forjar:
--   1. token de médico  → qualquer pedido;
--   2. token de paciente → qualquer pedido;
--   3. SEM token        → só pedido COBRADO (`valor_total > 0`), que nasce
--      'aguardando_pagamento' e só vale depois que o ADM confere o PIX. Forjar
--      isso não dá nada a ninguém: cria uma linha que ninguém vai conciliar.
-- O pedido GRATUITO (`valor_total = 0`) exige token de paciente — é justamente
-- ele que tem valor econômico e é o abuso do item (6).
--
-- O que NENHUM caminho permite: nascer 'pago', marcar pago sem token, ou tocar
-- em linha já existente. A brecha real (UPDATE `qual = true`) fecha para todos.
--
-- Idempotente. Rodar DEPOIS do deploy do código que usa as RPCs.
-- ============================================================================

-- ── 1) Inserir pedido ────────────────────────────────────────────────────────
-- Colunas dinâmicas com ALLOWLIST (o cliente não escolhe o que gravar).
-- `status` é aceito porque os dois fluxos usam valores diferentes
-- ('pendente_envio' no pedido grátis do paciente, 'aguardando_pagamento' no
-- documento montado pelo médico) — mas NUNCA 'pago': quem marca pago é a RPC
-- própria, abaixo, que exige token. `pago_em` e `created_at` ficam fora: o
-- primeiro pelo mesmo motivo, o segundo para o carimbo vir do banco (now()) e
-- não do relógio do aparelho.
CREATE OR REPLACE FUNCTION public.pedido_documento_inserir(
  p_dados jsonb,
  p_crm text DEFAULT NULL,
  p_med_token text DEFAULT NULL,
  p_pac_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf    text := regexp_replace(coalesce(p_dados->>'cpf',''), '\D', '', 'g');
  v_status text := coalesce(nullif(btrim(p_dados->>'status'),''), 'pendente_envio');
  v_valor  numeric := coalesce((p_dados->>'valor_total')::numeric, 0);
  v_med    boolean := public.token_medico_ok(p_crm, p_med_token);
  v_pac    boolean := public.token_paciente_ok(v_cpf, p_pac_token);
  v_cols   text;
  v_sql    text;
  v_id     bigint;
BEGIN
  -- Ver o cabeçalho: sem token só passa pedido COBRADO. O gratuito (o que tem
  -- valor econômico) exige o paciente provar quem é.
  IF NOT (v_med OR v_pac OR v_valor > 0) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT string_agg(quote_ident(c.column_name), ', ')
    INTO v_cols
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name   = 'pedidos_documento'
     AND c.column_name IN ('user_id','cpf','nome','data_nascimento','celular',
                           'tipos_documento','texto_documentos','valor_total')
     AND p_dados ? c.column_name;

  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  -- Nascer 'pago' é o que esta migração existe para impedir. Qualquer valor
  -- fora dos dois estados iniciais legítimos cai no padrão.
  IF v_status NOT IN ('pendente_envio', 'aguardando_pagamento') THEN
    v_status := 'pendente_envio';
  END IF;

  v_sql := format(
    'INSERT INTO public.pedidos_documento (%s, status) SELECT %s, $2 FROM jsonb_populate_record(NULL::public.pedidos_documento, $1) RETURNING id',
    v_cols, v_cols
  );
  EXECUTE v_sql USING p_dados, v_status INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.pedido_documento_inserir(jsonb, text, text, text) TO anon, authenticated;


-- ── 2) Marcar como pago ──────────────────────────────────────────────────────
-- Marca POR ID quando o cliente tem o id do insert (caminho normal). O celular
-- é só o fallback do pedido mais recente, como o código antigo fazia — e é
-- frágil de propósito reconhecer: celular de família/cuidador é compartilhado, e
-- por ele o paciente A podia marcar o pedido do paciente B. Com o id isso some.
-- Exige token nos DOIS caminhos: marcar pago é o que corrompe a conciliação.
CREATE OR REPLACE FUNCTION public.pedido_documento_marcar_pago(
  p_celular text DEFAULT NULL,
  p_crm text DEFAULT NULL,
  p_med_token text DEFAULT NULL,
  p_cpf text DEFAULT NULL,
  p_pac_token text DEFAULT NULL,
  p_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cel text := regexp_replace(coalesce(p_celular,''), '\D', '', 'g');
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_id  bigint;
BEGIN
  IF NOT (public.token_medico_ok(p_crm, p_med_token)
       OR public.token_paciente_ok(v_cpf, p_pac_token)) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  IF p_id IS NOT NULL THEN
    v_id := p_id;
  ELSIF v_cel <> '' THEN
    SELECT id INTO v_id FROM public.pedidos_documento
     WHERE regexp_replace(coalesce(celular,''), '\D', '', 'g') = v_cel
       AND coalesce(status,'') <> 'pago'
     ORDER BY created_at DESC LIMIT 1;
  ELSE
    RETURN jsonb_build_object('ok', false, 'erro', 'Informe id ou celular');
  END IF;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Pedido nao encontrado');
  END IF;

  UPDATE public.pedidos_documento
     SET status = 'pago', pago_em = now()
   WHERE id = v_id
     AND coalesce(status,'') <> 'pago';   -- não reescreve pago_em de pedido já pago

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.pedido_documento_marcar_pago(text, text, text, text, text, bigint) TO anon, authenticated;


-- ── 3) Já usou o pedido GRATUITO? ────────────────────────────────────────────
-- A contagem por dentro, onde o RLS não cega. Era isto que voltava 0 sempre.
CREATE OR REPLACE FUNCTION public.pedido_gratis_usado(p_cpf text, p_pac_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_uid uuid;
  v_n int;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- O código antigo contava por `user_id`; o insert grava os dois. Linhas
  -- antigas podem ter só um deles preenchido, então olhamos pelos dois — senão
  -- um pedido gratuito já usado passaria despercebido e a trava não pegaria.
  SELECT id INTO v_uid FROM public.profiles
   WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf LIMIT 1;

  SELECT count(*) INTO v_n
    FROM public.pedidos_documento
   WHERE COALESCE(valor_total, 0) = 0
     AND ( regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf
        OR (v_uid IS NOT NULL AND user_id = v_uid) );

  RETURN jsonb_build_object('ok', true, 'usado', (v_n > 0), 'total', v_n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.pedido_gratis_usado(text, text) TO anon, authenticated;


-- ── 4) SÓ AGORA: fecha a tabela ──────────────────────────────────────────────
-- As 4 policies saem: 2 eram `true` para o público (o buraco) e 2 miravam
-- `authenticated`, papel que o paciente nunca é (letra morta que ainda cegava a
-- contagem). Sem policy, o acesso é só pelas RPCs acima.
-- O ENABLE é explícito e idempotente: RLS já está ligado hoje, mas se por algum
-- motivo estivesse desligado, apagar as policies não fecharia NADA — a tabela
-- seguiria 100% aberta pelo GRANT do anon, e a migração "passaria com sucesso".
ALTER TABLE public.pedidos_documento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode inserir"      ON public.pedidos_documento;
DROP POLICY IF EXISTS "Qualquer um pode atualizar"    ON public.pedidos_documento;
DROP POLICY IF EXISTS "Paciente cria próprio pedido"  ON public.pedidos_documento;
DROP POLICY IF EXISTS "Paciente vê próprios pedidos"  ON public.pedidos_documento;

-- Confirmação: precisa voltar ZERO linhas. Se voltar alguma, algum nome de
-- policy mudou no banco e o DROP IF EXISTS não errou — só não fez nada.
SELECT policyname, cmd FROM pg_policies
 WHERE schemaname='public' AND tablename='pedidos_documento';

NOTIFY pgrst, 'reload schema';
