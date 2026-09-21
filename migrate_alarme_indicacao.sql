-- ============================================================================
-- migrate_alarme_indicacao.sql — avisa quando um crédito de indicação NÃO nasce
-- ============================================================================
--
-- POR QUE
-- O crédito do paciente que indica (R3) só nasce se a indicação estiver
-- CONFIRMADA: `confirmar_indicacao` é chamada na tela que o indicado vê antes
-- de pagar (EscolhaIndicacaoModal). Se essa chamada falha — token vencido,
-- internet caindo no meio, o paciente fechando o aplicativo —, ela **falha em
-- silêncio**: o código só registra no console do navegador, que ninguém lê.
-- O indicado assina, o crédito não nasce, e quem indicou nunca fica sabendo.
-- Isso é dinheiro do paciente sumindo sem deixar rastro.
--
-- O QUE FAZ
-- No momento em que o indicado assina, se existir uma indicação VÁLIDA e NÃO
-- confirmada (reserva dentro dos 3 meses) e nenhuma confirmada, a ADM recebe
-- um Telegram. **Não decide nada sozinho**: não cria crédito, não confirma
-- indicação. Só avisa, para alguém conferir e resolver com o Estácio.
--
-- Por que no BANCO e não na tela: aqui o aviso dispara mesmo se o paciente
-- fechou o aplicativo ou perdeu a conexão logo depois de pagar — que é
-- justamente quando a confirmação falha.
--
-- Idempotente.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_credita_indicacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text; v_ind text; v_tipo text; v_rows int;
  v_nome text; v_brl numeric; v_cpfd text; v_msg text;
  v_pend text; v_pend_nome text; v_pend_tipo text;
BEGIN
  IF NEW.status <> 'ativa' THEN RETURN NEW; END IF;
  SELECT cpf INTO v_cpf FROM public.profiles WHERE id = NEW.user_id;
  IF v_cpf IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM public.creditos_indicador WHERE cpf_paciente = v_cpf) THEN
    RETURN NEW;
  END IF;

  v_cpfd := regexp_replace(coalesce(v_cpf,''), '\D', '', 'g');
  v_cpfd := CASE WHEN length(v_cpfd) = 11
                 THEN '***.' || substr(v_cpfd,4,3) || '.' || substr(v_cpfd,7,3) || '-**'
                 ELSE coalesce(v_cpf,'-') END;

  SELECT indicador_codigo INTO v_ind FROM public.indicacoes_precadastro
    WHERE cpf_paciente = v_cpf AND confirmado = true
    ORDER BY created_at DESC LIMIT 1;

  -- ── ALARME: indicação válida que ficou sem confirmação ────────────────────
  -- A tela que confirma engole o próprio erro (decisão registrada: falhar ali
  -- não pode travar o pagamento). O preço disso é este alarme: sem ele,
  -- ninguém descobre que o crédito não nasceu.
  IF v_ind IS NULL OR btrim(v_ind) = '' THEN
    SELECT p.indicador_codigo, i.nome, i.tipo INTO v_pend, v_pend_nome, v_pend_tipo
      FROM public.indicacoes_precadastro p
      JOIN public.indicadores i ON i.codigo = p.indicador_codigo AND i.ativo
     WHERE p.cpf_paciente = v_cpf
       AND COALESCE(p.confirmado, false) = false
       AND p.created_at > now() - interval '3 months'
     ORDER BY p.created_at DESC LIMIT 1;

    IF v_pend IS NOT NULL THEN
      BEGIN
        PERFORM public.tg_enviar(
          '⚠ Indicação NÃO confirmada — crédito não gerado' || E'\n' ||
          'Indicador: ' || COALESCE(NULLIF(v_pend_nome,''), v_pend) || ' (' || v_pend || ')' || E'\n' ||
          'Paciente ' || v_cpfd || ' assinou, mas a indicação ficou sem confirmação.' || E'\n' ||
          CASE WHEN COALESCE(v_pend_tipo,'') = 'paciente'
               THEN 'Ele é PACIENTE-INDICADOR: perdeu o crédito desta indicação. Conferir com o Estácio.'
               ELSE 'Indicador leigo: não gera crédito (R4). Aviso só para registro da origem.' END);
      EXCEPTION WHEN OTHERS THEN NULL;   -- o aviso nunca derruba a assinatura
      END;
    END IF;
    RETURN NEW;
  END IF;

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
  -- Protegido como o alarme: este PERFORM sai para a internet (net.http_post).
  -- Sem a proteção, uma falha do Telegram aborta a transação — e derruba a
  -- ASSINATURA do paciente por causa de um aviso. Risco antigo, fechado aqui.
  BEGIN
    PERFORM public.tg_enviar(v_msg);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$function$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Conferência (rodar depois; esperado: true, true) ────────────────────────
-- SELECT prosrc ~ 'NÃO confirmada'  AS tem_alarme,
--        prosrc ~ 'creditos_indicador' AS mantem_credito
--   FROM pg_proc WHERE proname = 'fn_credita_indicacao';
