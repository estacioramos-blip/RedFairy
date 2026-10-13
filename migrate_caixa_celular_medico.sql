-- ============================================================
-- migrate_caixa_celular_medico.sql
--
-- Caixa → A PAGAR passa a devolver o CELULAR do médico.
--
-- Por quê (10/2026): CEP, CPF e chave PIX saíram do cadastro do médico e só
-- são pedidos quando nasce o primeiro crédito. Quem deixar crédito parado sem
-- chave aparece no Caixa com "(sem chave cadastrada)" e o MARCAR PAGO travado —
-- e a linha só tinha nome, CRM e PIX: para cobrar a chave, a tesouraria
-- dependia do administrador. Com o celular, manda um WhatsApp sozinha.
--
-- Base: a definição VIVA no banco (pós-reforma CFM, lê `valor_usd_avaliacao`),
-- não a de migrate_saldo_indicador_unico.sql, que está desatualizada.
-- Única mudança: 'celular' no objeto de cada médico.
-- ============================================================

CREATE OR REPLACE FUNCTION public.caixa_a_pagar(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_usd_av numeric; v_cot numeric;
  v_med jsonb; v_pac jsonb; v_anuidade numeric;
BEGIN
  IF NOT public.caixa_token_ok(p_token) THEN RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida'); END IF;
  v_usd_av  := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_usd_avaliacao'), 15);
  v_cot     := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='cotacao_dolar'), 0);
  v_anuidade:= COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave='valor_anuidade'), 200);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'crm', s.crm, 'nome', m.nome, 'pix', m.pix_chave, 'celular', m.celular,
      'n_enc', 0, 'n_av', s.n_av,
      'total_usd', s.n_av * v_usd_av
    ) ORDER BY s.crm), '[]'::jsonb) INTO v_med
  FROM (
    SELECT medico_crm AS crm, count(*) AS n_av FROM public.creditos_avaliacao
      WHERE elegivel AND NOT pago GROUP BY medico_crm
  ) s LEFT JOIN public.medicos m ON m.crm = s.crm;

  -- ENCONTRO DE CONTAS (paciente-indicador). Continua, mas agora só para ABATER:
  -- não há mais "excedente a pagar".
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'codigo', i.codigo, 'cpf', i.cpf, 'nome', i.nome,
      'n_creditos',   (k.c->>'vivos')::int,
      'creditos_brl', round(((k.c->>'vivos')::numeric) * ((k.c->>'unit_brl')::numeric), 2),
      'abatido_brl',  (k.c->>'ledger_brl')::numeric,
      'pendente_brl', (k.c->>'pendente_brl')::numeric,
      'saldo_brl',    (k.c->>'saldo_brl')::numeric
    ) ORDER BY i.nome), '[]'::jsonb) INTO v_pac
  FROM public.indicadores i
  CROSS JOIN LATERAL (SELECT public.indicador_conta(i.codigo) AS c) k
  WHERE COALESCE(i.tipo,'') = 'paciente'
    AND ( (k.c->>'vivos')::int > 0 OR (k.c->>'ledger_brl')::numeric > 0 OR (k.c->>'pendente_brl')::numeric > 0 );

  -- `indicadores` continua no retorno, sempre vazio: indicador não recebe.
  RETURN jsonb_build_object('ok', true, 'medicos', v_med, 'indicadores', '[]'::jsonb, 'pacientes', v_pac,
                            'usd_enc', 0, 'usd_av', v_usd_av, 'cotacao', v_cot, 'valor_anuidade', v_anuidade);
END;
$function$;

-- Conferência: deve aparecer "celular" na definição.
-- SELECT pg_get_functiondef('public.caixa_a_pagar(text)'::regprocedure) ILIKE '%''celular''%';
