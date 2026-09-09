-- ============================================================================
-- migrate_cfm_r4_desconto_boas_vindas.sql   (RODAR 4º — por último)
--
-- REESTRUTURAÇÃO ÉTICO-REGULATÓRIA — 09/09/2026. Motivo completo no cabeçalho
-- de migrate_cfm_r1_valor_avaliacao.sql (CFM 2.336/2023 e CFM 2.170/2017).
--
-- R4: o indicador leigo (quem não é médico nem paciente) DEIXA DE RECEBER.
-- O incentivo migra para quem entra: TODO paciente que chega indicado ganha um
-- DESCONTO DE BOAS-VINDAS na primeira anuidade.
--
-- Por que manter o papel em vez de apagá-lo: "Conheço um bariátrico" é porta de
-- entrada real — muita gente chega ao cuidado empurrada por um familiar, não
-- por conta própria. O que tornava a porta problemática era o pagamento por
-- cabeça, não a porta. Tirado o dinheiro, o que sobra é um familiar ajudando
-- alguém, que é exatamente o que ele queria fazer.
--
-- O QUE MUDA NO CADASTRO DO LEIGO — e por quê:
--   Sem dinheiro, o CPF do leigo perdeu TODAS as funções que tinha: era chave
--   de login (não há mais senha), dedup de conta (dois códigos não fazem mal a
--   ninguém) e prioridade de atribuição (que se resolve pelo código). O lastro
--   do crédito sempre foi chaveado no CPF do INDICADO, nunca no do indicador.
--   Guardar CPF de quem nem é usuário é dado sensível sob a LGPD sem
--   contrapartida. Fica só NOME (aparece no "Você foi indicado por X") e
--   CELULAR OPCIONAL, para quem quiser ser avisado.
--
--   ⚠ Isto NÃO vale para o paciente-indicador (R3): ali o CPF é o do próprio
--   paciente, que já é usuário do sistema, e continua sendo a chave da conta.
--
-- O QUE SAI: register_indicador, login_indicador, lookup_indicador,
--            contato_indicador, e as colunas bancárias de `indicadores`.
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. O valor do desconto. Zero até o Admin definir — e com zero o desconto
--    simplesmente não aparece, em vez de prometer algo que não existe.
-- ---------------------------------------------------------------------------
INSERT INTO public.config (chave, valor)
VALUES ('desconto_boas_vindas_brl', '0')
ON CONFLICT (chave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. O cadastro do leigo: dois campos, sem senha, sem CPF.
--
--    Idempotência: sem CPF não há como reconhecer "o mesmo leigo" voltando —
--    e não precisa. Cada chamada gera um código; o leigo guarda o dele pelo
--    link/ícone. Gerar dois códigos não custa nada a ninguém.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_indicador_leigo(p_nome text, p_celular text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_nome   text := btrim(coalesce(p_nome, ''));
  v_cel    text := NULLIF(regexp_replace(coalesce(p_celular,''), '\D', '', 'g'), '');
  v_codigo text;
BEGIN
  IF length(v_nome) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Informe o seu nome.');
  END IF;
  -- Só o primeiro nome é guardado: é o que a tela do indicado precisa mostrar
  -- ("Você foi indicado por Maria") e o mínimo que identifica o laço.
  v_nome := split_part(v_nome, ' ', 1);

  LOOP
    v_codigo := 'IND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_codigo);
  END LOOP;

  INSERT INTO public.indicadores (codigo, cpf, nome, celular, tipo, ativo)
  VALUES (v_codigo, NULL, v_nome, v_cel, 'leigo', true);

  RETURN jsonb_build_object('ok', true, 'codigo', v_codigo, 'nome', v_nome);
END;
$$;

-- O CPF passa a ser opcional na tabela (o leigo não tem; o paciente tem).
ALTER TABLE public.indicadores ALTER COLUMN cpf DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. O leigo não recebe crédito — o indicado é que ganha desconto.
--    O gatilho passa a creditar SOMENTE o paciente-indicador (R3).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_credita_indicacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text; v_ind text; v_tipo text; v_rows int;
  v_nome text; v_brl numeric; v_cpfd text; v_msg text;
BEGIN
  IF NEW.status <> 'ativa' THEN RETURN NEW; END IF;
  SELECT cpf INTO v_cpf FROM public.profiles WHERE id = NEW.user_id;
  IF v_cpf IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM public.creditos_indicador WHERE cpf_paciente = v_cpf) THEN
    RETURN NEW;
  END IF;

  SELECT indicador_codigo INTO v_ind FROM public.indicacoes_precadastro
    WHERE cpf_paciente = v_cpf AND confirmado = true
    ORDER BY created_at DESC LIMIT 1;
  IF v_ind IS NULL OR btrim(v_ind) = '' THEN RETURN NEW; END IF;

  SELECT tipo, nome INTO v_tipo, v_nome FROM public.indicadores WHERE codigo = v_ind;
  IF v_tipo IS NULL THEN RETURN NEW; END IF;

  -- (R4) INDICADOR LEIGO NÃO GANHA NADA. Quem ganhou foi o indicado, no
  -- desconto de boas-vindas aplicado lá no pagamento (desconto_boas_vindas).
  IF COALESCE(v_tipo,'') <> 'paciente' THEN
    RETURN NEW;
  END IF;

  -- Daqui para baixo: R3 — paciente que indicou paciente acumula crédito para
  -- ABATER o próprio uso da plataforma. Nunca vira dinheiro.
  v_brl := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'credito_indicacao_brl'), 0);
  v_cpfd := regexp_replace(coalesce(v_cpf,''), '\D', '', 'g');
  v_cpfd := CASE WHEN length(v_cpfd) = 11
                 THEN '***.' || substr(v_cpfd,4,3) || '.' || substr(v_cpfd,7,3) || '-**'
                 ELSE coalesce(v_cpf,'-') END;

  INSERT INTO public.creditos_indicador (indicador_codigo, cpf_paciente, assinatura_id, elegivel)
  VALUES (v_ind, v_cpf, NEW.id, true)
  ON CONFLICT (cpf_paciente) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN NEW; END IF;

  v_msg := '🤝 Nova indicação confirmada (paciente-indicador)!' || E'\n' ||
           'Indicador: ' || COALESCE(NULLIF(v_nome,''), v_ind) || ' (' || v_ind || ')' || E'\n' ||
           'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
           'Crédito de R$ ' || to_char(v_brl, 'FM999990.00') ||
           ' para ABATER anuidade/documentos. NÃO é pagamento em dinheiro.';
  PERFORM public.tg_enviar(v_msg);
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. O DESCONTO DE BOAS-VINDAS.
--
--    Vale para TODO indicado, seja o indicador leigo ou paciente (decisão A8):
--    uma regra só — "veio indicado, tem desconto" — em vez de uma assimetria
--    impossível de explicar na tela.
--
--    Condições: existe reserva do CPF por um indicador ativo, feita há no
--    máximo 3 meses (mesma validade que já valia para a atribuição), e o CPF
--    NUNCA teve assinatura. É desconto de PRIMEIRA anuidade.
--
--    Só leitura: quem aplica é o pagamento, abatendo do valor do PIX.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.desconto_boas_vindas(p_cpf text, p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf  text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_brl  numeric;
  v_cod  text;
  v_nome text;
  v_uid  uuid;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  -- GATE: só o dono do CPF consulta o próprio desconto.
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;

  v_brl := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='desconto_boas_vindas_brl'), 0);
  IF v_brl <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'tem', false, 'desconto_brl', 0);
  END IF;

  -- Primeira anuidade: qualquer assinatura já registrada tira o direito.
  SELECT id INTO v_uid FROM public.profiles
   WHERE regexp_replace(coalesce(cpf,''),'\D','','g') = v_cpf LIMIT 1;
  IF v_uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.assinaturas WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', true, 'tem', false, 'desconto_brl', 0, 'motivo', 'ja_assinou');
  END IF;

  SELECT p.indicador_codigo INTO v_cod
    FROM public.indicacoes_precadastro p
    JOIN public.indicadores i ON i.codigo = p.indicador_codigo AND i.ativo
   WHERE p.cpf_paciente = v_cpf
     AND p.created_at > now() - interval '3 months'
   ORDER BY p.created_at DESC LIMIT 1;

  IF v_cod IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'tem', false, 'desconto_brl', 0);
  END IF;

  SELECT nome INTO v_nome FROM public.indicadores WHERE codigo = v_cod;

  RETURN jsonb_build_object('ok', true, 'tem', true,
                            'desconto_brl', v_brl,
                            'codigo', v_cod,
                            'indicador_nome', COALESCE(NULLIF(v_nome,''), 'alguém que se importa com você'));
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. `confirmar_indicacao` continua — mas agora não decide dinheiro nenhum
--    para o médico (R2 acabou com a disputa). Só registra de quem veio.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirmar_indicacao(p_cpf text, p_codigo text, p_pac_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := translate(coalesce(p_cpf,''), '.- /()', '');
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok', false); END IF;
  -- GATE mantido: só o dono do CPF confirma quem o indicou.
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  UPDATE public.indicacoes_precadastro
     SET confirmado = true
   WHERE cpf_paciente = v_cpf AND indicador_codigo = p_codigo
     AND created_at > now() - interval '3 months';
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. O que sustentava a CONTA do leigo desaparece.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.register_indicador(text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.login_indicador(text, text);
DROP FUNCTION IF EXISTS public.lookup_indicador(text);
DROP FUNCTION IF EXISTS public.contato_indicador(text, text);

-- `paciente_virar_indicador` (R3) FICA: é como o paciente ganha o próprio
-- código. Só perde a leitura da chave PIX, que não existe mais.
CREATE OR REPLACE FUNCTION public.paciente_virar_indicador(p_cpf text, p_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf    text := translate(coalesce(p_cpf,''), '.- /()', '');
  v_codigo text;
  v_nome   text;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF inválido');
  END IF;
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida. Entre de novo.');
  END IF;

  SELECT codigo, nome INTO v_codigo, v_nome
    FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_codigo IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'codigo', v_codigo, 'ja_era', true,
                              'nome', COALESCE(v_nome,''));
  END IF;

  SELECT nome INTO v_nome FROM public.profiles
    WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf LIMIT 1;

  LOOP
    v_codigo := 'IND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_codigo);
  END LOOP;

  INSERT INTO public.indicadores (codigo, cpf, nome, tipo, ativo)
  VALUES (v_codigo, v_cpf, COALESCE(NULLIF(v_nome,''), 'Paciente'), 'paciente', true);

  RETURN jsonb_build_object('ok', true, 'codigo', v_codigo, 'ja_era', false,
                            'nome', COALESCE(v_nome,''));
END;
$$;

-- `listar_creditos_indicador` perde a autenticação por sessão de indicador
-- (não existe mais login de leigo) e o valor em dólar. Sobra o paciente-
-- indicador vendo os próprios créditos pela sessão de PACIENTE.
CREATE OR REPLACE FUNCTION public.listar_creditos_indicador(p_codigo text, p_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_ok   boolean;
  v_brl  numeric;
  v_pre  jsonb;
  v_cred jsonb;
BEGIN
  IF coalesce(p_token, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida. Entre de novo.');
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.indicadores i
      JOIN public.profiles pr
        ON regexp_replace(coalesce(pr.cpf,''), '\D', '', 'g') =
           regexp_replace(coalesce(i.cpf,''),  '\D', '', 'g')
     WHERE i.codigo = p_codigo
       AND i.cpf IS NOT NULL
       AND pr.session_token_hash = encode(digest(p_token, 'sha256'), 'hex')
       AND pr.session_token_exp > now()
  ) INTO v_ok;

  IF NOT v_ok THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida. Entre de novo.');
  END IF;

  v_brl := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'credito_indicacao_brl'), 0);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'cpf',  '…' || right(regexp_replace(cpf_paciente, '\D', '', 'g'), 3),
           'data', created_at) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_pre FROM public.indicacoes_precadastro WHERE indicador_codigo = p_codigo;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'cpf',  '…' || right(regexp_replace(cpf_paciente, '\D', '', 'g'), 3),
           'usado', COALESCE(abatido, false),
           'data', created_at) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_cred FROM public.creditos_indicador WHERE indicador_codigo = p_codigo;

  RETURN jsonb_build_object('ok', true, 'credito_brl', v_brl,
                            'precadastros', v_pre, 'creditos', v_cred);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. As colunas bancárias e a senha do indicador caem por último.
--    (`senha_klipbit` em profiles/medicos NÃO é tocada: lá é o hash da senha
--     de verdade. Nome legado, documentado no CLAUDE.md.)
-- ---------------------------------------------------------------------------
ALTER TABLE public.indicadores DROP COLUMN IF EXISTS pix_chave;
ALTER TABLE public.indicadores DROP COLUMN IF EXISTS usdc_wallet;
ALTER TABLE public.indicadores DROP COLUMN IF EXISTS pix_titular;
ALTER TABLE public.indicadores DROP COLUMN IF EXISTS pix_titular_pj;
ALTER TABLE public.indicadores DROP COLUMN IF EXISTS pix_cnpj;
ALTER TABLE public.indicadores DROP COLUMN IF EXISTS senha_klipbit;
ALTER TABLE public.indicadores DROP COLUMN IF EXISTS session_token_hash;
ALTER TABLE public.indicadores DROP COLUMN IF EXISTS session_token_exp;
-- `email` do indicador ficou órfão: nenhuma função sobrevivente lê ou escreve.
-- Guardar e-mail de não-usuário sem uso é PII sem contrapartida (o e-mail do
-- paciente-indicador continua em `profiles`).
ALTER TABLE public.indicadores DROP COLUMN IF EXISTS email;

-- ---------------------------------------------------------------------------
-- 8. GRANTs das funções novas.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.criar_indicador_leigo(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.desconto_boas_vindas(text, text)  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO
--   SELECT to_regprocedure('public.register_indicador(text,text,text,text,text,text,text,text)'); -- NULL
--   SELECT to_regprocedure('public.login_indicador(text,text)');   -- NULL
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='indicadores' ORDER BY ordinal_position;
--   -- espera: id, codigo, cpf, nome, celular, tipo, ativo, created_at
--
--   SELECT public.criar_indicador_leigo('Maria Silva', '71999999999');
--   -- espera: ok=true, codigo IND……, nome 'Maria'
--
--   -- NENHUM CAMINHO GERA SAQUE (o teste que fecha a reforma):
--   SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public'
--      AND (p.prosrc ILIKE '%usdc%' OR p.proname ILIKE '%pagar_indicador%');
--   -- espera: 0 linhas
-- ---------------------------------------------------------------------------
