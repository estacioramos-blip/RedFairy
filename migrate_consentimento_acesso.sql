-- ============================================================================
-- migrate_consentimento_acesso.sql   ·   Etapa 1, passos 2 e 3   ·   13/09/2026
--
-- O QUE MUDA, EM UMA FRASE: acessar o prontuário de um paciente passa a exigir
-- AUTORIZAÇÃO DELE. Até hoje bastava um VÍNCULO — e vínculo o médico criava
-- sozinho, digitando um CPF.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUE (não apagar este bloco)
--
-- A auditoria de 13/09/2026 encontrou o seguinte: registrar o CPF de uma pessoa
-- em ENCAMINHAR dava ao médico acesso permanente ao prontuário dela — sem
-- consentimento, sem prazo, sem revogação e sem que ela soubesse. Quatro das
-- cinco fontes de vínculo o médico cria sozinho.
--
-- Isso expõe duas frentes ao mesmo tempo:
--   • SIGILO MÉDICO — médico que acessa prontuário de quem não está sob seus
--     cuidados viola sigilo. Cada médico afiliado ficava exposto, e era a
--     plataforma que os expunha.
--   • LGPD — dado de saúde é dado pessoal sensível (art. 5º, II): exige
--     consentimento específico e destacado, e o titular tem direito de saber
--     quem acessou (art. 18).
--
-- O sistema NÃO foi lançado. É o único momento em que isso se conserta sem
-- paciente a notificar nem incidente a reportar.
--
-- ⚠ REGRA QUE NÃO SE SIMPLIFICA: vínculo e autorização são coisas SEPARADAS.
--   O vínculo diz que existe uma relação (o médico avaliou, encaminhou, triou).
--   A autorização diz que o paciente PERMITIU o acesso.
--   Só a segunda abre o prontuário. Se alguém um dia "simplificar" isso
--   juntando as duas de novo, reabre exatamente o buraco que este arquivo fecha.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- O MODELO, EM DOIS NÍVEIS (decisão do Estácio, 13/09/2026)
--
--   PLATAFORMA — os médicos da equipe clínica do OBA. O paciente consente no
--     cadastro, de forma explícita e legível: é o serviço. Sem isso não há
--     atendimento. NÃO é presumido por flag — tem de estar escrito.
--
--   MÉDICO EXTERNO — opt-in nominal ("autorizo o Dr. Fulano"), revogável a
--     qualquer momento sem justificar, validade de 12 MESES.
--     12 meses porque alinha com a anuidade: o paciente já volta anualmente,
--     então a renovação cai num momento em que ele está na plataforma. Um
--     cirurgião que operou há cinco anos e sumiu perde o acesso por inação.
--
--   URGÊNCIA — válvula para o caso em que o paciente aciona o botão de
--     emergência e o plantonista precisa abrir o prontuário NAQUELE minuto.
--     Exige justificativa escrita, vale 12 horas, e aparece DESTACADA na
--     trilha do paciente, com o motivo que o médico declarou.
--     Sem esta válvula o modelo seria inseguro no pior momento possível.
--
-- ⚠ MODELO DE ALCANCE DO MÉDICO DE PLATAFORMA: "C" — amplo, com prestação de
--   contas. Ele alcança qualquer paciente (o serviço depende disso), mas todo
--   acesso DECLARA SEU MOTIVO, e o acesso sem atendimento em curso é marcado
--   como tal e mostrado ao paciente.
--   DESTINO "B" (restrito por atribuição), com gatilho no LANÇAMENTO: quando
--   houver operação real com vários médicos, o acesso passa a exigir paciente
--   atribuído. O mecanismo de atribuição é feature de produto de qualquer
--   forma — ver CLAUDE.md.
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. A TABELA DE AUTORIZAÇÕES
--
--    APPEND-ONLY por desenho: conceder cria linha, revogar preenche
--    `revogada_em` (nunca apaga), reconceder cria OUTRA linha. O histórico
--    inteiro fica — que é o que "auditável" exige de verdade. Uma tabela que
--    sobrescreve não prova o que valia no dia do acesso.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.autorizacoes_acesso (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf_paciente  text        NOT NULL,
  -- NULL quando nivel='plataforma': a autorização é para a equipe, não para
  -- uma pessoa. Preenchido em 'medico' e 'urgencia'.
  medico_crm    text,
  nivel         text        NOT NULL CHECK (nivel IN ('plataforma','medico','urgencia')),
  concedida_em  timestamptz NOT NULL DEFAULT now(),
  -- NULL = não expira (só 'plataforma', que vale enquanto a conta existir).
  expira_em     timestamptz,
  revogada_em   timestamptz,
  -- Justificativa: obrigatória em 'urgencia'. É o que o paciente lê na trilha.
  justificativa text,
  CONSTRAINT autorizacao_coerente CHECK (
        (nivel = 'plataforma' AND medico_crm IS NULL)
     OR (nivel IN ('medico','urgencia') AND medico_crm IS NOT NULL)
  ),
  CONSTRAINT urgencia_exige_justificativa CHECK (
    nivel <> 'urgencia' OR (justificativa IS NOT NULL AND length(btrim(justificativa)) >= 15)
  )
);

CREATE INDEX IF NOT EXISTS idx_autorizacoes_cpf
  ON public.autorizacoes_acesso (cpf_paciente, nivel);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_medico
  ON public.autorizacoes_acesso (medico_crm) WHERE medico_crm IS NOT NULL;

ALTER TABLE public.autorizacoes_acesso ENABLE ROW LEVEL SECURITY;
-- Sem policy: acesso só pelas RPCs abaixo, gateadas por token. Mesmo padrão
-- das outras tabelas do projeto (ver a seção de RLS no CLAUDE.md).

COMMENT ON TABLE public.autorizacoes_acesso IS
  'Autorizações do PACIENTE para acesso ao prontuário. Append-only: revogar preenche revogada_em, nunca apaga. Ver migrate_consentimento_acesso.sql.';

-- ---------------------------------------------------------------------------
-- 2. A PERGUNTA CENTRAL: o paciente autorizou este médico?
--
--    Separada de `medico_tem_vinculo` de propósito — são perguntas diferentes,
--    e é a separação que sustenta a correção inteira.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.medico_tem_autorizacao(p_cpf text, p_crm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  WITH n AS (
    SELECT regexp_replace(coalesce(p_cpf,''), '\D', '', 'g') AS cpf,
           upper(btrim(coalesce(p_crm,'')))                  AS crm
  )
  SELECT (SELECT cpf FROM n) <> '' AND (SELECT crm FROM n) <> '' AND (
       -- MÉDICO DA PLATAFORMA: basta o paciente ter aceitado ser atendido pela
       -- equipe clínica. Não precisa de vínculo — atender é o trabalho dele.
       ( public.medico_e_plataforma((SELECT crm FROM n))
         AND EXISTS (SELECT 1 FROM public.autorizacoes_acesso a, n
                      WHERE a.cpf_paciente = n.cpf
                        AND a.nivel = 'plataforma'
                        AND a.revogada_em IS NULL) )
       -- MÉDICO EXTERNO: autorização NOMINAL e dentro da validade.
    OR EXISTS (SELECT 1 FROM public.autorizacoes_acesso a, n
                WHERE a.cpf_paciente = n.cpf
                  AND upper(btrim(coalesce(a.medico_crm,''))) = n.crm
                  AND a.nivel = 'medico'
                  AND a.revogada_em IS NULL
                  AND (a.expira_em IS NULL OR a.expira_em > now()))
       -- URGÊNCIA declarada: janela curta, justificada, visível ao paciente.
    OR EXISTS (SELECT 1 FROM public.autorizacoes_acesso a, n
                WHERE a.cpf_paciente = n.cpf
                  AND upper(btrim(coalesce(a.medico_crm,''))) = n.crm
                  AND a.nivel = 'urgencia'
                  AND a.revogada_em IS NULL
                  AND a.expira_em > now())
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. "Existe atendimento em curso?" — o que distingue o acesso rotineiro do
--    acesso que o paciente precisa ver.
--
--    Hoje o único ato do paciente que o banco registra é o PEDIDO (documento,
--    teleconsulta). A emergência só dispara Telegram, não grava linha — por
--    isso ela entra pela válvula de urgência, não por aqui.
--    30 dias: um pedido de exame leva semanas entre pedir, fazer e voltar.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.paciente_em_atendimento(p_cpf text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pedidos_documento d
     WHERE regexp_replace(coalesce(d.cpf,''), '\D','','g')
         = regexp_replace(coalesce(p_cpf,''), '\D','','g')
       AND d.created_at > now() - interval '30 days'
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. A PORTA DE LEITURA, refeita.
--
--    Antes: vínculo OU plataforma → entra.
--    Agora: AUTORIZAÇÃO → entra. O vínculo deixou de abrir porta sozinho;
--    ele agora só qualifica o motivo que vai para a trilha.
--
--    O motivo é mais detalhado de propósito: é ele que a tela do paciente
--    mostra, e é ele que se conta para decidir quando migrar para o modelo B.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pode_ler_paciente(
  p_cpf text, p_crm text, p_med_token text, p_pac_token text, p_recurso text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf    text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_medico boolean;
  v_pode   boolean;
  v_motivo text;
BEGIN
  -- O próprio paciente: sempre pode, sem registro. Ler o próprio prontuário
  -- não é acesso de terceiro.
  IF public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN true;
  END IF;

  v_medico := public.token_medico_ok(p_crm, p_med_token);
  IF NOT v_medico THEN
    RETURN false;   -- nem médico nem paciente: nada a registrar
  END IF;

  IF NOT public.medico_tem_autorizacao(v_cpf, p_crm) THEN
    v_pode := false;
    -- Distingue "nunca autorizou" de "autorizou e revogou/expirou": o segundo
    -- caso importa para o suporte responder "por que perdi o acesso?".
    v_motivo := CASE
      WHEN EXISTS (SELECT 1 FROM public.autorizacoes_acesso a
                    WHERE a.cpf_paciente = v_cpf
                      AND (a.medico_crm IS NULL OR upper(btrim(a.medico_crm)) = upper(btrim(coalesce(p_crm,'')))))
      THEN 'autorizacao_revogada_ou_expirada'
      ELSE 'sem_autorizacao' END;

  ELSIF public.medico_e_plataforma(p_crm) THEN
    v_pode := true;
    -- MODELO C: o acesso sem atendimento em curso é permitido, mas fica
    -- marcado — e é isso que o paciente vê na tela "quem acessou".
    v_motivo := CASE WHEN public.paciente_em_atendimento(v_cpf)
                     THEN 'plataforma_atendimento'
                     ELSE 'plataforma_sem_atendimento_em_curso' END;

  ELSIF EXISTS (SELECT 1 FROM public.autorizacoes_acesso a
                 WHERE a.cpf_paciente = v_cpf
                   AND upper(btrim(coalesce(a.medico_crm,''))) = upper(btrim(coalesce(p_crm,'')))
                   AND a.nivel = 'urgencia' AND a.revogada_em IS NULL
                   AND a.expira_em > now()) THEN
    v_pode := true;
    v_motivo := 'urgencia_declarada';

  ELSE
    v_pode := true;
    -- Médico externo autorizado. O vínculo entra aqui só como informação:
    -- autorização sem vínculo é possível (o paciente pode autorizar alguém
    -- que ainda não o atendeu) e não é erro.
    v_motivo := CASE WHEN public.medico_tem_vinculo(v_cpf, p_crm)
                     THEN 'autorizado_com_vinculo'
                     ELSE 'autorizado_sem_vinculo' END;
  END IF;

  BEGIN
    INSERT INTO public.acessos_paciente (medico_crm, cpf_paciente, recurso, permitido, motivo)
    VALUES (upper(btrim(coalesce(p_crm,''))), v_cpf, coalesce(p_recurso,'?'), v_pode, v_motivo);
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- a trilha nunca pode derrubar o atendimento
  END;

  RETURN v_pode;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. `profiles_por_cpf` tinha a régua DUPLICADA no corpo (vínculo + plataforma
--    escritos à mão, além da própria trilha). Duas cópias da mesma regra é
--    como uma delas fica para trás — foi assim que a ESCRITA ficou sem gate
--    enquanto a leitura era endurecida. Passa a chamar pode_ler_paciente.
-- ---------------------------------------------------------------------------
-- ⚠ OS `DEFAULT` SÃO OBRIGATÓRIOS: a função JÁ EXISTE no banco com eles, e
--   CREATE OR REPLACE não consegue REMOVER um default (erro 42P13 — "cannot
--   remove parameter defaults from existing function"). Reescrever a
--   assinatura sem eles derruba a migration inteira. Conferido contra
--   pg_get_function_arguments em 13/09/2026. Não "limpar".
CREATE OR REPLACE FUNCTION public.profiles_por_cpf(
  p_cpf text,
  p_crm text DEFAULT NULL::text,
  p_med_token text DEFAULT NULL::text,
  p_pac_token text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf     text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_proprio boolean;
  v_medico  boolean;
  v_pode    boolean;
  v jsonb;
BEGIN
  v_proprio := public.token_paciente_ok(v_cpf, p_pac_token);
  v_medico  := public.token_medico_ok(p_crm, p_med_token);

  IF NOT (v_proprio OR v_medico) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- Uma régua só, e ela já registra a trilha.
  v_pode := v_proprio OR public.pode_ler_paciente(v_cpf, p_crm, p_med_token, p_pac_token, 'profiles');

  IF v_pode THEN
    SELECT jsonb_build_object(
             'id', p.id, 'cpf', p.cpf, 'nome', p.nome, 'sexo', p.sexo,
             'data_nascimento', p.data_nascimento, 'celular', p.celular,
             'email', p.email, 'bariatrica', p.bariatrica, 'gestante', p.gestante,
             'semanas_gestacao_triagem', p.semanas_gestacao_triagem,
             'data_triagem_gestacao', p.data_triagem_gestacao,
             'boas_vindas_vista', p.boas_vindas_vista,
             'primeira_avaliacao_feita', p.primeira_avaliacao_feita
           )
      INTO v FROM public.profiles p WHERE p.cpf = v_cpf LIMIT 1;
  ELSE
    -- Sem autorização: identificação mínima + flags que ROTEIAM O FLUXO, para
    -- o médico saber que o CPF existe e pedir a autorização. SEM contato,
    -- SEM dado clínico.
    SELECT jsonb_build_object(
             'id', p.id, 'cpf', p.cpf, 'nome', p.nome, 'sexo', p.sexo,
             'data_nascimento', p.data_nascimento,
             'bariatrica', p.bariatrica, 'gestante', p.gestante,
             'semanas_gestacao_triagem', p.semanas_gestacao_triagem,
             'data_triagem_gestacao', p.data_triagem_gestacao
           )
      INTO v FROM public.profiles p WHERE p.cpf = v_cpf LIMIT 1;
  END IF;

  -- `vinculo` continua no retorno com o nome antigo (o front lê esta chave),
  -- mas agora carrega AUTORIZAÇÃO. Renomear no mesmo commit que muda a
  -- semântica quebraria as telas; fica para a Etapa 3.
  RETURN jsonb_build_object('ok', true, 'perfil', v, 'vinculo', v_pode);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. CONCEDER — gravada com a credencial DO PACIENTE. É o ponto inteiro:
--    consentimento que o médico grava não é consentimento.
--
--    (Era esse o defeito de `medico_quer_receber`, removida no passo 4: o nome
--     dizia consentimento, a credencial dizia outra coisa, e quem lia o código
--     concluía que a questão estava resolvida.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.autorizacao_conceder(
  p_cpf text, p_token text, p_nivel text, p_medico_crm text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf  text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_crm  text := NULLIF(upper(btrim(coalesce(p_medico_crm,''))), '');
  v_exp  timestamptz;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  -- GATE: só o DONO do CPF autoriza o próprio prontuário.
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  IF p_nivel NOT IN ('plataforma','medico') THEN
    -- 'urgencia' NÃO passa por aqui: quem a declara é o médico, e ela tem
    -- porta própria (autorizacao_urgencia), com justificativa obrigatória.
    RETURN jsonb_build_object('ok', false, 'erro', 'Nivel invalido');
  END IF;

  IF p_nivel = 'medico' THEN
    IF v_crm IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Informe o CRM do medico');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.medicos WHERE crm = v_crm) THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Medico nao encontrado');
    END IF;
    -- 12 meses, alinhado à anuidade: o paciente já volta anualmente, e a
    -- renovação cai num momento em que ele está na plataforma.
    v_exp := now() + interval '12 months';
  ELSE
    v_crm := NULL;
    v_exp := NULL;   -- plataforma vale enquanto a conta existir
  END IF;

  -- Idempotente: já vigente → não duplica.
  IF EXISTS (SELECT 1 FROM public.autorizacoes_acesso a
              WHERE a.cpf_paciente = v_cpf AND a.nivel = p_nivel
                AND coalesce(a.medico_crm,'') = coalesce(v_crm,'')
                AND a.revogada_em IS NULL
                AND (a.expira_em IS NULL OR a.expira_em > now())) THEN
    RETURN jsonb_build_object('ok', true, 'ja_vigente', true);
  END IF;

  INSERT INTO public.autorizacoes_acesso (cpf_paciente, medico_crm, nivel, expira_em)
  VALUES (v_cpf, v_crm, p_nivel, v_exp);

  RETURN jsonb_build_object('ok', true, 'expira_em', v_exp);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6b. QUEM É ESTE MÉDICO — o cartão que o paciente lê antes de autorizar.
--
--     Autorizar às cegas não é autorizar. O paciente precisa ver nome, CRM e
--     se o cadastro foi VALIDADO (a selfie com a carteira profissional) — este
--     último é o que distingue um médico conferido de um cadastro qualquer, e
--     é justamente o que ele não teria como saber sozinho.
--
--     Gateada pelo token do PACIENTE: nome de médico com CRM é público (o CFM
--     publica), mas uma RPC aberta viraria enumeração do cadastro inteiro.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.medico_cartao(p_crm text, p_cpf text, p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v jsonb;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;

  SELECT jsonb_build_object(
           'nome',       COALESCE(NULLIF(m.nome,''), 'CRM ' || m.crm),
           'crm',        m.crm,
           'uf',         m.uf,
           'validado',   COALESCE(m.validado, false),
           'plataforma', COALESCE(m.plataforma, false))
    INTO v
    FROM public.medicos m
   WHERE m.crm = upper(btrim(coalesce(p_crm,'')));

  IF v IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Medico nao encontrado');
  END IF;

  -- Já autorizado? A tela precisa saber para não pedir de novo.
  RETURN v || jsonb_build_object('ok', true,
    'ja_autorizado', public.medico_tem_autorizacao(v_cpf, p_crm));
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. REVOGAR — em dois toques, sem justificar. Nunca apaga.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.autorizacao_revogar(
  p_cpf text, p_token text, p_nivel text, p_medico_crm text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_crm text := NULLIF(upper(btrim(coalesce(p_medico_crm,''))), '');
  v_n   int;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;

  UPDATE public.autorizacoes_acesso
     SET revogada_em = now()
   WHERE cpf_paciente = v_cpf
     AND nivel = p_nivel
     AND coalesce(medico_crm,'') = coalesce(v_crm,'')
     AND revogada_em IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'revogadas', v_n);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. URGÊNCIA — a válvula. Declarada pelo MÉDICO, com justificativa escrita,
--    12 horas de validade, e marcação destacada na trilha do paciente.
--
--    Existe porque o paciente aciona o botão de emergência e o plantonista
--    precisa abrir o prontuário naquele minuto. Sem ela, o modelo travaria o
--    socorro — que é o pior lugar possível para um controle de acesso falhar.
--
--    O preço é a visibilidade: toda urgência aparece para o paciente, com o
--    motivo que o médico escreveu e o nome dele.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.autorizacao_urgencia(
  p_crm text, p_token text, p_cpf text, p_justificativa text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf  text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_just text := btrim(coalesce(p_justificativa,''));
  v_exp  timestamptz := now() + interval '12 hours';
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF length(v_just) < 15 THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Descreva a urgencia (minimo 15 caracteres). O paciente vera esta justificativa.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE cpf = v_cpf) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Paciente nao encontrado');
  END IF;

  INSERT INTO public.autorizacoes_acesso
    (cpf_paciente, medico_crm, nivel, expira_em, justificativa)
  VALUES (v_cpf, upper(btrim(p_crm)), 'urgencia', v_exp, v_just);

  -- A ADM fica sabendo na hora. Acesso de urgência é excepcional por
  -- definição; se virar rotina, é sinal de que algo no fluxo está errado.
  PERFORM public.tg_enviar(
    '🚨 ACESSO DE URGÊNCIA ao prontuário' || E'\n' ||
    'Médico: ' || upper(btrim(p_crm)) || E'\n' ||
    'Paciente: ***.' || substr(v_cpf,4,3) || '.' || substr(v_cpf,7,3) || '-**' || E'\n' ||
    'Motivo: ' || v_just || E'\n' ||
    'Válido por 12h. O paciente vê este acesso.');

  RETURN jsonb_build_object('ok', true, 'expira_em', v_exp);
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. O PACIENTE LÊ A PRÓPRIA TRILHA.
--    `acessos_paciente` é gravada desde ago/2026 e nunca teve leitor além do
--    Admin. Trilha que ninguém lê não constrange ninguém.
-- ---------------------------------------------------------------------------
ALTER TABLE public.acessos_paciente
  ADD COLUMN IF NOT EXISTS visto_em timestamptz;

CREATE OR REPLACE FUNCTION public.meus_acessos(p_cpf text, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_ac  jsonb; v_au jsonb; v_novos int;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;

  -- Quem abriu, quando, e POR QUÊ. O nome do médico vem junto: "CRM 1234/BA"
  -- não diz nada a um paciente.
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'quando' DESC), '[]'::jsonb) INTO v_ac
  FROM (
    SELECT jsonb_build_object(
             'quando',  a.created_at,
             'medico',  COALESCE(NULLIF(m.nome,''), a.medico_crm),
             'crm',     a.medico_crm,
             'o_que',   a.recurso,
             'permitido', a.permitido,
             'motivo',  a.motivo,
             -- Destaque na tela: urgência e acesso fora de atendimento são os
             -- dois que o paciente precisa notar.
             'destacar', a.motivo IN ('urgencia_declarada','plataforma_sem_atendimento_em_curso'),
             'justificativa', (
               SELECT z.justificativa FROM public.autorizacoes_acesso z
                WHERE z.cpf_paciente = a.cpf_paciente
                  AND upper(btrim(coalesce(z.medico_crm,''))) = upper(btrim(coalesce(a.medico_crm,'')))
                  AND z.nivel = 'urgencia'
                  AND z.concedida_em <= a.created_at
                ORDER BY z.concedida_em DESC LIMIT 1)
           ) AS x
      FROM public.acessos_paciente a
      LEFT JOIN public.medicos m ON m.crm = a.medico_crm
     WHERE regexp_replace(coalesce(a.cpf_paciente,''), '\D','','g') = v_cpf
     ORDER BY a.created_at DESC
     LIMIT 200
  ) s;

  -- Quem TEM acesso agora (diferente de quem já acessou).
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'desde' DESC), '[]'::jsonb) INTO v_au
  FROM (
    SELECT jsonb_build_object(
             'nivel',  a.nivel,
             'medico', COALESCE(NULLIF(m.nome,''), a.medico_crm),
             'crm',    a.medico_crm,
             'desde',  a.concedida_em,
             'expira', a.expira_em
           ) AS x
      FROM public.autorizacoes_acesso a
      LEFT JOIN public.medicos m ON m.crm = a.medico_crm
     WHERE a.cpf_paciente = v_cpf
       AND a.revogada_em IS NULL
       AND (a.expira_em IS NULL OR a.expira_em > now())
  ) s;

  SELECT count(*) INTO v_novos FROM public.acessos_paciente a
   WHERE regexp_replace(coalesce(a.cpf_paciente,''), '\D','','g') = v_cpf
     AND a.visto_em IS NULL AND a.permitido
     AND a.motivo IN ('urgencia_declarada','plataforma_sem_atendimento_em_curso');

  RETURN jsonb_build_object('ok', true, 'acessos', v_ac,
                            'autorizacoes', v_au, 'novos_para_ver', v_novos);
END;
$$;

-- Marca como visto — some a faixa do dashboard.
CREATE OR REPLACE FUNCTION public.meus_acessos_marcar_vistos(p_cpf text, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g'); v_n int;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  UPDATE public.acessos_paciente SET visto_em = now()
   WHERE regexp_replace(coalesce(cpf_paciente,''), '\D','','g') = v_cpf
     AND visto_em IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'marcados', v_n);
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. A SEXTA PORTA FECHA: `is_admin` deixa de alcançar dado clínico.
--
--     Estava ali por conveniência operacional ("Admin é sempre plataforma, não
--     depende de alguém lembrar de marcar" — migrate_vinculo_medico_paciente.sql:87),
--     não por razão clínica. Administrador não é médico: o papel é concedido
--     pelo painel, não por um ato médico, e quem o recebe pode não ter CRM
--     ativo. Quem precisar de dado clínico recebe `plataforma` explicitamente
--     — escrito, não presumido por flag.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.medico_e_plataforma(p_crm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.medicos m
     WHERE m.crm = upper(btrim(coalesce(p_crm,'')))
       AND m.plataforma IS TRUE      -- is_admin NÃO entra aqui (13/09/2026)
  );
$$;

-- ---------------------------------------------------------------------------
-- 11. `medico_quer_receber` SAI.
--
--     O nome dizia consentimento do paciente; a RPC era chamada com a
--     credencial do MÉDICO. Um campo assim é pior que campo nenhum: faz quem
--     lê o código concluir que a questão já está resolvida. O consentimento de
--     verdade é `autorizacoes_acesso`, por par CPF↔CRM — semântica diferente,
--     não dava para renomear.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.avaliacoes_marcar_quer_receber(text, text);
ALTER TABLE public.avaliacoes DROP COLUMN IF EXISTS medico_quer_receber;

-- ---------------------------------------------------------------------------
-- 12. GRANTs.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.medico_tem_autorizacao(text, text)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.paciente_em_atendimento(text)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autorizacao_conceder(text,text,text,text)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.medico_cartao(text,text,text)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autorizacao_revogar(text,text,text,text)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autorizacao_urgencia(text,text,text,text)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meus_acessos(text,text)                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meus_acessos_marcar_vistos(text,text)       TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO
--   -- a porta fechou? (sem autorização, médico não lê)
--   SELECT public.medico_tem_autorizacao('<cpf>', '6302/BA');   -- espera: false
--
--   -- is_admin não alcança mais:
--   SELECT public.medico_e_plataforma('<crm_admin_sem_plataforma>');  -- false
--
--   -- a coluna enganosa sumiu:
--   SELECT count(*) FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='avaliacoes'
--      AND column_name='medico_quer_receber';                   -- espera: 0
--
--   -- ⚠ FALTA AINDA (passo 1 da Etapa 1): a ESCRITA continua por `oba_pode_ver`,
--   -- que não checa autorização. Até o próximo arquivo, um médico logado ainda
--   -- escreve na anamnese de qualquer CPF. Ver migrate_consentimento_escrita.sql.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- admin_oba_hpylori — ESTREITADA (13/09/2026)
-- ---------------------------------------------------------------------------
-- Era uma porta para o prontuário: devolvia `relatorio_oba` INTEIRO de TODOS os
-- pacientes, gateada só por token de admin. A tela que a consome usa exatamente
-- três coisas — CPF, se houve detecção e quando — para mandar um WhatsApp
-- lembrando de repetir o exame 6 meses depois.
--
-- A correção certa aqui NÃO é exigir autorização: é lembrete operacional, e
-- exigir consentimento clínico para disparar um lembrete criaria atrito sem
-- proteger ninguém. A correção é PARAR DE DEVOLVER o que não se usa.
-- Decisão do Estácio, 13/09/2026: "devolver só CPF, detectado e data. Melhor
-- que gatear."
--
-- ⚠ Não voltar a devolver `relatorio_oba` aqui. Se um dia a tela precisar de
-- dado clínico de verdade, ela deixou de ser lembrete e passa pela régua de
-- autorização como qualquer leitura de prontuário.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_oba_hpylori(p_crm text, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'cpf',       t.cpf,
           'detectado', t.detectado,
           -- Data da detecção; cai para a data dos exames e daí para a criação
           -- da linha, que é a mesma cascata que o JavaScript fazia antes.
           'data',      COALESCE(t.data_hp, t.data_exames::text, t.created_at::text)
         )), '[]'::jsonb) INTO v
    FROM (
      SELECT DISTINCT ON (o.cpf)
             o.cpf,
             COALESCE((o.relatorio_oba->'hpylori'->>'detectado')::boolean, false) AS detectado,
             o.relatorio_oba->'hpylori'->>'data' AS data_hp,
             o.data_exames, o.created_at
        FROM public.oba_anamnese o
       ORDER BY o.cpf, o.created_at DESC
    ) t
   -- Quem nunca teve detecção não tem por que aparecer numa lista de lembrete.
   WHERE t.detectado;

  RETURN jsonb_build_object('ok', true, 'linhas', v);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_oba_hpylori(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ===========================================================================
-- AS DUAS PORTAS DO PAINEL ADMINISTRATIVO (13/09/2026)
-- ===========================================================================
-- O painel tem 12 abas. Onze são operacionais (cadastros, pagamentos,
-- lembretes, catálogo, configuração) e NENHUMA devolve dado clínico. Uma é
-- prontuário: "Pacientes" e a ficha que ela abre.
--
-- Essa aba estava gateada só por `token_admin_ok`. Quem tem token de admin
-- pode não ser médico — o painel de atendimento é operado por pessoa da
-- equipe. A Etapa 1 declara que prontuário exige autorização; subir com esta
-- porta aberta tornaria a declaração falsa no primeiro dia.
--
-- RÉGUA (decidida com o Estácio, 13/09/2026), em duas camadas:
--   1. QUEM PEDE  — médico de plataforma (`medico_e_plataforma`), não `is_admin`.
--   2. DE QUEM    — cada paciente precisa ter autorizado.
--
-- GRANULARIDADE DA TRILHA — e o porquê:
--   · a LISTA filtra com `medico_tem_autorizacao`, que é silencioso. Gravar 200
--     linhas de trilha por abertura de tela encheria o "quem abriu os meus
--     dados" de ruído e o paciente pararia de ler o que importa.
--   · a FICHA passa por `pode_ler_paciente`, que grava. É ali que um prontuário
--     é de fato aberto, e é ali que o paciente precisa enxergar.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) admin_avaliacoes_recentes — LISTA (fila de trabalho)
-- ---------------------------------------------------------------------------
-- Era `SELECT * FROM avaliacoes`: 47 colunas de 200 pacientes, incluindo
-- `hiv_tratamento`, `alcoolista`, `gestante`, `celiaco`, `g6pd`, `transfundido`,
-- `hidroxiureia`, `methotrexato`. A tela usa SETE campos.
--
-- ⚠ NÃO voltar a `SELECT *`. Dado que não sai do banco não vaza, não entra em
-- log e não fica em cache — e `SELECT *` volta a crescer sozinho a cada coluna
-- nova, sem ninguém decidir nada. O resto do prontuário só trafega quando
-- alguém abre a ficha de UMA pessoa, que é onde a trilha grava.
--
-- Assinatura conferida contra o banco antes de reescrever (o DEFAULT 200 tem
-- de ficar: CREATE OR REPLACE não consegue removê-lo — erro 42P13).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_avaliacoes_recentes(
  p_crm text, p_token text, p_limite int DEFAULT 200
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- Camada 1: ser admin não basta. Prontuário é para médico.
  IF NOT public.medico_e_plataforma(p_crm) THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Esta area e clinica: so medico da plataforma pode abrir.');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id',                a.id,
           'cpf',               a.cpf,
           'created_at',        a.created_at,
           'data_coleta',       a.data_coleta,
           'diagnostico_label', a.diagnostico_label,
           'diagnostico_color', a.diagnostico_color,
           'bariatrica',        a.bariatrica
         ) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v
    FROM (
      SELECT * FROM public.avaliacoes
       ORDER BY created_at DESC
       LIMIT GREATEST(COALESCE(p_limite, 200), 1)
    ) a
   -- Camada 2: quem não autorizou não aparece. Silencioso de propósito.
   WHERE public.medico_tem_autorizacao(a.cpf, p_crm);

  RETURN jsonb_build_object('ok', true, 'linhas', v);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_avaliacoes_recentes(text, text, int) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) admin_oba_ficha — A FICHA (abrir o prontuário de UMA pessoa)
-- ---------------------------------------------------------------------------
-- Passa a devolver TAMBÉM as avaliações completas desse CPF, porque a lista
-- deixou de carregá-las. É a troca que o modelo exige: a fila fica magra, e o
-- prontuário inteiro só se move quando alguém abre uma pessoa — com trilha.
--
-- A régua aqui é `pode_ler_paciente`, a MESMA de toda leitura de prontuário no
-- sistema, e não uma checagem paralela. É ela que grava a trilha. O token de
-- admin serve como token de médico (mesma linha em `medicos`, mesma sessão),
-- então `pode_ler_paciente` o aceita sem gambiarra.
--
-- ⚠ A ficha continua devolvendo a anamnese inteira, e isso é deliberado: ela É
-- o prontuário. Médico de plataforma, com autorização do paciente e acesso
-- registrado, abrindo um prontuário, vê o prontuário. Encolher a fila é
-- higiene; encolher a ficha seria esconder do médico o que ele precisa ler.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_oba_ficha(p_crm text, p_token text, p_cpf text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_oba jsonb;
  v_av  jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  IF NOT public.medico_e_plataforma(p_crm) THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Esta area e clinica: so medico da plataforma pode abrir.');
  END IF;

  -- Régua compartilhada + trilha. Se o paciente não autorizou (ou revogou),
  -- para aqui — e a recusa também fica registrada.
  IF NOT public.pode_ler_paciente(v_cpf, p_crm, p_token, NULL, 'admin_ficha') THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Este paciente nao autorizou o acesso aos dados de saude dele.');
  END IF;

  SELECT to_jsonb(o.*) INTO v_oba
    FROM public.oba_anamnese o
   WHERE regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g') = v_cpf
   ORDER BY o.created_at DESC
   LIMIT 1;

  SELECT COALESCE(jsonb_agg(to_jsonb(a.*) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_av
    FROM public.avaliacoes a
   WHERE regexp_replace(coalesce(a.cpf, ''), '\D', '', 'g') = v_cpf;

  RETURN jsonb_build_object('ok', true, 'linha', v_oba, 'avaliacoes', v_av);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_oba_ficha(text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
