-- ============================================================
-- migrate_auto_encaminhamento_4doc.sql  (4DOC — auto-encaminhamento do paciente)
--
-- CONTEXTO
--   Fluxo NOVO: o próprio PACIENTE informa, no cadastro, o CRM/UF do médico que
--   o encaminhou. O frontend grava esse CRM em triagens.medico_crm E
--   avaliacoes.medico_crm da 1ª avaliação do paciente.
--
--   Diferença do fluxo ANTIGO (médico tria → paciente cadastra → consume_triagem
--   captura medico_origem NO CADASTRO): aqui a triagem é criada DEPOIS do cadastro
--   (o register_paciente nem chama o consume_triagem). Então o medico_origem
--   precisa ser derivado mais tarde, no pagamento.
--
-- O QUE ESTA MIGRAÇÃO FAZ
--   1) fn_credita_medico (trigger da assinatura) passa a DERIVAR o medico_origem
--      de triagens ∪ avaliacoes (1º por created_at) quando profiles.medico_origem
--      está NULL. Assim a atribuição funciona independente da ordem. (Preserva a
--      notificação Telegram de comissão — DEC-013.)
--   2) RÉGUA DE ELEGIBILIDADE: o médico só tem direito ao crédito se já fez
--      ≥1 AVALIAÇÃO COMPLETA feita por ELE no sistema. Definição robusta:
--      avaliacoes com medico_crm = CRM, ferritina NOT NULL (aprofundada) e
--      user_id NULL (paciente não logado = foi o MÉDICO que avaliou no Calculator;
--      distingue da avaliação do próprio paciente auto-encaminhado, que tem
--      user_id). O crédito é sempre registrado, mas com elegivel=false até o
--      médico qualificar; quando ele faz a 1ª avaliação completa, os créditos
--      pendentes são liberados RETROATIVAMENTE.
--   3) admin_listar_medicos: as contagens de comissão (n_convertidos /
--      creditos_pendentes "a pagar" / creditos_pagos) passam a considerar só
--      créditos ELEGÍVEIS; adiciona creditos_aguardando (créditos esperando o
--      médico fazer a 1ª avaliação completa). (Preserva comissão USD, cotação,
--      pix_chave e created_at.)
--
--   OBS: o pagamento ao médico continua exigindo a conta de afiliado completa
--   (cep + cpf + pix) — gate que já existe (flag 'afiliado'). A elegibilidade
--   aqui é a régua ADICIONAL do auto-encaminhamento (≥1 avaliação completa).
--
-- Idempotente: CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS / DROP TRIGGER IF EXISTS.
-- Baseada nas versões MAIS RECENTES: fn_credita_medico (migrate_telegram_notif.sql)
-- e admin_listar_medicos (migrate_medicos_created_at.sql).
-- ============================================================

-- 0) Helper: o CRM já fez ≥1 AVALIAÇÃO COMPLETA feita pelo PRÓPRIO médico? -------
CREATE OR REPLACE FUNCTION public.medico_tem_avaliacao_completa(p_crm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.avaliacoes
     WHERE medico_crm = p_crm
       AND ferritina IS NOT NULL   -- avaliação completa (aprofundada)
       AND user_id IS NULL         -- entrada pelo MÉDICO (paciente não logado)
  );
$$;
GRANT EXECUTE ON FUNCTION public.medico_tem_avaliacao_completa(TEXT) TO anon, authenticated;

-- 1) Coluna de elegibilidade no ledger -----------------------------------------
ALTER TABLE public.creditos_medico ADD COLUMN IF NOT EXISTS elegivel BOOLEAN NOT NULL DEFAULT false;

-- 2) fn_credita_medico: deriva medico_origem + elegibilidade (preserva Telegram)-
CREATE OR REPLACE FUNCTION public.fn_credita_medico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  text;
  v_orig text;
  v_rows int;
  v_nome text;
  v_pix  text;
  v_usd  numeric;
  v_cot  numeric;
  v_cpfd text;
  v_msg  text;
  v_elegivel boolean;
BEGIN
  IF NEW.status <> 'ativa' THEN
    RETURN NEW;
  END IF;

  SELECT cpf, medico_origem INTO v_cpf, v_orig
  FROM public.profiles WHERE id = NEW.user_id;

  -- (auto-encaminhamento) Deriva o médico de origem de triagens ∪ avaliacoes se o
  -- perfil ainda não tem (a triagem do auto-encaminhado é criada após o cadastro).
  IF (v_orig IS NULL OR btrim(v_orig) = '') AND v_cpf IS NOT NULL THEN
    SELECT medico_crm INTO v_orig
    FROM (
      SELECT medico_crm, created_at FROM public.triagens
        WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
      UNION ALL
      SELECT medico_crm, created_at FROM public.avaliacoes
        WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    ) s
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_orig IS NOT NULL THEN
      UPDATE public.profiles SET medico_origem = v_orig WHERE id = NEW.user_id;
    END IF;
  END IF;

  IF v_orig IS NULL OR btrim(v_orig) = '' OR v_cpf IS NULL THEN
    RETURN NEW;
  END IF;

  -- Elegibilidade: o médico já fez ≥1 avaliação completa? Senão, crédito pendente.
  v_elegivel := public.medico_tem_avaliacao_completa(v_orig);

  INSERT INTO public.creditos_medico (medico_crm, cpf_paciente, assinatura_id, elegivel)
  VALUES (v_orig, v_cpf, NEW.id, v_elegivel)
  ON CONFLICT (cpf_paciente) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN NEW;  -- já creditado antes: não notifica de novo
  END IF;

  -- Só notifica a ADM (pra pagar) quando o crédito é NOVO e JÁ ELEGÍVEL. Créditos
  -- pendentes de elegibilidade aparecem no painel quando forem liberados.
  IF NOT v_elegivel THEN
    RETURN NEW;
  END IF;

  SELECT nome, pix_chave INTO v_nome, v_pix FROM public.medicos WHERE crm = v_orig;
  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);

  v_cpfd := regexp_replace(coalesce(v_cpf,''), '\D', '', 'g');
  v_cpfd := CASE WHEN length(v_cpfd) = 11
                 THEN '***.' || substr(v_cpfd,4,3) || '.' || substr(v_cpfd,7,3) || '-**'
                 ELSE coalesce(v_cpf,'-') END;

  v_msg := '💰 Nova comissão 4DOC!' || E'\n' ||
           'Médico: ' || COALESCE(NULLIF(v_nome,''), v_orig) || ' (CRM ' || v_orig || ')' || E'\n' ||
           'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
           'Pagar: US$ ' || to_char(v_usd, 'FM999990.00') ||
           CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
           'PIX: ' || COALESCE(NULLIF(v_pix,''), '(médico sem chave PIX cadastrada)');

  PERFORM public.tg_enviar(v_msg);

  RETURN NEW;
END;
$function$;
-- (o trigger trg_credita_medico em assinaturas já existe e aponta p/ esta função)

-- 3) Liberação RETROATIVA: quando o médico faz uma avaliação COMPLETA, libera ----
--    os créditos pendentes dele. Trigger em avaliacoes.
CREATE OR REPLACE FUNCTION public.fn_libera_creditos_pendentes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Só conta como "avaliação completa do médico": ferritina NOT NULL + user_id NULL.
  IF NEW.medico_crm IS NOT NULL AND btrim(NEW.medico_crm) <> ''
     AND NEW.ferritina IS NOT NULL AND NEW.user_id IS NULL THEN
    UPDATE public.creditos_medico
       SET elegivel = true
     WHERE medico_crm = NEW.medico_crm AND elegivel = false;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_libera_creditos ON public.avaliacoes;
CREATE TRIGGER trg_libera_creditos
  AFTER INSERT ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_libera_creditos_pendentes();

-- 4) Backfill: marca a elegibilidade dos créditos já existentes -----------------
UPDATE public.creditos_medico c
   SET elegivel = public.medico_tem_avaliacao_completa(c.medico_crm)
 WHERE elegivel = false;

-- 5) admin_listar_medicos: comissão considera só ELEGÍVEIS + creditos_aguardando -
--    (baseada na versão de migrate_medicos_created_at.sql)
CREATE OR REPLACE FUNCTION public.admin_listar_medicos(p_crm text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  resultado jsonb;
  v_comissao_usd numeric;
  v_cotacao      numeric;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  v_comissao_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  v_cotacao      := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);

  WITH
  screenings AS (
    SELECT cpf, medico_crm FROM public.triagens
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
    UNION ALL
    SELECT cpf, medico_crm FROM public.avaliacoes
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
  ),
  triados AS (
    SELECT medico_crm AS crm, count(DISTINCT cpf) AS n FROM screenings GROUP BY medico_crm
  ),
  conv AS (
    SELECT medico_crm AS crm,
           count(*) FILTER (WHERE elegivel)              AS n,          -- convertidos elegíveis
           count(*) FILTER (WHERE elegivel AND NOT pago) AS pendentes,  -- a pagar
           count(*) FILTER (WHERE elegivel AND pago)     AS pagos,      -- já pagos
           count(*) FILTER (WHERE NOT elegivel)          AS aguardando  -- esperando o médico qualificar
      FROM public.creditos_medico GROUP BY medico_crm
  )
  SELECT jsonb_build_object(
    'ok', true,
    'comissao_usd', v_comissao_usd,
    'cotacao_dolar', v_cotacao,
    'medicos', COALESCE(jsonb_agg(jsonb_build_object(
      'id',                  m.id,
      'nome',                m.nome,
      'crm',                 m.crm,
      'uf',                  m.uf,
      'celular',             m.celular,
      'email',               m.email,
      'cep',                 m.cep,
      'pix_chave',           m.pix_chave,
      'is_admin',            m.is_admin,
      'created_at',          m.created_at,
      'afiliado',            (m.cep IS NOT NULL AND btrim(m.cep) <> ''
                              AND m.cpf IS NOT NULL AND btrim(m.cpf) <> ''
                              AND m.pix_chave IS NOT NULL AND btrim(m.pix_chave) <> ''),
      'n_triados',           COALESCE(t.n, 0),
      'n_convertidos',       COALESCE(cv.n, 0),
      'creditos_pendentes',  COALESCE(cv.pendentes, 0),
      'creditos_pagos',      COALESCE(cv.pagos, 0),
      'creditos_aguardando', COALESCE(cv.aguardando, 0)
    ) ORDER BY COALESCE(cv.pendentes, 0) DESC, COALESCE(cv.n, 0) DESC, m.nome), '[]'::jsonb)
  )
  INTO resultado
  FROM public.medicos m
  LEFT JOIN triados t  ON t.crm  = m.crm
  LEFT JOIN conv    cv ON cv.crm = m.crm;

  RETURN resultado;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_listar_medicos(text, text) TO anon, authenticated;

-- Recarrega o cache de schema do PostgREST (DDL nova).
NOTIFY pgrst, 'reload schema';
