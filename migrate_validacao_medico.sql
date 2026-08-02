-- ============================================================================
-- migrate_validacao_medico.sql
--
-- PROBLEMA (auditoria de segurança, ago/2026): `register_medico` aceita
-- QUALQUER texto como CRM — a única validação é "não pode ser vazio" — e já
-- devolve token de 30 dias. Qualquer pessoa vira "médico" em 30 segundos.
-- A auditoria financeira somou: esse médico auto-cadastrado gera US$15 por CPF
-- de 11 dígitos (`medico_avaliar_paciente` não confere se o paciente existe).
--
-- DESENHO ESCOLHIDO PELO DR. RAMOS — validação DEPOIS, sem atrito no funil:
-- o médico se cadastra, trabalha (avalia, indica) e manda a foto da carteira
-- profissional PELO WHATSAPP; o admin valida (ou invalida) manualmente aqui.
--
-- Por que a foto NÃO sobe para o sistema: armazenar documento de identidade
-- criaria dever de guarda próprio (bucket privado, retenção, direito de
-- exclusão — LGPD). Pelo WhatsApp, a foto fica no aparelho da plataforma e o
-- banco guarda só a DECISÃO (quem validou, quando). Mais leve e igualmente
-- eficaz para o que interessa.
--
-- Isto é SEGURO por construção porque já existe a régua do vínculo
-- (migrate_vinculo_medico_paciente.sql): quem se cadastra sozinho nasce
-- EXTERNO e só alcança os pacientes que ele mesmo trouxe. Trabalhar sem
-- validação não expõe prontuário de terceiro. A validação não é porteiro —
-- é o que concede confiança extra (e destrava o dinheiro).
--
-- ESTADOS (`medicos.validado`):
--   NULL  = PENDENTE   → trabalha normalmente; crédito acumula mas NÃO é pago
--   TRUE  = VALIDADO   → crédito liberado para pagamento
--   FALSE = INVALIDADO → login bloqueado e crédito retido
--
-- Idempotente. PASSO: rodar no Supabase → SQL Editor.
-- ⚠ Rodar DEPOIS de migrate_vinculo_medico_paciente.sql.
-- ============================================================================

-- ── 1) Estado da validação ───────────────────────────────────────────────────
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS validado        boolean;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS validado_em     timestamptz;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS validado_por    text;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS validacao_nota  text;

-- Médicos que JÁ existem entram validados (decisão do Dr. Ramos: "aprovar os
-- atuais e exigir dos novos"). Sem isto, ele bloquearia o próprio acesso.
UPDATE public.medicos
   SET validado = true, validado_em = now(), validado_por = 'migracao'
 WHERE validado IS NULL;


-- ── 2) Login bloqueado para INVALIDADO ───────────────────────────────────────
-- Só `validado = FALSE` bloqueia. PENDENTE (NULL) entra normalmente — é o
-- ponto do desenho: não travar o funil de quem acabou de se cadastrar.
CREATE OR REPLACE FUNCTION public.login_medico(p_crm text, p_senha text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH
  v AS MATERIALIZED (
    SELECT upper(btrim(coalesce($1,''))) AS crm, $2 AS senha,
           encode(gen_random_bytes(32),'hex') AS tok
  ),
  m AS (
    SELECT med.id, med.nome, med.crm, med.is_admin, med.senha_klipbit, med.validado
    FROM public.medicos med, v WHERE med.crm = v.crm LIMIT 1
  ),
  res AS (
    SELECT m.id, m.nome, m.crm, m.is_admin, v.tok,
      CASE
        WHEN m.id IS NULL                                        THEN 'CRM nao encontrado'
        WHEN m.senha_klipbit IS NULL                            THEN 'Conta sem senha'
        WHEN m.senha_klipbit <> crypt(v.senha, m.senha_klipbit) THEN 'Senha incorreta'
        WHEN m.validado IS FALSE                                THEN 'Cadastro nao validado. Fale com a administracao.'
        ELSE NULL
      END AS erro
    FROM v LEFT JOIN m ON true
  ),
  gravado AS (
    UPDATE public.medicos SET
      session_token_hash = encode(digest((SELECT tok FROM res),'sha256'),'hex'),
      session_token_exp  = now() + interval '30 days'
    WHERE id = (SELECT id FROM res WHERE erro IS NULL)
    RETURNING id
  )
  SELECT jsonb_build_object(
    'ok',       (SELECT erro IS NULL FROM res),
    'id',       (SELECT CASE WHEN erro IS NULL THEN id END FROM res),
    'nome',     (SELECT CASE WHEN erro IS NULL THEN nome END FROM res),
    'crm',      (SELECT CASE WHEN erro IS NULL THEN crm END FROM res),
    'is_admin', (SELECT CASE WHEN erro IS NULL THEN is_admin END FROM res),
    'token',    (SELECT CASE WHEN erro IS NULL THEN tok END FROM res),
    'erro',     (SELECT erro FROM res)
  )
$function$;


-- ── 3) Tesouraria não paga médico não validado ───────────────────────────────
-- Bloqueia a AÇÃO inteira com mensagem clara, em vez de filtrar linhas em
-- silêncio: o tesoureiro precisa saber POR QUE não pagou.
CREATE OR REPLACE FUNCTION public.caixa_pagar_medico(p_token text, p_crm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_usd_enc numeric; v_usd_av numeric; v_cot numeric; v_n1 int; v_n2 int; v_val boolean;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;

  SELECT validado INTO v_val FROM public.medicos WHERE crm = upper(btrim(coalesce(p_crm,'')));
  IF v_val IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Medico ainda nao validado. Peca a foto da carteira profissional pelo WhatsApp e valide em Admin > Medicos antes de pagar.');
  END IF;

  v_usd_enc := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_por_conversao'), 10);
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='comissao_usd_nao_afiliado'), 15);
  v_cot     := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  IF v_cot <= 0 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Cotacao do dolar nao configurada (Admin > Configuracoes)'); END IF;

  UPDATE public.creditos_medico
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_enc, cotacao=v_cot, valor_brl=round(v_usd_enc*v_cot,2)
   WHERE medico_crm=p_crm AND elegivel AND NOT pago;
  GET DIAGNOSTICS v_n1 = ROW_COUNT;

  UPDATE public.creditos_avaliacao
     SET pago=true, data_pagamento=now(), valor_usd=v_usd_av, cotacao=v_cot, valor_brl=round(v_usd_av*v_cot,2)
   WHERE medico_crm=p_crm AND elegivel AND NOT pago;
  GET DIAGNOSTICS v_n2 = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'n_enc', v_n1, 'n_av', v_n2,
    'total_brl', round((v_n1*v_usd_enc + v_n2*v_usd_av)*v_cot, 2), 'cotacao', v_cot);
END; $function$;


-- ── 4) Admin valida / invalida ───────────────────────────────────────────────
-- p_valor: true = VALIDADO | false = INVALIDADO | null = volta a PENDENTE.
CREATE OR REPLACE FUNCTION public.admin_validar_medico(
  p_crm text, p_token text, p_crm_alvo text, p_valor boolean, p_nota text DEFAULT NULL
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
  -- Não deixa o admin invalidar a si mesmo e se trancar para fora.
  IF v_alvo = upper(btrim(coalesce(p_crm,''))) AND p_valor IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao e possivel invalidar o proprio cadastro');
  END IF;

  UPDATE public.medicos
     SET validado = p_valor,
         validado_em = now(),
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

GRANT EXECUTE ON FUNCTION public.admin_validar_medico(text, text, text, boolean, text) TO anon, authenticated;


-- ── 5) Estado (plataforma + validação) numa chamada só ───────────────────────
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
           'is_admin',   coalesce(m.is_admin,false),
           'validado',   m.validado,          -- null = pendente
           'validado_em', m.validado_em
         ) ORDER BY m.crm), '[]'::jsonb)
    INTO v FROM public.medicos m;
  RETURN jsonb_build_object('ok', true, 'medicos', v);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_listar_plataforma(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
