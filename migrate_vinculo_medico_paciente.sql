-- ============================================================================
-- migrate_vinculo_medico_paciente.sql
--
-- PROBLEMA (auditoria de segurança, ago/2026 — o achado mais grave):
-- o porteiro que protege TODO dado clínico (`oba_pode_ver`/`perfil_pode_ver`)
-- pergunta apenas *"é um médico?"* — nunca *"é o médico DESTE paciente?"*:
--
--     SELECT token_medico_ok(crm, tok) OR token_paciente_ok(cpf, tok);
--
-- Como `register_medico` aceita QUALQUER texto como CRM (a única validação é
-- "não pode ser vazio") e já devolve token válido por 30 dias, qualquer pessoa
-- se cadastra como médico e lê, por CPF, o prontuário completo de qualquer
-- paciente: nome, celular, endereço, contato de emergência e a anamnese
-- inteira — incluindo ideação suicida, HIV e câncer. Não é bug: é o fluxo
-- normal do produto. É exposição de dado sensível de saúde (LGPD art. 11).
--
-- RÉGUA DECIDIDA PELO DR. RAMOS — DOIS TIPOS DE MÉDICO:
--
--   1) MÉDICO DA PLATAFORMA (`medicos.plataforma = true`, ligado por você no
--      Admin): alcança QUALQUER paciente. É o trabalho dele — teleconsulta,
--      revisão de anamnese, prescrição, plantão. Sem isso, o paciente que entra
--      espontaneamente não teria quem o atendesse, e um médico da casa não
--      poderia cuidar de paciente que veio por outro médico.
--
--   2) MÉDICO EXTERNO (auto-cadastro 4DOC, o padrão): só alcança o paciente que
--      ELE encaminhou ou já avaliou. Para CPF novo ainda consegue AVALIAR (o
--      negócio depende disso), mas não vê o histórico até o vínculo existir.
--
--   - TODO acesso de médico a dado de paciente fica REGISTRADO, com o motivo
--     (papel de plataforma x vínculo próprio).
--
-- É a APROVAÇÃO que concede o alcance amplo — por isso esta régua e a foto da
-- carteira profissional são a mesma defesa em duas partes: quem você aprova
-- atende todo mundo; quem se cadastra sozinho só alcança os próprios pacientes.
--
-- O QUE MUDA E O QUE NÃO MUDA:
--   - LEITURAS de histórico passam a exigir vínculo (5 funções).
--   - ESCRITAS seguem só com token de médico — é a escrita que CRIA o vínculo
--     (avaliar/encaminhar). Sem isso, avaliar paciente novo quebraria.
--   - O PACIENTE, com o token dele, continua vendo tudo que é dele.
--   - O ADMIN não passa por aqui (tem funções próprias, gateadas por
--     token_admin_ok) — nada muda para ele.
--
-- ⚠ RISCO RESIDUAL, ACEITO E DOCUMENTADO: como AVALIAR cria vínculo, um médico
-- mal-intencionado pode avaliar um CPF só para destravar o histórico. A
-- diferença é que agora isso deixa RASTRO (tabela `acessos_paciente` + o
-- crédito gerado) em vez de ser silencioso. A trava de verdade contra esse
-- caminho é a aprovação do cadastro médico (foto da carteira), que é a próxima
-- etapa do plano — as duas se complementam.
--
-- Idempotente: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE.
-- PASSO no Supabase → SQL Editor: rodar este arquivo inteiro.
-- ============================================================================

-- ── 1) Trilha de auditoria ───────────────────────────────────────────────────
-- Quem (CRM) tentou ler o quê (recurso) de quem (CPF), quando, e se passou.
-- RLS ligado e ZERO policies: só alcançável por RPC SECURITY DEFINER.
CREATE TABLE IF NOT EXISTS public.acessos_paciente (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_crm   text        NOT NULL,
  cpf_paciente text        NOT NULL,
  recurso      text        NOT NULL,
  permitido    boolean     NOT NULL,
  -- POR QUE passou (ou não): 'plataforma' | 'vinculo' | 'sem_vinculo'. Sem o
  -- motivo, a trilha não distingue o médico da casa fazendo o trabalho dele de
  -- um médico externo que forjou vínculo — que é justamente o que se quer ver.
  motivo       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.acessos_paciente ADD COLUMN IF NOT EXISTS motivo text;

ALTER TABLE public.acessos_paciente ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_acessos_paciente_cpf  ON public.acessos_paciente (cpf_paciente, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acessos_paciente_crm  ON public.acessos_paciente (medico_crm,   created_at DESC);


-- ── 1b) Papel: MÉDICO DA PLATAFORMA ─────────────────────────────────────────
-- Default FALSE: quem se cadastra sozinho NÃO nasce com alcance amplo.
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS plataforma boolean NOT NULL DEFAULT false;

-- Os médicos que JÁ existem entram como plataforma (decisão do Dr. Ramos:
-- "aprovar os atuais e exigir dos novos"). Hoje são 2, ambos dele — sem este
-- backfill ele perderia acesso ao próprio sistema ao aplicar a migração.
UPDATE public.medicos SET plataforma = true WHERE plataforma IS DISTINCT FROM true;

-- Admin é sempre plataforma (não depende de alguém lembrar de marcar).
CREATE OR REPLACE FUNCTION public.medico_e_plataforma(p_crm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.medicos m
     WHERE m.crm = upper(btrim(coalesce(p_crm,'')))
       AND (m.plataforma IS TRUE OR m.is_admin IS TRUE)
  );
$function$;

GRANT EXECUTE ON FUNCTION public.medico_e_plataforma(text) TO anon, authenticated;


-- ── 2) A régua do vínculo ────────────────────────────────────────────────────
-- Seis fontes, todas já existentes. Basta UMA para o vínculo existir.
CREATE OR REPLACE FUNCTION public.medico_tem_vinculo(p_cpf text, p_crm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH n AS (
    SELECT regexp_replace(coalesce(p_cpf,''), '\D', '', 'g') AS cpf,
           upper(btrim(coalesce(p_crm,'')))                  AS crm
  )
  SELECT (SELECT cpf FROM n) <> '' AND (SELECT crm FROM n) <> '' AND (
       -- encaminhou (é a origem do paciente)
       EXISTS (SELECT 1 FROM public.profiles p, n
                WHERE regexp_replace(coalesce(p.cpf,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(p.medico_origem,''))) = n.crm)
       -- já avaliou
    OR EXISTS (SELECT 1 FROM public.avaliacoes a, n
                WHERE regexp_replace(coalesce(a.cpf,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(a.medico_crm,''))) = n.crm)
       -- já triou
    OR EXISTS (SELECT 1 FROM public.triagens t, n
                WHERE regexp_replace(coalesce(t.cpf,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(t.medico_crm,''))) = n.crm)
       -- encaminhamento registrado
    OR EXISTS (SELECT 1 FROM public.encaminhamentos_medico e, n
                WHERE regexp_replace(coalesce(e.cpf_paciente,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(e.medico_crm,''))) = n.crm)
       -- crédito de conversão / de avaliação já registrado
    OR EXISTS (SELECT 1 FROM public.creditos_medico c, n
                WHERE regexp_replace(coalesce(c.cpf_paciente,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(c.medico_crm,''))) = n.crm)
    OR EXISTS (SELECT 1 FROM public.creditos_avaliacao v, n
                WHERE regexp_replace(coalesce(v.cpf_paciente,''), '\D','','g') = n.cpf
                  AND upper(btrim(coalesce(v.medico_crm,''))) = n.crm)
  );
$function$;

GRANT EXECUTE ON FUNCTION public.medico_tem_vinculo(text, text) TO anon, authenticated;


-- ── 3) Porteiro das LEITURAS (com registro) ──────────────────────────────────
-- VOLATILE de propósito (grava na trilha) — não pode ser STABLE.
-- Só registra acesso de MÉDICO: o paciente lendo o próprio dado é ruído.
CREATE OR REPLACE FUNCTION public.pode_ler_paciente(
  p_cpf text, p_crm text, p_med_token text, p_pac_token text, p_recurso text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf     text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_medico  boolean;
  v_pode    boolean;
  v_motivo  text;
BEGIN
  -- O próprio paciente: sempre pode, sem registro.
  IF public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN true;
  END IF;

  v_medico := public.token_medico_ok(p_crm, p_med_token);
  IF NOT v_medico THEN
    RETURN false;   -- nem médico nem paciente: nada a registrar
  END IF;

  -- MÉDICO DA PLATAFORMA alcança qualquer paciente (é o trabalho dele); médico
  -- externo, só os próprios. Os dois casos ficam na trilha, com o motivo.
  IF public.medico_e_plataforma(p_crm) THEN
    v_pode := true;  v_motivo := 'plataforma';
  ELSIF public.medico_tem_vinculo(v_cpf, p_crm) THEN
    v_pode := true;  v_motivo := 'vinculo';
  ELSE
    v_pode := false; v_motivo := 'sem_vinculo';
  END IF;

  BEGIN
    INSERT INTO public.acessos_paciente (medico_crm, cpf_paciente, recurso, permitido, motivo)
    VALUES (upper(btrim(coalesce(p_crm,''))), v_cpf, coalesce(p_recurso,'?'), v_pode, v_motivo);
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- a trilha nunca pode derrubar o atendimento
  END;

  RETURN v_pode;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.pode_ler_paciente(text, text, text, text, text) TO anon, authenticated;


-- ── 4) LEITURAS passam a exigir vínculo ──────────────────────────────────────
-- (mesmo corpo de antes; muda só a linha do porteiro e o texto do erro)

CREATE OR REPLACE FUNCTION public.avaliacoes_por_cpf(
  p_cpf text, p_crm text DEFAULT NULL, p_med_token text DEFAULT NULL,
  p_pac_token text DEFAULT NULL, p_user_id uuid DEFAULT NULL, p_ordem text DEFAULT 'desc'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_linhas jsonb;
BEGIN
  IF v_cpf = '' THEN RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido'); END IF;
  IF NOT public.pode_ler_paciente(v_cpf, p_crm, p_med_token, p_pac_token, 'avaliacoes') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem vinculo com este paciente');
  END IF;

  SELECT COALESCE(
           jsonb_agg(to_jsonb(a.*) ORDER BY
             CASE WHEN lower(coalesce(p_ordem,'desc')) = 'asc' THEN a.data_coleta END ASC,
             CASE WHEN lower(coalesce(p_ordem,'desc')) <> 'asc' THEN a.data_coleta END DESC
           ), '[]'::jsonb)
    INTO v_linhas
    FROM public.avaliacoes a
   WHERE regexp_replace(coalesce(a.cpf, ''), '\D', '', 'g') = v_cpf
     AND (p_user_id IS NULL OR a.user_id = p_user_id);

  RETURN jsonb_build_object('ok', true, 'linhas', v_linhas);
END;
$function$;

CREATE OR REPLACE FUNCTION public.avaliacoes_contagem_cpf(
  p_cpf text, p_crm text DEFAULT NULL, p_med_token text DEFAULT NULL, p_pac_token text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_n int;
BEGIN
  IF NOT public.pode_ler_paciente(v_cpf, p_crm, p_med_token, p_pac_token, 'avaliacoes_contagem') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem vinculo com este paciente');
  END IF;
  SELECT count(*) INTO v_n FROM public.avaliacoes a
   WHERE regexp_replace(coalesce(a.cpf,''), '\D', '', 'g') = v_cpf;
  RETURN jsonb_build_object('ok', true, 'total', v_n);
END;
$function$;

CREATE OR REPLACE FUNCTION public.oba_anamnese_por_cpf(
  p_cpf text, p_crm text DEFAULT NULL, p_med_token text DEFAULT NULL, p_pac_token text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_linhas jsonb;
BEGIN
  IF v_cpf = '' THEN RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido'); END IF;
  IF NOT public.pode_ler_paciente(v_cpf, p_crm, p_med_token, p_pac_token, 'oba_anamnese') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem vinculo com este paciente');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(o.*) ORDER BY o.created_at ASC), '[]'::jsonb)
    INTO v_linhas
    FROM public.oba_anamnese o
   WHERE regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g') = v_cpf;

  RETURN jsonb_build_object('ok', true, 'linhas', v_linhas);
END;
$function$;

CREATE OR REPLACE FUNCTION public.oba_anamnese_relatorio_atual(
  p_cpf text, p_crm text DEFAULT NULL, p_med_token text DEFAULT NULL, p_pac_token text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_rel jsonb;
  v_est text;
BEGIN
  IF v_cpf = '' THEN RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido'); END IF;
  IF NOT public.pode_ler_paciente(v_cpf, p_crm, p_med_token, p_pac_token, 'oba_relatorio') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem vinculo com este paciente');
  END IF;

  SELECT o.relatorio_oba, o.estado_clinico
    INTO v_rel, v_est
    FROM public.oba_anamnese o
   WHERE regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g') = v_cpf
   ORDER BY o.created_at DESC
   LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'relatorio_oba', v_rel, 'estado_clinico', v_est);
END;
$function$;

CREATE OR REPLACE FUNCTION public.triagens_por_cpf(
  p_cpf text, p_crm text DEFAULT NULL, p_med_token text DEFAULT NULL, p_pac_token text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  resultado jsonb;
BEGIN
  IF v_cpf = '' THEN RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido'); END IF;
  -- Antes autorizava QUALQUER médico para QUALQUER CPF (token_medico_ok direto).
  IF NOT public.pode_ler_paciente(v_cpf, p_crm, p_med_token, p_pac_token, 'triagens') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem vinculo com este paciente');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO resultado
    FROM public.triagens t
   WHERE regexp_replace(coalesce(t.cpf, ''), '\D', '', 'g') = v_cpf;

  RETURN jsonb_build_object('ok', true, 'triagens', resultado);
END;
$function$;


-- ── 5) profiles_por_cpf: COMPLETO com vínculo, MÍNIMO sem ────────────────────
-- Sem vínculo o médico ainda precisa identificar o paciente para poder AVALIAR
-- (nome/sexo/nascimento — o mesmo que `lookup_cpf_triagem` já expõe publicamente,
-- exposição residual que o Dr. Ramos aceitou) e das flags clínicas que decidem o
-- fluxo. O que NÃO sai sem vínculo: celular, e-mail e o estado de onboarding.
-- Endereço e contato de emergência já não saíam por esta função.
-- O campo `vinculo` vai na resposta para a tela poder avisar o médico.
CREATE OR REPLACE FUNCTION public.profiles_por_cpf(
  p_cpf text, p_crm text DEFAULT NULL, p_med_token text DEFAULT NULL, p_pac_token text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_proprio boolean;
  v_medico  boolean;
  v_vinculo boolean;
  v jsonb;
BEGIN
  v_proprio := public.token_paciente_ok(v_cpf, p_pac_token);
  v_medico  := public.token_medico_ok(p_crm, p_med_token);

  IF NOT (v_proprio OR v_medico) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  v_vinculo := v_proprio
            OR public.medico_e_plataforma(p_crm)
            OR public.medico_tem_vinculo(v_cpf, p_crm);

  IF v_medico AND NOT v_proprio THEN
    BEGIN
      INSERT INTO public.acessos_paciente (medico_crm, cpf_paciente, recurso, permitido, motivo)
      VALUES (upper(btrim(coalesce(p_crm,''))), v_cpf, 'profiles', v_vinculo,
              CASE WHEN public.medico_e_plataforma(p_crm) THEN 'plataforma'
                   WHEN v_vinculo THEN 'vinculo' ELSE 'sem_vinculo' END);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  IF v_vinculo THEN
    SELECT jsonb_build_object(
             'id', p.id, 'cpf', p.cpf, 'nome', p.nome, 'sexo', p.sexo,
             'data_nascimento', p.data_nascimento, 'celular', p.celular,
             'email', p.email, 'bariatrica', p.bariatrica, 'gestante', p.gestante,
             'semanas_gestacao_triagem', p.semanas_gestacao_triagem,
             'data_triagem_gestacao', p.data_triagem_gestacao,
             'boas_vindas_vista', p.boas_vindas_vista,
             'primeira_avaliacao_feita', p.primeira_avaliacao_feita
           )
      INTO v
      FROM public.profiles p
     WHERE p.cpf = v_cpf
     LIMIT 1;
  ELSE
    -- Identificação + flags clínicas que roteiam o fluxo. Sem contato.
    SELECT jsonb_build_object(
             'id', p.id, 'cpf', p.cpf, 'nome', p.nome, 'sexo', p.sexo,
             'data_nascimento', p.data_nascimento,
             'bariatrica', p.bariatrica, 'gestante', p.gestante,
             'semanas_gestacao_triagem', p.semanas_gestacao_triagem,
             'data_triagem_gestacao', p.data_triagem_gestacao
           )
      INTO v
      FROM public.profiles p
     WHERE p.cpf = v_cpf
     LIMIT 1;
  END IF;

  RETURN jsonb_build_object('ok', true, 'perfil', v, 'vinculo', v_vinculo);
END;
$function$;


-- ── 6) Consulta da trilha (para o Admin) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_acessos_paciente(
  p_crm text, p_token text, p_cpf text DEFAULT NULL, p_limite int DEFAULT 200
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(a.*) ORDER BY a.created_at DESC), '[]'::jsonb)
    INTO v
    FROM (SELECT * FROM public.acessos_paciente
           WHERE (v_cpf = '' OR cpf_paciente = v_cpf)
           ORDER BY created_at DESC
           LIMIT greatest(1, least(coalesce(p_limite,200), 2000))) a;
  RETURN jsonb_build_object('ok', true, 'linhas', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_acessos_paciente(text, text, text, int) TO anon, authenticated;


-- ── 6b) Admin liga/desliga o papel de MÉDICO DA PLATAFORMA ───────────────────
-- Interruptor explícito e revogável. Não deixa desligar o próprio admin
-- (`is_admin` já garante o alcance dele de qualquer forma) nem se auto-excluir.
CREATE OR REPLACE FUNCTION public.admin_marcar_plataforma(
  p_crm text, p_token text, p_crm_alvo text, p_valor boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_alvo text := upper(btrim(coalesce(p_crm_alvo,'')));
  v_n int;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  IF v_alvo = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CRM alvo invalido');
  END IF;

  UPDATE public.medicos SET plataforma = coalesce(p_valor,false)
   WHERE crm = v_alvo;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Medico nao encontrado');
  END IF;
  RETURN jsonb_build_object('ok', true, 'crm', v_alvo, 'plataforma', coalesce(p_valor,false));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_marcar_plataforma(text, text, text, boolean) TO anon, authenticated;

-- Estado atual do papel, por CRM. RPC própria e pequena de propósito: o
-- `admin_listar_medicos` é uma função grande e funcional (comissões, extratos,
-- contagens) — reescrevê-la só para acrescentar uma coluna seria risco à toa.
CREATE OR REPLACE FUNCTION public.admin_listar_plataforma(p_crm text, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'crm', m.crm,
           'plataforma', coalesce(m.plataforma,false),
           'is_admin',   coalesce(m.is_admin,false)
         ) ORDER BY m.crm), '[]'::jsonb)
    INTO v FROM public.medicos m;
  RETURN jsonb_build_object('ok', true, 'medicos', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_listar_plataforma(text, text) TO anon, authenticated;


-- ── 7) Fecha o caminho MAIS BARATO de forjar vínculo ─────────────────────────
-- `paciente_set_encaminhador(cpf, crm)` é SECURITY DEFINER, chamável por anônimo
-- e NÃO VERIFICA TOKEN NENHUM — só exige que o CRM exista (e `register_medico`
-- aceita qualquer texto como CRM). Ela escreve direto em `encaminhamentos_medico`,
-- que é UMA DAS 6 FONTES DE VÍNCULO acima: uma única chamada daria a qualquer
-- pessoa acesso ao prontuário de qualquer CPF, e a leitura seguinte entraria na
-- trilha como `permitido=true` — indistinguível de acesso legítimo.
-- Confirmado que as 3 são CÓDIGO MORTO (zero chamadores em src/ e em
-- site-bariatrico/). REVOKE em vez de DROP: fecha o acesso e é reversível.
-- ⚠ O `FROM PUBLIC` é obrigatório — sem ele o REVOKE falha em silêncio (o
-- privilégio herdado de PUBLIC continua valendo). Armadilha já vivida no projeto.
REVOKE EXECUTE ON FUNCTION public.paciente_set_encaminhador(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.medico_publico(text)                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cpf_recomendado_por(text)             FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
