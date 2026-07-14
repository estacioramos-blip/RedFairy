-- migrate_caixa_bloquear_assinatura.sql
-- ---------------------------------------------------------------------------
-- Bloqueio manual de assinatura (Tesouraria/Caixa).
-- Modelo: o paciente vira ASSINANTE "na confianca" ao clicar JA PAGUEI
-- (PagamentoCadastroModal grava assinatura 'ativa' com valor_pago). O tesoureiro
-- concilia os PIX recebidos e, quando constata que alguem NAO pagou, BLOQUEIA:
-- status -> 'bloqueada'. Como o paywall (PatientDashboard) e o alerta de anuidade
-- (AdminPage) so contam status='ativa', o paciente bloqueado cai de volta no paywall.
-- REATIVAR volta para 'ativa' (correcao de engano).
-- ---------------------------------------------------------------------------

-- 1) LISTA de assinaturas p/ conciliacao (nome/cpf/valor/status/datas) --------
CREATE OR REPLACE FUNCTION public.caixa_assinaturas(p_token text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v_list jsonb;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id',         a.id,
      'nome',       p.nome,
      'cpf',        p.cpf,
      'status',     a.status,
      'valor_pago', a.valor_pago,
      'data_inicio', COALESCE(a.data_inicio, a.created_at),
      'data_fim',   a.data_fim
    ) ORDER BY (a.status = 'ativa') DESC, COALESCE(a.data_inicio, a.created_at) DESC), '[]'::jsonb)
    INTO v_list
    FROM public.assinaturas a
    LEFT JOIN public.profiles p ON p.id = a.user_id;
  RETURN jsonb_build_object('ok', true, 'assinaturas', v_list);
END; $$;

-- 2) BLOQUEAR / REATIVAR uma assinatura --------------------------------------
CREATE OR REPLACE FUNCTION public.caixa_bloquear_assinatura(p_token text, p_id uuid, p_bloquear boolean)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE v_novo text; v_afetadas int;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  v_novo := CASE WHEN p_bloquear THEN 'bloqueada' ELSE 'ativa' END;
  UPDATE public.assinaturas
     SET status = v_novo, updated_at = now()
   WHERE id = p_id;
  GET DIAGNOSTICS v_afetadas = ROW_COUNT;
  IF v_afetadas = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Assinatura nao encontrada');
  END IF;
  RETURN jsonb_build_object('ok', true, 'status', v_novo);
END; $$;

GRANT EXECUTE ON FUNCTION public.caixa_assinaturas(text)                         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caixa_bloquear_assinatura(text, uuid, boolean)  TO anon, authenticated;
