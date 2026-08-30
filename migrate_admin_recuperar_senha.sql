-- =============================================================================
-- migrate_admin_recuperar_senha.sql   (ago/2026 — recuperação da senha do ADMIN)
-- =============================================================================
-- RODAR NO SUPABASE DASHBOARD -> SQL EDITOR (revisar antes).
--
-- PROBLEMA: fechado o caminho de volta da Tesouraria (migrate_admin_reset_senha_caixa),
-- sobrou a porta de cima. A senha do admin é validada contra medicos.senha_klipbit
-- (bcrypt) e não existe caminho de volta nenhum: perdida a senha do admin, o único
-- jeito de entrar é abrir o SQL Editor do Supabase — e quem responde pelo negócio
-- não deveria depender de saber SQL para reaver o próprio painel.
--
-- SOLUÇÃO: código de uso único pelo Telegram da ADM (canal que o projeto já usa e
-- que está no celular do dono). Escolhido em vez de link por e-mail porque a
-- plataforma não envia e-mail e o Telegram já é um segundo fator de fato: quem não
-- tem o celular não completa a recuperação, mesmo sabendo o endereço do painel.
--
-- POR QUE O CÓDIGO TEM 8 CARACTERES E NÃO 6 DÍGITOS (achado da revisão):
--   O limite de 5 tentativas vale POR CÓDIGO, e pedir código novo é grátis para
--   qualquer anônimo (ele não recebe o código, mas zera o contador). Com o freio de
--   2 min isso dá ~25 chutes/hora, para sempre. Contra 6 dígitos (10^6) a chance
--   acumulada de acerto em um ano passa de 15% — inaceitável para a porta que
--   destrava a Tesouraria. Apertar o contador não resolve: um atacante gastaria as
--   tentativas de propósito só para trancar o dono do lado de fora.
--   A saída é o espaço de busca: 8 caracteres num alfabeto de 32 = 32^8 ≈ 1,1
--   TRILHÃO de combinações. Nos mesmos 25 chutes/hora, um século de ataque contínuo
--   dá ~1 chance em 50 mil (conta conferida: 21,9 milhões de chutes / 1,1e12). O
--   freio de tentativas continua lá, mas agora como segunda linha, não como a única.
--   O alfabeto não tem O, 0, I nem 1 — o código é lido do celular e digitado à mão,
--   e confundir zero com O na hora do aperto seria um jeito bobo de falhar.
--
-- OUTRAS DEFESAS (a porta é aberta ao anônimo — tem de ser, é para quem está
-- trancado fora):
--   • admin_recuperar_iniciar responde SEMPRE igual, e admin_recuperar_concluir dá
--     a MESMA recusa para código errado, expirado ou inexistente. Sem isso, encadear
--     as duas viraria um oráculo para descobrir o estado interno.
--   • Freio de 2 min entre códigos e teto de 5 por hora — senão a função vira
--     torneira de mensagem no Telegram do dono, com a anon key de qualquer um.
--   • Teto global de 20 falhas por hora. O número não é solto: os freios do iniciar
--     (5 códigos/hora × 5 tentativas cada) já limitam a 25, então um teto de 30
--     jamais dispararia — seria proteção decorativa. 20 morde antes e continua muito
--     acima de quem erra de verdade (o uso legítimo erra 1 ou 2 vezes).
--   • Código guardado como HASH bcrypt, nunca em texto. Vale 10 minutos.
--   • Trava de transação (advisory lock) nas duas funções: sem ela, chamadas
--     simultâneas passam juntas pelas checagens e furam os freios.
--   • Concluída a troca, as sessões de admin abertas MORREM (token zerado): se
--     alguém entrou com a senha antiga, perde o acesso junto.
--   • O Telegram avisa tanto o pedido quanto a troca efetivada.
--
-- LIMITE CONHECIDO, e ele é maior do que parece (achado da 2ª revisão): o teto de 5
-- códigos por hora é GLOBAL, não por quem pede. Um anônimo pode mantê-lo cheio de
-- graça, para sempre, e assim impedir o dono de emitir um código novo — não é "uma
-- hora de atraso", é enquanto o atacante quiser. Ele não vê o código (que só vai
-- para o Telegram do servidor), então isso é negação de serviço, não invasão. Sem
-- autenticação não há como distinguir o pedido do dono do pedido do atacante, e
-- afrouxar o teto abriria a torneira de spam no Telegram. Fica assim de propósito:
-- o SQL Editor do Supabase continua sendo a saída de último caso, e a coluna
-- telegram_ok (abaixo) existe para diagnosticar o silêncio quando ele acontecer.
--
-- A tabela admin_reset entra no padrão do projeto: RLS ligado e ZERO policies,
-- acesso exclusivamente pelas RPCs SECURITY DEFINER abaixo.
-- =============================================================================

-- 1) Onde o código vive enquanto vale --------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_reset (
  id          bigserial   PRIMARY KEY,
  codigo_hash text        NOT NULL,
  exp         timestamptz NOT NULL,
  tentativas  int         NOT NULL DEFAULT 0,
  usado_em    timestamptz,
  -- Falso = o bot do Telegram não estava configurado na hora do pedido, ou seja, o
  -- código foi gerado e NÃO chegou a lugar nenhum. tg_enviar falha em silêncio nesse
  -- caso, e sem esta coluna a porta de emergência quebraria sem deixar rastro: a
  -- tela diria "enviado", nada chegaria, e ninguém saberia por quê.
  telegram_ok boolean     NOT NULL DEFAULT false,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_reset ENABLE ROW LEVEL SECURITY;  -- acesso só via RPC

-- Migração de quem rodou a versão anterior deste arquivo (código de 6 dígitos).
ALTER TABLE public.admin_reset ADD COLUMN IF NOT EXISTS telegram_ok boolean NOT NULL DEFAULT false;

-- 2) PEDIR o código -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_recuperar_iniciar()
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_b        bytea;
  v_codigo   text := '';
  v_recentes int;
  v_tg_ok    boolean;
  -- 32 caracteres, sem O/0/I/1 (ver cabeçalho). 256 é múltiplo de 32, então
  -- byte % 32 é perfeitamente uniforme — sem o viés que o módulo costuma trazer.
  c_alfabeto constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
BEGIN
  -- Serializa as chamadas: sem a trava, dois pedidos simultâneos passam os dois
  -- pelas checagens de freio antes de qualquer um inserir.
  PERFORM pg_advisory_xact_lock(hashtext('admin_reset')::bigint);

  -- Todos os caminhos abaixo devolvem o MESMO ok:true de propósito (ver cabeçalho).
  IF NOT EXISTS (SELECT 1 FROM public.medicos WHERE is_admin = true) THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_reset WHERE criado_em > now() - interval '2 minutes') THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  SELECT count(*) INTO v_recentes
    FROM public.admin_reset WHERE criado_em > now() - interval '1 hour';
  IF v_recentes >= 5 THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  -- Código de 8 caracteres a partir de bytes criptográficos (gen_random_bytes),
  -- nunca de random(): random() é previsível e aqui ele guardaria a porta da casa.
  v_b := gen_random_bytes(8);
  FOR i IN 0..7 LOOP
    v_codigo := v_codigo || substr(c_alfabeto, (get_byte(v_b, i) % 32) + 1, 1);
  END LOOP;

  -- O bot está mesmo configurado? tg_enviar devolve void e engole a falha; se não
  -- registrarmos aqui, o pedido "some" sem deixar pista.
  v_tg_ok := EXISTS (
    SELECT 1 FROM public.config WHERE chave = 'telegram_bot_token' AND btrim(coalesce(valor,'')) <> ''
  ) AND EXISTS (
    SELECT 1 FROM public.config WHERE chave = 'telegram_chat_id'   AND btrim(coalesce(valor,'')) <> ''
  );

  INSERT INTO public.admin_reset (codigo_hash, exp, telegram_ok)
  VALUES (crypt(v_codigo, gen_salt('bf', 10)), now() + interval '10 minutes', v_tg_ok);

  -- tg_enviar teve o EXECUTE revogado do anon (migrate_tg_wrappers_sec1_ago2026),
  -- mas esta função é SECURITY DEFINER: roda como owner e chama normalmente.
  IF v_tg_ok THEN
    PERFORM public.tg_enviar(
      'PROJETO OBA — recuperação de acesso' || E'\n\n' ||
      'Código: ' || substr(v_codigo,1,4) || '-' || substr(v_codigo,5,4) || E'\n' ||
      'Vale por 10 minutos.' || E'\n\n' ||
      'Se não foi você quem pediu, pode ignorar: sem o código, ninguém troca a senha.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

-- 3) Igualador de tempo ----------------------------------------------------------
-- O bcrypt é a operação cara da conferência. Se ele só rodasse quando existe um
-- código ativo, o RELÓGIO entregaria o que a mensagem esconde: resposta rápida =
-- "não há recuperação em andamento", resposta lenta = "há". Nos caminhos que
-- recusam cedo, gastamos o mesmo tempo de propósito.
CREATE OR REPLACE FUNCTION public.admin_reset_gasta_tempo()
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v_lixo text;
BEGIN
  v_lixo := crypt('x', gen_salt('bf', 10));
END; $$;

-- Auxiliar interno: as RPCs acima são SECURITY DEFINER e a chamam como owner.
-- ⚠ FROM PUBLIC obrigatório (lição do projeto: sem ele o revoke falha em silêncio).
REVOKE EXECUTE ON FUNCTION public.admin_reset_gasta_tempo() FROM PUBLIC, anon, authenticated;

-- 4) USAR o código e definir a senha nova ----------------------------------------
CREATE OR REPLACE FUNCTION public.admin_recuperar_concluir(p_codigo text, p_nova text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_id      bigint;
  v_hash    text;
  v_tent    int;
  v_falhas  int;
  v_codigo  text;
  -- Recusa única para código errado, expirado ou inexistente: mensagens diferentes
  -- contariam ao anônimo o que está acontecendo do lado de dentro.
  c_recusa  constant text := 'Codigo invalido ou expirado. Peca um novo.';
BEGIN
  -- Mínimo 8 (o Caixa exige 6): esta é a senha que abre tudo, inclusive o reset
  -- da senha do Caixa. Vale pedir mais.
  IF coalesce(length(p_nova),0) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Senha muito curta (minimo 8)');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('admin_reset')::bigint);

  -- Teto global: o limite por código sozinho é recarregável (basta pedir outro).
  -- 20/hora — ver o cabeçalho para a escolha do número.
  SELECT coalesce(sum(tentativas), 0) INTO v_falhas
    FROM public.admin_reset
   WHERE criado_em > now() - interval '1 hour';
  IF v_falhas >= 20 THEN
    PERFORM public.admin_reset_gasta_tempo();
    RETURN jsonb_build_object('ok', false, 'erro', c_recusa);
  END IF;

  -- Normaliza o que o dono digitou: o Telegram mostra ABCD-EFGH, e minúscula ou
  -- hífen a mais não deveriam custar uma tentativa.
  v_codigo := upper(regexp_replace(coalesce(p_codigo,''), '[^0-9A-Za-z]', '', 'g'));

  SELECT id, codigo_hash, tentativas INTO v_id, v_hash, v_tent
    FROM public.admin_reset
   WHERE usado_em IS NULL AND exp > now()
   ORDER BY criado_em DESC, id DESC
   LIMIT 1
   FOR UPDATE;

  IF v_id IS NULL OR v_tent >= 5 THEN
    PERFORM public.admin_reset_gasta_tempo();
    RETURN jsonb_build_object('ok', false, 'erro', c_recusa);
  END IF;

  IF v_hash <> crypt(v_codigo, v_hash) THEN
    UPDATE public.admin_reset SET tentativas = tentativas + 1 WHERE id = v_id;
    RETURN jsonb_build_object('ok', false, 'erro', c_recusa);
  END IF;

  -- Zerar o token junto com a senha: sem isso, quem estivesse logado com a senha
  -- antiga continuaria dentro por até 30 dias e a recuperação não recuperaria nada.
  -- Hoje existe exatamente 1 admin; se um dia houver mais, esta linha reseta todos
  -- — o que é o comportamento certo para uma recuperação de emergência.
  UPDATE public.medicos SET
    senha_klipbit      = crypt(p_nova, gen_salt('bf', 10)),
    session_token_hash = NULL,
    session_token_exp  = NULL
  WHERE is_admin = true;

  UPDATE public.admin_reset SET usado_em = now() WHERE id = v_id;

  PERFORM public.tg_enviar(
    'PROJETO OBA — a senha do admin acabou de ser trocada pela recuperação.' || E'\n' ||
    'Se não foi você, peça a recuperação agora e tome a senha de volta.'
  );

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_recuperar_iniciar()              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recuperar_concluir(text, text)   TO anon, authenticated;

-- Faz o PostgREST enxergar as funções novas na hora.
NOTIFY pgrst, 'reload schema';

-- ── Verificação (rode depois e confira) ──────────────────────────────────────
-- SELECT has_function_privilege('anon','public.admin_recuperar_iniciar()','EXECUTE');  -- true
-- SELECT count(*) FROM pg_policies WHERE tablename = 'admin_reset';                    -- 0
--
-- ── Diagnóstico do dia em que o código não chegar ────────────────────────────
-- Se você pedir o código e nada aparecer no Telegram, rode isto: telegram_ok=false
-- significa bot desconfigurado (o código nem saiu); true significa que saiu daqui e
-- o problema está no Telegram/rede.
-- SELECT criado_em, telegram_ok, tentativas, usado_em IS NOT NULL AS usado
--   FROM public.admin_reset ORDER BY criado_em DESC LIMIT 5;
