-- ============================================================================
-- migrate_operadores.sql — conta própria para os auxiliares (Arthur, Laíse)
-- ============================================================================
--
-- POR QUE
-- Até aqui a "senha de administrador" do chapéu entrava na LINHA DE MÉDICO do
-- Estácio (medicos.is_admin = true, plataforma = true). Consequências:
--   1. para o banco, o auxiliar ERA o Estácio — médico de plataforma, com
--      alcance clínico. A aba Pacientes só sumia por uma marcação no
--      navegador, o que não é controle de acesso;
--   2. se o auxiliar abrisse uma ficha, a trilha `acessos_paciente` gravava o
--      CRM do Estácio, e o paciente via o nome dele em "quem abriu". Uma trilha
--      que registra o autor errado prova uma coisa falsa — pior que não ter;
--   3. o login gravava a sessão na linha do Estácio: cada entrada do auxiliar
--      derrubava a sessão de médico dele, e vice-versa.
--
-- O QUE FAZ
--   • tabela `operadores`: conta sem CRM e sem plataforma. Não existe em
--     `medicos`, então nenhuma régua clínica a reconhece — a recusa é
--     estrutural, não depende de lembrar de checar;
--   • identificador de sessão 'OP:<LOGIN>' — passa no mesmo par p_crm/p_token
--     que as RPCs de admin já recebem, e nunca coincide com um CRM;
--   • dois níveis: token_admin_ok (o Estácio, tudo) e token_gestao_ok
--     (Estácio OU operador). As 15 RPCs operacionais passam para o segundo;
--     as 10 de decisão/clínicas ficam no primeiro (lista no passo 5); duas
--     são MISTAS e foram escritas à mão (passos 6 e 6b);
--   • admin_validar_medico: operador VALIDA, não INVALIDA. Validar é conferir
--     documento; invalidar tira alguém de circulação (decisão do Estácio,
--     19/09/2026). `validado_por` passa a registrar QUEM validou;
--   • o Estácio cria, redefine a senha e desativa operadores (só ele).
--
-- ⚠ DEPOIS DE RODAR: o Estácio troca a própria senha de administrador. Quem
--   usava o Admin até hoje conhece a atual — sem a troca, nada disto vale.
--
-- Idempotente: pode rodar de novo sem efeito colateral.
-- ============================================================================

BEGIN;

-- ── 1. Tabela ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operadores (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login              text NOT NULL UNIQUE CHECK (login ~ '^[A-Z0-9_]{2,20}$'),
  nome               text NOT NULL,
  senha_hash         text NOT NULL,
  session_token_hash text,
  session_token_exp  timestamptz,
  ativo              boolean NOT NULL DEFAULT true,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  criado_por         text,
  senha_definida_em  timestamptz,
  senha_definida_por text
);

-- Mesmo regime das outras tabelas: RLS ligado, ZERO policies. Acesso só por
-- RPC SECURITY DEFINER.
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operadores FROM anon, authenticated;

-- ── 2. Portões ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.token_operador_ok(p_crm text, p_token text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT upper(btrim(coalesce(p_crm,''))) LIKE 'OP:%'
     AND coalesce(p_token,'') <> ''
     AND EXISTS (
       SELECT 1 FROM public.operadores o
        WHERE 'OP:' || o.login = upper(btrim(p_crm))
          AND o.ativo
          AND o.session_token_hash = encode(digest(p_token,'sha256'),'hex')
          AND o.session_token_exp > now()
     );
$function$;

-- Gestão = o que o painel faz no dia a dia. Clínico e decisão NÃO passam aqui.
CREATE OR REPLACE FUNCTION public.token_gestao_ok(p_crm text, p_token text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT public.token_admin_ok(p_crm, p_token)
      OR public.token_operador_ok(p_crm, p_token);
$function$;

-- ── 3. Login do operador (porta do chapéu, campo único de senha) ────────────
-- A senha decide a porta. Por isso a senha de um operador não pode coincidir
-- com a do Caixa, a do administrador ou a de outro operador — garantido na
-- criação (passo 4).
CREATE OR REPLACE FUNCTION public.restrito_operador_login(p_senha text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_op  public.operadores%ROWTYPE;
  v_tok text;
BEGIN
  IF coalesce(p_senha,'') = '' THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT * INTO v_op FROM public.operadores o
   WHERE o.ativo AND o.senha_hash = crypt(p_senha, o.senha_hash)
   LIMIT 1;
  IF v_op.id IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_tok := encode(gen_random_bytes(32),'hex');
  UPDATE public.operadores
     SET session_token_hash = encode(digest(v_tok,'sha256'),'hex'),
         session_token_exp  = now() + interval '7 days'
   WHERE id = v_op.id;

  RETURN jsonb_build_object('ok', true,
    'id',    'OP:' || v_op.login,
    'nome',  v_op.nome,
    'token', v_tok);
END;
$function$;

-- O login do administrador pelo chapéu passa a devolver `plataforma`. Antes
-- não devolvia, e o painel escondia a aba Pacientes do próprio Estácio quando
-- ele entrava por esta porta (a marcação do navegador ficava vazia).
CREATE OR REPLACE FUNCTION public.restrito_admin_login(p_senha text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH
  v AS MATERIALIZED (
    SELECT p_senha AS senha, encode(gen_random_bytes(32),'hex') AS tok
  ),
  m AS (
    SELECT med.id, med.nome, med.crm, med.is_admin, med.plataforma
    FROM public.medicos med, v
    WHERE med.is_admin = true
      AND med.senha_klipbit IS NOT NULL
      AND med.senha_klipbit = crypt(v.senha, med.senha_klipbit)
    LIMIT 1
  ),
  gravado AS (
    UPDATE public.medicos SET
      session_token_hash = encode(digest((SELECT tok FROM v),'sha256'),'hex'),
      session_token_exp  = now() + interval '30 days'
    WHERE id = (SELECT id FROM m)
    RETURNING id
  )
  SELECT jsonb_build_object(
    'ok',         (SELECT count(*) FROM m) > 0,
    'id',         (SELECT id FROM m),
    'nome',       (SELECT nome FROM m),
    'crm',        (SELECT crm FROM m),
    'is_admin',   (SELECT is_admin FROM m),
    'plataforma', COALESCE((SELECT plataforma FROM m), false),
    'token',      (SELECT CASE WHEN (SELECT count(*) FROM m) > 0 THEN (SELECT tok FROM v) END)
  )
$function$;

-- ── 3b. Senha única no chapéu — nos DOIS sentidos ───────────────────────────
-- O chapéu tem UM campo de senha e testa na ordem Caixa → admin → operador:
-- a primeira que bater, entra. Se duas portas tiverem a mesma senha, a de
-- trás nunca mais abre e quem digita cai na da frente — por exemplo, um
-- operador entrando no CAIXA. É plausível, não coincidência: a mesma pessoa
-- tende a repetir a senha que já usa.
-- Por isso TODA função que grava senha de porta do chapéu consulta esta. `p_porta`
-- diz qual porta está sendo gravada, para não se comparar consigo mesma:
-- 'caixa' | 'admin' | 'op:<LOGIN>'.
CREATE OR REPLACE FUNCTION public.senha_ocupada_no_chapeu(p_senha text, p_porta text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_porta text := lower(btrim(coalesce(p_porta,'')));
  v_hash  text;
BEGIN
  IF coalesce(p_senha,'') = '' THEN RETURN false; END IF;

  IF v_porta <> 'caixa' THEN
    SELECT valor INTO v_hash FROM public.config WHERE chave = 'caixa_senha_hash';
    IF v_hash IS NOT NULL AND crypt(p_senha, v_hash) = v_hash THEN RETURN true; END IF;
  END IF;

  IF v_porta <> 'admin' AND EXISTS (
       SELECT 1 FROM public.medicos m
        WHERE m.is_admin AND m.senha_klipbit IS NOT NULL
          AND m.senha_klipbit = crypt(p_senha, m.senha_klipbit)) THEN
    RETURN true;
  END IF;

  IF EXISTS (
       SELECT 1 FROM public.operadores o
        WHERE 'op:' || lower(o.login) <> v_porta
          AND o.senha_hash = crypt(p_senha, o.senha_hash)) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- Só é chamada por dentro de outras funções. Aberta ao `anon`, seria um
-- testador de senhas alheias sem nem passar pelo login.
REVOKE EXECUTE ON FUNCTION public.senha_ocupada_no_chapeu(text, text) FROM PUBLIC, anon, authenticated;

-- ── 4. Gestão das contas (SÓ o administrador) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_operadores_listar(p_crm text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  RETURN jsonb_build_object('ok', true, 'operadores', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'login', o.login, 'nome', o.nome, 'ativo', o.ativo,
             'criado_em', o.criado_em, 'senha_definida_em', o.senha_definida_em,
             'ultima_sessao_ate', o.session_token_exp
           ) ORDER BY o.nome)
      FROM public.operadores o), '[]'::jsonb));
END;
$function$;

-- Cria o operador ou redefine a senha dele. Redefinir derruba a sessão.
CREATE OR REPLACE FUNCTION public.admin_operador_salvar(
  p_crm text, p_token text, p_login text, p_nome text, p_senha text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_login text := upper(btrim(coalesce(p_login,'')));
  v_nome  text := btrim(coalesce(p_nome,''));
  v_autor text := upper(btrim(coalesce(p_crm,'')));
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  IF v_login !~ '^[A-Z0-9_]{2,20}$' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Login: 2 a 20 letras ou numeros, sem espaco nem acento');
  END IF;
  IF length(coalesce(p_senha,'')) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Senha muito curta (minimo 10 caracteres)');
  END IF;

  -- A porta do chapéu tem UM campo de senha: a senha escolhe a conta. Senha
  -- repetida faria a pessoa cair na porta errada (ver 3b).
  IF public.senha_ocupada_no_chapeu(p_senha, 'op:' || v_login) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Esta senha ja e usada em outra porta. Escolha outra.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.operadores WHERE login = v_login) THEN
    UPDATE public.operadores
       SET senha_hash         = crypt(p_senha, gen_salt('bf')),
           nome               = COALESCE(NULLIF(v_nome,''), nome),
           session_token_hash = NULL,           -- senha nova derruba a sessão
           session_token_exp  = NULL,
           senha_definida_em  = now(),
           senha_definida_por = v_autor
     WHERE login = v_login;
    RETURN jsonb_build_object('ok', true, 'criado', false, 'login', v_login);
  END IF;

  IF v_nome = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Informe o nome');
  END IF;
  INSERT INTO public.operadores (login, nome, senha_hash, criado_por, senha_definida_em, senha_definida_por)
  VALUES (v_login, v_nome, crypt(p_senha, gen_salt('bf')), v_autor, now(), v_autor);
  RETURN jsonb_build_object('ok', true, 'criado', true, 'login', v_login);
END;
$function$;

-- Desativar derruba a sessão na hora. Não apaga: a autoria dos atos passados
-- (validado_por = 'OP:ARTHUR') continua apontando para alguém que existe.
CREATE OR REPLACE FUNCTION public.admin_operador_ativar(
  p_crm text, p_token text, p_login text, p_ativo boolean)
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
  UPDATE public.operadores
     SET ativo = COALESCE(p_ativo, false),
         session_token_hash = CASE WHEN COALESCE(p_ativo, false) THEN session_token_hash END,
         session_token_exp  = CASE WHEN COALESCE(p_ativo, false) THEN session_token_exp  END
   WHERE login = upper(btrim(coalesce(p_login,'')));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Operador nao encontrado'); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── 5. RPCs operacionais passam a aceitar o operador ────────────────────────
-- As 15 abaixo só trocam o portão: token_admin_ok → token_gestao_ok. Em vez de
-- recopiar cada corpo à mão (e arriscar perder um DEFAULT — o 42P13 já nos
-- pegou uma vez), a definição VIVA é lida, o portão é trocado e a função é
-- recriada. CREATE OR REPLACE preserva os GRANTs.
--
-- FICAM SÓ COM O ADMINISTRADOR (não estão na lista, de propósito):
--   admin_avaliacoes_recentes, admin_oba_ficha ...... clínicas (e exigem plataforma)
--   admin_acessos_paciente .......................... revela quem é paciente de quem
--   salvar_config, admin_ler_config_telegram ........ Configurações
--   salvar_medicamento, salvar_suplemento ........... catálogos clínicos
--   admin_marcar_plataforma ......................... alcance clínico de um médico
--   admin_resetar_senha_caixa, admin_limpar_paciente  decisões irreversíveis/de dinheiro
DO $bloco$
DECLARE
  v_nome text;
  v_def  text;
  v_nova text;
  v_lista text[] := ARRAY[
    'admin_pendencias', 'admin_assinaturas_vencendo',
    'admin_profiles_lista', 'admin_funil_pacientes', 'admin_oba_hpylori',
    'admin_listar_medicos', 'admin_listar_plataforma',
    'admin_ativar_prescritor', 'admin_listar_prescritores', 'admin_prescricoes',
    'admin_crms_sem_conta', 'admin_listar_indicadores', 'admin_extrato_medico',
    'admin_extratos_oba', 'admin_marcar_extrato_entregue'
  ];
BEGIN
  FOREACH v_nome IN ARRAY v_lista LOOP
    -- Duas versões com o mesmo nome (assinaturas diferentes) fariam o SELECT
    -- abaixo pegar uma delas ao acaso, em silêncio. Hoje não há; se um dia
    -- houver, a migration para aqui em vez de trocar a errada.
    IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = v_nome) > 1 THEN
      RAISE EXCEPTION 'Funcao % tem mais de uma versao — migration abortada, trocar a mao', v_nome;
    END IF;
    SELECT pg_get_functiondef(p.oid) INTO v_def
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = v_nome;
    IF v_def IS NULL THEN
      RAISE EXCEPTION 'Funcao % nao encontrada — migration abortada, nada foi alterado', v_nome;
    END IF;

    -- Idempotente: se já foi trocada numa rodada anterior, segue.
    IF v_def ~ 'token_gestao_ok\(' AND v_def !~ 'token_admin_ok\(' THEN
      CONTINUE;
    END IF;
    IF v_def !~ 'token_admin_ok\(' THEN
      RAISE EXCEPTION 'Funcao % nao tem o portao esperado — migration abortada', v_nome;
    END IF;

    v_nova := regexp_replace(v_def, '(public\.)?token_admin_ok\(', 'public.token_gestao_ok(', 'g');
    EXECUTE v_nova;
  END LOOP;
END
$bloco$;

-- ── 6. admin_validar_medico: operador valida, não invalida ──────────────────
-- Escrita à mão (não entra no laço acima) porque muda de regra, não só de portão.
CREATE OR REPLACE FUNCTION public.admin_validar_medico(p_crm text, p_token text, p_crm_alvo text, p_valor boolean, p_nota text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_alvo  text := upper(btrim(coalesce(p_crm_alvo,'')));
  v_admin boolean := public.token_admin_ok(p_crm, p_token);
  v_n int;
BEGIN
  IF NOT (v_admin OR public.token_operador_ok(p_crm, p_token)) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  -- Validar é conferir documento (rotina do atendimento). Invalidar tira um
  -- médico de circulação: derruba a sessão, retém pagamento e tira a
  -- plataforma — decisão só do administrador.
  IF p_valor IS DISTINCT FROM true AND NOT v_admin THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Invalidar medico e decisao do administrador');
  END IF;
  IF v_alvo = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CRM alvo invalido');
  END IF;
  -- Não deixa o admin invalidar a si mesmo e se trancar para fora.
  IF v_alvo = upper(btrim(coalesce(p_crm,''))) AND p_valor IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao e possivel invalidar o proprio cadastro');
  END IF;

  UPDATE public.medicos
     SET validado = p_valor,
         validado_em = now(),
         -- CRM do administrador ou 'OP:<LOGIN>' do operador: quem conferiu.
         validado_por = upper(btrim(coalesce(p_crm,''))),
         validacao_nota = p_nota,
         -- Invalidar derruba a sessão na hora e tira o alcance amplo.
         session_token_hash = CASE WHEN p_valor IS FALSE THEN NULL ELSE session_token_hash END,
         plataforma         = CASE WHEN p_valor IS FALSE THEN false ELSE plataforma END
   WHERE crm = v_alvo;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n = 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Medico nao encontrado'); END IF;
  RETURN jsonb_build_object('ok', true, 'crm', v_alvo, 'validado', p_valor);
END;
$function$;

-- ── 6b. admin_pendencia_baixar: operador baixa PEDIDO, não baixa CRÍTICO ────
-- Decisão do Estácio (19/09/2026). Fechar o alerta de um paciente crítico é
-- afirmar que o caso foi tratado — decisão clínica, como invalidar médico.
-- O operador continua VENDO o cartão (é ele quem avisa); a baixa é do admin.
CREATE OR REPLACE FUNCTION public.admin_pendencia_baixar(p_crm text, p_token text, p_id uuid, p_tipo text, p_desfazer boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_admin boolean := public.token_admin_ok(p_crm, p_token);
  v_n int;
BEGIN
  IF NOT (v_admin OR public.token_operador_ok(p_crm, p_token)) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  IF p_tipo NOT IN ('critico','pedidos') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Tipo invalido');
  END IF;
  IF p_tipo = 'critico' AND NOT v_admin THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Baixa de paciente critico e decisao do medico. Avise o Estacio.');
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

-- ── 7. As outras portas que gravam senha consultam a mesma régua (3b) ───────
-- Sem isto, a garantia só valeria num sentido: criar operador com a senha do
-- Caixa era recusado, mas trocar a senha do Caixa para a de um operador não.

-- 7a. O Caixa troca a própria senha.
CREATE OR REPLACE FUNCTION public.caixa_trocar_senha(p_token text, p_nova text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  IF coalesce(length(p_nova),0) < 6 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Senha muito curta (minimo 6)'); END IF;
  IF public.senha_ocupada_no_chapeu(p_nova, 'caixa') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Esta senha ja e usada em outra porta. Escolha outra.');
  END IF;
  UPDATE public.config SET valor = crypt(p_nova, gen_salt('bf',10)) WHERE chave='caixa_senha_hash';
  RETURN jsonb_build_object('ok', true);
END; $function$;

-- 7b. O administrador redefine a senha do Caixa.
CREATE OR REPLACE FUNCTION public.admin_resetar_senha_caixa(p_crm text, p_token text, p_nova text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  IF coalesce(length(p_nova),0) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Senha muito curta (minimo 6)');
  END IF;
  IF public.senha_ocupada_no_chapeu(p_nova, 'caixa') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Esta senha ja e usada em outra porta. Escolha outra.');
  END IF;

  -- INSERT/ON CONFLICT (e não UPDATE puro como o caixa_trocar_senha): se a linha
  -- do hash sumir do config, o UPDATE não faria nada e devolveria "ok" sem ter
  -- gravado — o Caixa continuaria trancado e ninguém saberia por quê.
  INSERT INTO public.config (chave, valor)
  VALUES ('caixa_senha_hash', crypt(p_nova, gen_salt('bf', 10)))
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

  -- Derruba a sessão aberta do Caixa. Sem isso, quem estava logado com a senha
  -- antiga continuaria dentro por até 7 dias (o token vive no config e não
  -- depende da senha) — e o reset viraria teatro.
  DELETE FROM public.config WHERE chave IN ('caixa_token_hash', 'caixa_token_exp');

  -- Rastro de quem destravou a Tesouraria e quando. É a única chave do acesso ao
  -- dinheiro que pode ser trocada por terceiro; sem registro, um reset indevido
  -- (token de admin roubado) não deixaria pegada nenhuma. As chaves começam com
  -- 'caixa' — logo, ficam fora da leitura anon (migrate_fix_config_segredos.sql).
  INSERT INTO public.config (chave, valor, descricao) VALUES
    ('caixa_senha_reset_por', upper(btrim(coalesce(p_crm,''))), 'CRM do admin que redefiniu a senha da Tesouraria'),
    ('caixa_senha_reset_em',  now()::text,                      'Quando a senha da Tesouraria foi redefinida pelo admin')
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

  RETURN jsonb_build_object('ok', true);
END; $function$;

-- 7c. Recuperação da senha do administrador (código no Telegram). A função é
-- longa e cuidadosa (tetos de tentativa, advisory lock); em vez de recopiá-la,
-- a checagem é INSERIDA logo depois do teste de tamanho mínimo — antes de
-- gastar tentativa ou consumir o código. A migration para se o ponto de
-- inserção não for encontrado exatamente uma vez.
DO $rec$
DECLARE
  v_def  text;
  v_nova text;
  v_ancora text := $a$'Senha muito curta (minimo 8)');$a$;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'admin_recuperar_concluir';
  IF v_def IS NULL THEN
    RAISE EXCEPTION 'admin_recuperar_concluir nao encontrada — migration abortada';
  END IF;
  IF v_def ~ 'senha_ocupada_no_chapeu' THEN
    RETURN;   -- já aplicada
  END IF;
  IF (length(v_def) - length(replace(v_def, v_ancora, ''))) / length(v_ancora) <> 1 THEN
    RAISE EXCEPTION 'admin_recuperar_concluir mudou (ancora nao encontrada 1 vez) — trocar a mao';
  END IF;

  v_nova := regexp_replace(v_def,
    '(''Senha muito curta \(minimo 8\)''\);\s*END IF;)',
    E'\\1\n\n  -- (operadores) a senha do admin não pode repetir a de outra porta do chapéu.\n'
    || E'  IF public.senha_ocupada_no_chapeu(p_nova, ''admin'') THEN\n'
    || E'    RETURN jsonb_build_object(''ok'', false, ''erro'', ''Esta senha ja e usada em outra porta. Escolha outra.'');\n'
    || E'  END IF;');
  IF v_nova !~ 'senha_ocupada_no_chapeu' THEN
    RAISE EXCEPTION 'admin_recuperar_concluir: insercao falhou — migration abortada';
  END IF;
  EXECUTE v_nova;
END
$rec$;

-- ── 8. Permissões explícitas ─────────────────────────────────────────────────
-- O Supabase já dá EXECUTE ao anon em função nova do schema public (default
-- privileges), mas o padrão do projeto é declarar — fica visível o que é porta
-- pública e o que não é.
GRANT EXECUTE ON FUNCTION public.restrito_operador_login(text)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_operadores_listar(text, text)                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_operador_salvar(text, text, text, text, text)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_operador_ativar(text, text, text, boolean)       TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Conferência (rodar depois) ───────────────────────────────────────────────
-- Esperado: gestao = 15 · so_admin = 10 · mistas = 2 (validar médico, baixar pendência)
-- SELECT
--   count(*) FILTER (WHERE prosrc ~ 'token_gestao_ok\(')                        AS gestao,
--   count(*) FILTER (WHERE prosrc ~ 'token_admin_ok\('
--                      AND prosrc !~ 'token_gestao_ok\('
--                      AND prosrc !~ 'token_operador_ok\(')                       AS so_admin,
--   count(*) FILTER (WHERE prosrc ~ 'token_operador_ok\(')                       AS mistas
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname = 'public'
--    AND (p.proname LIKE 'admin\_%' OR p.proname LIKE 'salvar\_%')
--    AND p.proname NOT IN ('admin_operadores_listar','admin_operador_salvar','admin_operador_ativar');
