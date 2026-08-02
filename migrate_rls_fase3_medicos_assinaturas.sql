-- ============================================================================
-- migrate_rls_fase3_medicos_assinaturas.sql   (RLS Fase 3 — as 2 que faltavam)
--
-- PROBLEMA (auditoria ago/2026 — confirmado ao vivo, lendo da internet com a
-- chave anon, que é pública e está no bundle):
--
--   `medicos`     → RLS DESLIGADO e ZERO policies. anon tem SELECT/INSERT/
--                   UPDATE/DELETE. Devolve `senha_klipbit` (hash bcrypt da
--                   senha), `session_token_hash`, CPF, chave PIX e o
--                   `telegram_chat_id` de TODOS os médicos.
--   `assinaturas` → RLS DESLIGADO. As 2 policies existentes miram o papel
--                   `authenticated`, que o paciente NUNCA é (ele usa
--                   pseudo-sessão por token e roda como `anon`) — logo são
--                   letra morta mesmo se o RLS fosse ligado.
--
-- O ATAQUE, em uma linha: como `token_medico_ok`/`token_admin_ok` comparam
-- `session_token_hash = sha256(token)`, qualquer pessoa faz um PATCH em
-- `medicos` gravando o hash de um token escolhido por ela e VIRA aquele médico
-- — inclusive um `is_admin`. Isso derrota a régua do vínculo, derrota a
-- validação do cadastro e entrega o painel administrativo. É por isso que as
-- duas migrações anteriores NÃO PROTEGEM enquanto esta não rodar.
--
-- ⚠ POR QUE NÃO BASTA "ALTER TABLE ... ENABLE ROW LEVEL SECURITY":
-- o app faz 14 acessos DIRETOS a estas tabelas (12 em `medicos`, 3 em
-- `assinaturas`). Ligar o RLS sem migrar antes DERRUBA em produção: o login do
-- médico, o cadastro de afiliado/PIX, o registro do pagamento da anuidade e o
-- alerta de anuidades no Admin. Esta migração cria as RPCs ANTES do ENABLE, na
-- mesma ordem das Fases 1 e 2.
--
-- ORDEM OBRIGATÓRIA:
--   1. rodar ESTE arquivo (cria as RPCs e SÓ DEPOIS liga o RLS, no fim)
--   2. o deploy do código que usa as RPCs já está no ar (é inerte antes disto)
--   3. testar: login do médico, cadastro de afiliado, pagamento da anuidade
--
-- Idempotente. Rodar depois de migrate_vinculo_medico_paciente.sql e
-- migrate_validacao_medico.sql.
-- ============================================================================

-- ── 1) Existe este CRM? (fork login × cadastro, ANTES de haver token) ────────
-- Pública de propósito e por necessidade: a tela precisa decidir se mostra
-- "entrar" ou "cadastrar" antes de qualquer credencial existir. Devolve
-- APENAS um booleano — nenhum dado do médico. A exposição residual é saber se
-- um CRM está cadastrado, da mesma natureza da já aceita em `lookup_cpf_triagem`.
CREATE OR REPLACE FUNCTION public.medico_crm_existe(p_crm text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT jsonb_build_object('ok', true, 'existe',
    EXISTS (SELECT 1 FROM public.medicos m WHERE m.crm = upper(btrim(coalesce(p_crm,'')))));
$function$;

GRANT EXECUTE ON FUNCTION public.medico_crm_existe(text) TO anon, authenticated;


-- ── 2) O médico lê o PRÓPRIO cadastro ───────────────────────────────────────
-- NUNCA devolve senha_klipbit nem session_token_hash — é o vazamento que esta
-- fase existe para fechar. Só os campos que as telas consomem.
CREATE OR REPLACE FUNCTION public.medico_meu(p_crm text, p_med_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_med_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  -- Monta por SUBTRAÇÃO (padrão já usado em `profiles_meu`), não listando
  -- coluna por coluna. Duas razões:
  --   1) SEGURANÇA: o que não pode sair fica explícito aqui. Listar campos um
  --      a um esconde a decisão e, se amanhã nascer uma coluna sensível, ela
  --      não vaza por esquecimento — porque só sai o que sobrou da subtração.
  --   2) ROBUSTEZ: `plataforma`/`validado` vêm das migrações anteriores. Se
  --      esta rodasse antes delas, um jsonb_build_object citando essas colunas
  --      criaria a função EM SILÊNCIO (plpgsql não valida nome de coluna na
  --      criação) e só estouraria na 1ª chamada — já com o RLS ligado no fim
  --      deste arquivo, ou seja, sem caminho de volta. Assim a ordem não importa.
  SELECT to_jsonb(m.*)
           - 'senha_klipbit' - 'session_token_hash' - 'session_token_exp'
    INTO v
    FROM public.medicos m
   WHERE m.crm = upper(btrim(coalesce(p_crm,'')))
   LIMIT 1;
  RETURN jsonb_build_object('ok', true, 'medico', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.medico_meu(text, text) TO anon, authenticated;


-- ── 3) O médico atualiza o PRÓPRIO cadastro (dados de afiliado/PIX) ─────────
-- ALLOWLIST explícita, não lista negra. Um esquecimento numa lista negra deixa
-- o médico se promover: `is_admin`, `plataforma` e `validado` decidem,
-- respectivamente, o painel administrativo, o alcance a QUALQUER prontuário e
-- a liberação do dinheiro. `crm`/`id` não mudam (são a identidade) e
-- `senha_klipbit`/`session_token_hash` jamais entram por patch.
CREATE OR REPLACE FUNCTION public.medico_atualizar_meu(
  p_crm text, p_med_token text, p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_crm  text := upper(btrim(coalesce(p_crm,'')));
  v_cols text;
  v_n    int;
  v_sql  text;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_med_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
    INTO v_cols, v_n
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name   = 'medicos'
     -- `telegram_chat_id` fica FORA de propósito: nenhum código cliente grava
     -- esse campo, e deixá-lo aqui permitiria o médico apontar as próprias
     -- notificações (que carregam contexto de paciente) para o chat de um
     -- terceiro. Privilégio sem uso é superfície de ataque de graça.
     AND c.column_name IN ('nome','uf','celular','email','sexo','endereco','cep',
                           'cpf','pix_chave','pix_titular','pix_titular_pj',
                           'pix_cnpj','usa_telegram')
     AND p_patch ? c.column_name;

  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  -- `SET (a,b) = (SELECT ...)` exige 2+ colunas; com 1 só, forma simples.
  IF v_n = 1 THEN
    v_sql := format('UPDATE public.medicos SET %s = (SELECT %s FROM jsonb_populate_record(NULL::public.medicos, $1)) WHERE crm = $2', v_cols, v_cols);
  ELSE
    v_sql := format('UPDATE public.medicos SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::public.medicos, $1)) WHERE crm = $2', v_cols, v_cols);
  END IF;
  EXECUTE v_sql USING p_patch, v_crm;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Medico nao encontrado');
  END IF;
  RETURN jsonb_build_object('ok', true, 'crm', v_crm);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.medico_atualizar_meu(text, text, jsonb) TO anon, authenticated;


-- ── 4) Assinatura: o paciente lê a PRÓPRIA ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.assinatura_minha(p_cpf text, p_pac_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v jsonb;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  SELECT jsonb_build_object('id', a.id, 'status', a.status,
                            'data_inicio', a.data_inicio, 'data_fim', a.data_fim,
                            'valor_pago', a.valor_pago)
    INTO v
    FROM public.assinaturas a
    JOIN public.profiles p ON p.id = a.user_id
   WHERE regexp_replace(coalesce(p.cpf,''), '\D','','g') = v_cpf
     AND a.status = 'ativa'
   ORDER BY a.data_fim DESC
   LIMIT 1;
  RETURN jsonb_build_object('ok', true, 'assinatura', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.assinatura_minha(text, text) TO anon, authenticated;


-- ── 5) Assinatura: registrar o pagamento ("JÁ PAGUEI") ──────────────────────
-- O user_id vem do CPF autenticado, NÃO do cliente — senão daria para criar
-- assinatura para qualquer um.
CREATE OR REPLACE FUNCTION public.assinatura_registrar_pagamento(
  p_cpf text, p_pac_token text, p_valor numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_uid uuid;
  v_id  uuid;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT p.id INTO v_uid FROM public.profiles p
   WHERE regexp_replace(coalesce(p.cpf,''), '\D','','g') = v_cpf LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Perfil nao encontrado');
  END IF;

  INSERT INTO public.assinaturas (user_id, status, data_inicio, data_fim, valor_pago)
  VALUES (v_uid, 'ativa', now(), now() + interval '365 days', p_valor)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.assinatura_registrar_pagamento(text, text, numeric) TO anon, authenticated;


-- ── 6) Admin: anuidades vencendo ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_assinaturas_vencendo(
  p_crm text, p_token text, p_dias int DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  -- Uma linha por usuário (a de vencimento mais distante), como o código fazia.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', x.user_id, 'data_fim', x.data_fim)
                            ORDER BY x.data_fim ASC), '[]'::jsonb)
    INTO v
    FROM (
      SELECT DISTINCT ON (a.user_id) a.user_id, a.data_fim
        FROM public.assinaturas a
       WHERE a.status = 'ativa'
         AND a.data_fim <= now() + make_interval(days => greatest(0, coalesce(p_dias,15)))
       ORDER BY a.user_id, a.data_fim DESC
    ) x;
  RETURN jsonb_build_object('ok', true, 'assinaturas', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_assinaturas_vencendo(text, text, int) TO anon, authenticated;


-- ── 6b) Fecha a porta que o RLS NÃO fecha ───────────────────────────────────
-- Ligar o RLS não alcança funções SECURITY DEFINER já concedidas ao `anon`:
-- elas rodam como `postgres` (rolbypassrls) e ignoram RLS. `complete_medico`
-- é anon, NÃO EXIGE TOKEN e faz UPDATE em `medicos` — qualquer pessoa reescreve
-- nome, celular, e-mail e sexo de QUALQUER médico. O nome é o que sai impresso
-- em receita e pedido de exame; o celular é justamente por onde a ADM valida o
-- cadastro pelo WhatsApp (migrate_validacao_medico.sql). Seu único chamador
-- passou a usar `medico_atualizar_meu`, que exige token.
-- REVOKE (e não DROP) — reversível, e o REVOKE precisa de FROM PUBLIC senão
-- falha em silêncio, deixando o privilégio herdado valendo.
REVOKE EXECUTE ON FUNCTION public.complete_medico(text, text, text, text, text) FROM PUBLIC, anon, authenticated;


-- ── 7) SÓ AGORA: liga o RLS ─────────────────────────────────────────────────
-- Zero policies de propósito: todo acesso legítimo passa pelas RPCs
-- SECURITY DEFINER acima (que rodam como `postgres` e ignoram RLS). As 2
-- policies antigas de `assinaturas` miram `authenticated` e nunca casariam com
-- a pseudo-sessão do paciente — são removidas para não darem falsa impressão
-- de proteção. Depois disto, `senha_klipbit` e `session_token_hash` deixam de
-- ser alcançáveis pela internet.
DROP POLICY IF EXISTS "Paciente cria própria assinatura" ON public.assinaturas;
DROP POLICY IF EXISTS "Paciente vê própria assinatura"   ON public.assinaturas;

ALTER TABLE public.medicos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
