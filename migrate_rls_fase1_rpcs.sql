-- ============================================================
-- migrate_rls_fase1_rpcs.sql  (DEC-008 — RLS Fase 1, parte 1: RPCs admin)
--
-- Escrita só-admin em `medicamentos` e `config`, validada pelo crachá
-- (token_admin_ok). RODAR AGORA — é aditivo e não-destrutivo. O RLS dessas
-- tabelas é ligado DEPOIS (migrate_rls_fase1_enable.sql), após o app passar
-- a salvar por estas RPCs.
--
-- SECURITY DEFINER: a função roda como owner (postgres) e fura o RLS de forma
-- controlada — por isso a escrita continua funcionando com o RLS ligado.
-- ============================================================

-- Atualiza um medicamento do catálogo (só admin). p_dados = jsonb com os campos.
CREATE OR REPLACE FUNCTION public.salvar_medicamento(
  p_crm text, p_token text, p_id bigint, p_dados jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  UPDATE public.medicamentos SET
    fabricante         = p_dados->>'fabricante',
    concentracao_mg_ml = NULLIF(p_dados->>'concentracao_mg_ml','')::numeric,
    frascos_mg         = p_dados->>'frascos_mg',
    dose_max_sessao_mg = NULLIF(p_dados->>'dose_max_sessao_mg','')::integer,
    diluicao           = p_dados->>'diluicao',
    tempo_infusao      = p_dados->>'tempo_infusao',
    intervalo_sessoes  = p_dados->>'intervalo_sessoes',
    cota_total         = NULLIF(p_dados->>'cota_total','')::integer,
    observacoes        = p_dados->>'observacoes',
    ativo              = COALESCE((p_dados->>'ativo')::boolean, false)
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- Upsert de uma chave de config (só admin) — preços e chave Pix.
CREATE OR REPLACE FUNCTION public.salvar_config(
  p_crm text, p_token text, p_chave text, p_valor text, p_descricao text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  INSERT INTO public.config (chave, valor, descricao)
  VALUES (p_chave, p_valor, p_descricao)
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.salvar_medicamento(text,text,bigint,jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_config(text,text,text,text,text)     TO anon, authenticated;
