-- ============================================================
-- migrate_extrato_medico.sql  (DEC-011 — Extrato por médico, painel financeiro)
--
-- RPC só-admin que devolve o EXTRATO de um médico: a lista de conversões
-- (pacientes que ele originou e que pagaram) com data, status pago/pendente e
-- data do pagamento. Alimenta o modal de extrato na aba Médicos.
--
-- A data da conversão usa a created_at da assinatura (quando o paciente pagou);
-- cai pra created_at do crédito se a assinatura não estiver vinculada.
--
-- Idempotente: CREATE OR REPLACE. Termina com NOTIFY pgrst.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_extrato_medico(
  p_crm text, p_token text, p_medico_crm text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  resultado jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'conversoes', COALESCE(jsonb_agg(jsonb_build_object(
      'cpf',            c.cpf_paciente,
      'nome',           p.nome,
      'data_conversao', COALESCE(a.created_at, c.created_at),
      'pago',           c.pago,
      'data_pagamento', c.data_pagamento
    ) ORDER BY COALESCE(a.created_at, c.created_at) DESC), '[]'::jsonb)
  )
  INTO resultado
  FROM public.creditos_medico c
  LEFT JOIN public.assinaturas a ON a.id   = c.assinatura_id
  LEFT JOIN public.profiles    p ON p.cpf  = c.cpf_paciente
  WHERE c.medico_crm = p_medico_crm;

  RETURN resultado;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_extrato_medico(text, text, text) TO anon, authenticated;

-- Recarrega o cache de schema do PostgREST (função nova).
NOTIFY pgrst, 'reload schema';
