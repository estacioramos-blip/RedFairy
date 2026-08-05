-- ============================================================================
-- migrate_paywall_servidor.sql
--
-- PROBLEMA: o paywall do RedFairy existe só no NAVEGADOR. `precisaPaywallNova`
-- (PatientDashboard) é o "porteiro único" da regra "1 avaliação concluída grátis
-- por CPF; da 2ª em diante exige assinatura" — e nenhuma RPC de gravação
-- consultava assinatura (conferido em `avaliacoes_salvar` e
-- `oba_anamnese_inserir`). Ou seja: a régua estava toda do lado de quem paga.
--
-- Corrigir o vencimento da assinatura (item 5 da auditoria) acertou QUEM está em
-- dia, mas não fechou a porta: quem abre o devtools, ou chama a RPC direto com a
-- chave anon (que é pública, está no bundle), grava avaliação à vontade. Com
-- anuidade de R$ 200 e usuários reais, isso é receita que vaza sem deixar
-- rastro — não dá nem para saber depois quantos passaram.
--
-- A REGRA, espelhada do cliente sem inventar nada:
--   bloqueia quando  (é o paciente) E (a linha é `concluida`)
--                E (já existe ≥1 OUTRA avaliação concluída deste CPF)
--                E (não há assinatura VÁLIDA — ativa e dentro do prazo).
--
-- Detalhes que importam:
--
-- · "OUTRA" é literal: o `id` que está sendo atualizado sai da contagem. Sem
--   isso, re-salvar a PRIMEIRA avaliação (o upsert acha a linha do mesmo dia —
--   o espelho da triagem, ou a própria linha já concluída) contaria a si mesma,
--   daria 1, e o paciente seria bloqueado na avaliação GRÁTIS dele.
--
-- · MÉDICO passa sempre. Ele avalia paciente dos outros; o paywall é do
--   autoatendimento. A checagem é `token_medico_ok` ANTES de tudo.
--
-- · NÃO isentei nenhum caminho. Cheguei a considerar isentar o ciclo do OBA
--   (bariátrico) pelo campo `bariatrica`, e seria um buraco: o formulário NORMAL
--   do paciente também manda `bariatrica`, então a isenção deixaria TODO
--   bariátrico fora do paywall — e bariátrico é o público do bariatrico.net.
--   `p_chave` ('user_id' no fluxo normal, 'cpf' no OBA) distinguiria, mas é
--   escolhido pelo cliente: quem quisesse burlar mandaria o outro valor.
--   Portanto a régua é a mesma para todos, e vale a regra comercial já acordada
--   ("bariátrico paga na 1ª"): se ele chegou ao 2º ciclo sem assinatura, barrar
--   é o comportamento certo, não um efeito colateral.
--
-- · A avaliação NÃO-concluída (o "espelho" da triagem, ferritina nula) continua
--   passando: ela não é uma avaliação usada, é rascunho de entrada.
--
-- ⚠ O QUE ISTO NÃO FAZ: não gateia `oba_anamnese_inserir` (a anamnese em si) nem
--   a leitura de histórico/gráfico. A anamnese continua gravando; o que passa a
--   ser recusado é a AVALIAÇÃO que fecha o ciclo. Ver a nota de UX no commit: o
--   ideal é o cliente mostrar o pagamento ANTES da anamnese, não depois.
--
-- Idempotente.
-- ============================================================================

-- Assinatura VÁLIDA = ativa E dentro do prazo. Mesma régua do
-- `assinatura_minha` (migrate_assinatura_vencida.sql), aqui em função própria
-- para não haver duas definições de "vale" no sistema — foi exatamente isso que
-- produziu o item 1 da auditoria (três réguas de saldo que não se enxergavam).
CREATE OR REPLACE FUNCTION public.assinatura_valida_cpf(p_cpf text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.assinaturas a
      JOIN public.profiles p ON p.id = a.user_id
     WHERE regexp_replace(coalesce(p.cpf,''), '\D','','g')
         = regexp_replace(coalesce(p_cpf,''), '\D','','g')
       AND a.status = 'ativa'
       AND (a.data_fim IS NULL OR a.data_fim >= now())
  );
$function$;

-- SEM GRANT para anon/authenticated, de propósito. Ela recebe só o CPF, sem
-- token — se fosse chamável de fora, qualquer um com a chave anon (que é
-- pública) descobriria, para QUALQUER CPF, se aquela pessoa tem assinatura paga.
-- Só é usada de dentro de `avaliacoes_salvar`, que é SECURITY DEFINER e portanto
-- roda como o dono da função: a chamada interna não precisa da concessão.
REVOKE EXECUTE ON FUNCTION public.assinatura_valida_cpf(text) FROM PUBLIC, anon, authenticated;


-- Quantas avaliações CONCLUÍDAS este CPF já tem, sem contar a linha que está
-- sendo atualizada agora.
CREATE OR REPLACE FUNCTION public.avaliacoes_concluidas_cpf(p_cpf text, p_excluir_id uuid DEFAULT NULL)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT count(*)::int
    FROM public.avaliacoes a
   WHERE regexp_replace(coalesce(a.cpf,''), '\D','','g')
       = regexp_replace(coalesce(p_cpf,''), '\D','','g')
     AND a.concluida IS TRUE
     AND (p_excluir_id IS NULL OR a.id <> p_excluir_id);
$function$;

-- Mesmo motivo da anterior: sem token, revelaria quantas avaliações qualquer
-- CPF já usou. Uso interno apenas.
REVOKE EXECUTE ON FUNCTION public.avaliacoes_concluidas_cpf(text, uuid) FROM PUBLIC, anon, authenticated;


-- `avaliacoes_salvar` com o porteiro. O corpo é o mesmo de antes — a única
-- mudança é o bloco marcado ⬅ PAYWALL, colocado DEPOIS de achar `v_id` (para
-- poder excluí-lo da contagem) e ANTES de qualquer escrita.
CREATE OR REPLACE FUNCTION public.avaliacoes_salvar(
  p_dados jsonb,
  p_modo text DEFAULT 'inserir'::text,
  p_chave text DEFAULT NULL::text,
  p_crm text DEFAULT NULL::text,
  p_med_token text DEFAULT NULL::text,
  p_pac_token text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_dados->>'cpf', ''), '\D', '', 'g');
  v_data text := p_dados->>'data_coleta';
  v_uid uuid;
  v_id uuid;
  v_cols text;
  v_n int;
  v_sql text;
  v_e_medico boolean;
  v_concluida boolean;
  v_alvo_ja_concluida boolean;
  v_ja int;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT public.oba_pode_ver(v_cpf, p_crm, p_med_token, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  BEGIN
    v_uid := nullif(p_dados->>'user_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_uid := NULL;
  END;

  -- Procura a linha existente conforme a chave pedida.
  IF p_chave = 'cpf' AND v_data IS NOT NULL THEN
    SELECT a.id INTO v_id FROM public.avaliacoes a
     WHERE regexp_replace(coalesce(a.cpf,''), '\D', '', 'g') = v_cpf
       AND a.data_coleta = v_data::date
     ORDER BY a.created_at DESC LIMIT 1;
  ELSIF p_chave = 'user_id' AND v_data IS NOT NULL AND v_uid IS NOT NULL THEN
    SELECT a.id INTO v_id FROM public.avaliacoes a
     WHERE a.user_id = v_uid AND a.data_coleta = v_data::date
     ORDER BY a.created_at DESC LIMIT 1;
  END IF;

  -- `se_ausente` sai ANTES do paywall: esta chamada não grava nada, e recusar o
  -- que antes era silenciosamente ignorado mudaria comportamento sem necessidade.
  IF v_id IS NOT NULL AND p_modo = 'se_ausente' THEN
    RETURN jsonb_build_object('ok', true, 'id', v_id, 'acao', 'ignorado');
  END IF;

  -- ⬅ PAYWALL (servidor). Ver o cabeçalho para o porquê de não haver isenção
  -- por caminho. Roda depois de achar `v_id` porque completar o "espelho" da
  -- triagem não pode contar contra o próprio paciente.
  v_e_medico  := public.token_medico_ok(p_crm, p_med_token);
  v_concluida := COALESCE((p_dados->>'concluida')::boolean, false);

  IF (NOT v_e_medico) AND v_concluida THEN
    -- A linha-alvo JÁ estava concluída antes desta chamada?
    v_alvo_ja_concluida := false;
    IF v_id IS NOT NULL THEN
      SELECT COALESCE(a.concluida, false) INTO v_alvo_ja_concluida
        FROM public.avaliacoes a WHERE a.id = v_id;
    END IF;

    -- Aqui estava o furo que quase passou. Excluir `v_id` da contagem sempre
    -- parecia justo ("não conta a linha que estou salvando"), mas `data_coleta`
    -- é digitada pelo usuário: bastava reenviar a MESMA data da avaliação
    -- gratuita para o upsert reencontrar aquela linha, ela sair da contagem,
    -- o total dar 0 e passar — reescrevendo a mesma avaliação para sempre, de
    -- graça. A trava pareceria funcionar e não travaria nada.
    --
    -- A exclusão só vale quando a linha AINDA NÃO estava concluída (o espelho da
    -- triagem sendo completado pela primeira vez — esse é o uso legítimo).
    -- Reescrever avaliação já usada NÃO devolve a cota.
    v_ja := public.avaliacoes_concluidas_cpf(
              v_cpf,
              CASE WHEN v_alvo_ja_concluida THEN NULL ELSE v_id END);

    IF v_ja >= 1 AND NOT public.assinatura_valida_cpf(v_cpf) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'erro', 'Assinatura necessaria: a avaliacao gratuita deste CPF ja foi usada.',
        'motivo', 'paywall',                -- o cliente usa isto p/ abrir o pagamento
        'concluidas', v_ja);
    END IF;
  END IF;

  IF v_id IS NOT NULL AND p_modo = 'upsert' THEN
    SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
      INTO v_cols, v_n
      FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = 'avaliacoes'
       AND c.column_name NOT IN ('id', 'created_at')
       AND p_dados ? c.column_name;
    IF v_cols IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
    END IF;
    IF v_n = 1 THEN
      v_sql := format('UPDATE public.avaliacoes SET %s = (SELECT %s FROM jsonb_populate_record(NULL::public.avaliacoes, $1)) WHERE id = $2', v_cols, v_cols);
    ELSE
      v_sql := format('UPDATE public.avaliacoes SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::public.avaliacoes, $1)) WHERE id = $2', v_cols, v_cols);
    END IF;
    EXECUTE v_sql USING p_dados, v_id;
    RETURN jsonb_build_object('ok', true, 'id', v_id, 'acao', 'atualizado');
  END IF;

  -- INSERT (modo 'inserir', ou upsert/se_ausente sem linha existente)
  SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
    INTO v_cols, v_n
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = 'avaliacoes'
     AND c.column_name NOT IN ('id', 'created_at')
     AND p_dados ? c.column_name;
  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  v_sql := format(
    'INSERT INTO public.avaliacoes (%s) SELECT %s FROM jsonb_populate_record(NULL::public.avaliacoes, $1) RETURNING id',
    v_cols, v_cols
  );
  EXECUTE v_sql USING p_dados INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'acao', 'inserido');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.avaliacoes_salvar(jsonb, text, text, text, text, text) TO anon, authenticated;

-- `assinatura_minha` passa a DERIVAR `valida` da mesma função, em vez de
-- reimplementar a régua. As duas coincidiam hoje, mas divergiriam num caso real:
-- `assinatura_minha` escolhe UMA linha (a de maior `data_fim`) e só depois
-- pergunta se ela vale — e em `DESC NULLS LAST` uma linha VENCIDA sempre vence
-- uma com `data_fim` nulo. Um CPF com as duas seria "inválido" aqui e "válido"
-- no paywall. Ter duas definições de "vale" foi exatamente o que produziu o
-- item 1 desta auditoria (três réguas de saldo que não se enxergavam).
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

  v_valida := public.assinatura_valida_cpf(v_cpf);   -- ⬅ fonte única

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
   ORDER BY a.data_fim DESC NULLS LAST
   LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'assinatura', v, 'valida', COALESCE(v_valida, false));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.assinatura_minha(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
