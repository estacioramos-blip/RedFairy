-- ============================================================================
-- migrate_seguranca_dia3_ago2026.sql
-- Auditoria final — Dia 3. Fecha SEC-4 e SEC-5 (gates que faltaram do cluster),
-- decisão do Estácio "gatear os dois".
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR, **DEPOIS** do deploy do frontend que
-- envia p_pac_token (senão o frontend velho chama sem token e o gate rejeita:
-- SEC-4 quebraria a atribuição de comissão; SEC-5 zeraria o desconto na tela).
--
-- Ambos passam a exigir a sessão de PACIENTE dona do CPF (token_paciente_ok):
--   SEC-4 confirmar_indicacao — sem gate, um atacante confirmava a indicação do
--         CPF de uma vítima e desviava a comissão pra si.
--   SEC-5 saldo_indicador — sem gate, vazava o saldo financeiro por CPF.
-- Named args no frontend → posição do novo p_pac_token (último, DEFAULT NULL) é
-- indiferente. GRANT reafirmado (padrão do repo após DROP+CREATE).
-- ============================================================================

BEGIN;

-- ── SEC-4 — confirmar_indicacao ────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.confirmar_indicacao(text, text);
CREATE FUNCTION public.confirmar_indicacao(p_cpf text, p_codigo text, p_pac_token text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := translate(coalesce(p_cpf,''), '.- /()', '');
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok', false); END IF;
  -- GATE: só o paciente DONO do CPF confirma quem o indicou (senão um terceiro
  -- desvia a comissão pra si com o CPF da vítima).
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  UPDATE public.indicacoes_precadastro
     SET confirmado = true
   WHERE cpf_paciente = v_cpf AND indicador_codigo = p_codigo
     AND created_at > now() - interval '3 months';
  RETURN jsonb_build_object('ok', true);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.confirmar_indicacao(text, text, text) TO anon, authenticated;

-- ── SEC-5 — saldo_indicador ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.saldo_indicador(text);
CREATE FUNCTION public.saldo_indicador(p_cpf text, p_pac_token text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := translate(coalesce(p_cpf,''),'.- /()','');
  v_cod text; v_c jsonb;
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok',false); END IF;
  -- GATE: só o dono do CPF vê o próprio saldo financeiro.
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  SELECT codigo INTO v_cod FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_cod IS NULL THEN RETURN jsonb_build_object('ok',true,'qtd',0,'saldo_brl',0); END IF;

  v_c := public.indicador_conta(v_cod);
  RETURN jsonb_build_object(
    'ok', true,
    'qtd',            (v_c->>'vivos')::int,
    'valor_unit_brl', (v_c->>'unit_brl')::numeric,
    'abatido_brl',    (v_c->>'ledger_brl')::numeric,
    'saldo_brl',      (v_c->>'saldo_brl')::numeric,
    'qtd_pendente',   (v_c->>'pendentes')::int,
    'pendente_brl',   (v_c->>'pendente_brl')::numeric
  );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.saldo_indicador(text, text) TO anon, authenticated;

COMMIT;

-- ── Verificação ─────────────────────────────────────────────────────────────
-- SELECT proname, pg_get_function_identity_arguments(oid)
--   FROM pg_proc WHERE proname IN ('confirmar_indicacao','saldo_indicador');
-- SELECT public.saldo_indicador('00000000000','tok-falso');  -- esperado: {"ok":false,...}
