-- ============================================================================
-- migrate_cluster_seguranca_ago2026.sql
-- Auditoria final pré-lançamento (15/08/2026). Fecha o BLOCKER de desvio de
-- comissão do cluster "RPC SECURITY DEFINER aberta ao anon sem validar token".
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR (a conexão MCP é read-only e recusa DDL).
--
-- ESCOPO: BLK-2 (paciente_salvar_pix) + SEC-3 (paciente_virar_indicador).
-- FORA daqui de propósito, após a revisão de código:
--   • SEC-1 (REVOKE tg_enviar) — REMOVIDO: tg_enviar é chamado DIRETO do navegador
--     pelo botão de EMERGÊNCIA (PatientDashboard) e por 2 avisos do OBAModal.
--     Revogar quebraria a emergência do paciente em silêncio. Conserto correto =
--     RPCs-wrapper gateadas (tarefa própria), não um REVOKE cego.
--   • SEC-2 (lookup_* PII) / SEC-4 (confirmar_indicacao) / SEC-5 (saldo_indicador)
--     — dependem de decisão de produto / threading de token. Ver o relatório.
--
-- GATE DE DUPLO TOKEN: PacienteIndicaModal é usado por DOIS perfis — o PACIENTE
-- (paciente_token, linha em profiles) E o INDICADOR PURO (indicador_token, linha
-- em indicadores). O gate aceita os dois, como listar_creditos_indicador já faz.
-- ============================================================================

BEGIN;

-- ── BLK-2 — paciente_salvar_pix: gravava a chave PIX de QUALQUER indicador sem token ──
DROP FUNCTION IF EXISTS public.paciente_salvar_pix(text, text, text, text, text, text, boolean, text);
CREATE FUNCTION public.paciente_salvar_pix(
  p_cpf text, p_nome text, p_pix text, p_celular text DEFAULT NULL,
  p_email text DEFAULT NULL, p_titular text DEFAULT NULL,
  p_pj boolean DEFAULT false, p_cnpj text DEFAULT NULL, p_token text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_cpf text := translate(coalesce(p_cpf,''), '.- /()', '');
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido'); END IF;
  -- GATE: dono do CPF por sessão de PACIENTE (profiles) OU de INDICADOR (indicadores).
  IF NOT (
       public.token_paciente_ok(v_cpf, p_token)
    OR EXISTS (SELECT 1 FROM public.indicadores
                WHERE cpf = v_cpf
                  AND coalesce(p_token,'') <> ''
                  AND session_token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex')
                  AND session_token_exp > now())
  ) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida. Entre de novo.');
  END IF;
  IF coalesce(btrim(p_pix), '') = '' THEN RETURN jsonb_build_object('ok', false, 'erro', 'Informe a chave PIX'); END IF;
  UPDATE public.indicadores
     SET pix_chave      = btrim(p_pix),
         nome           = COALESCE(NULLIF(btrim(p_nome), ''), nome),
         celular        = COALESCE(NULLIF(translate(coalesce(p_celular,''), '.- /()', ''), ''), celular),
         email          = COALESCE(NULLIF(lower(btrim(coalesce(p_email,''))), ''), email),
         pix_titular    = NULLIF(btrim(coalesce(p_titular, '')), ''),
         pix_titular_pj = coalesce(p_pj, false),
         pix_cnpj       = NULLIF(regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g'), '')
   WHERE cpf = v_cpf;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'erro', 'Indicador nao encontrado'); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.paciente_salvar_pix(text, text, text, text, text, text, boolean, text, text) TO anon, authenticated;

-- ── SEC-3 — paciente_virar_indicador: devolvia nome+PIX e criava indicador sem token ──
DROP FUNCTION IF EXISTS public.paciente_virar_indicador(text);
CREATE FUNCTION public.paciente_virar_indicador(p_cpf text, p_token text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf    text := translate(coalesce(p_cpf,''), '.- /()', '');
  v_codigo text;
  v_nome   text;
  v_pix    text;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF inválido');
  END IF;
  -- GATE de duplo token. Paciente virando indicador 1ª vez → só a via de paciente
  -- vale (ainda não há linha em indicadores). Indicador puro já reentrando → a via
  -- de indicador (a linha existe com o token dele).
  IF NOT (
       public.token_paciente_ok(v_cpf, p_token)
    OR EXISTS (SELECT 1 FROM public.indicadores
                WHERE cpf = v_cpf
                  AND coalesce(p_token,'') <> ''
                  AND session_token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex')
                  AND session_token_exp > now())
  ) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida. Entre de novo.');
  END IF;

  -- Idempotente: já é indicador? devolve código + nome + pix.
  SELECT codigo, nome, pix_chave INTO v_codigo, v_nome, v_pix
    FROM public.indicadores WHERE cpf = v_cpf LIMIT 1;
  IF v_codigo IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'codigo', v_codigo, 'ja_era', true,
                              'nome', COALESCE(v_nome,''), 'pix', COALESCE(v_pix,''));
  END IF;

  SELECT nome INTO v_nome FROM public.profiles
    WHERE regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf
    LIMIT 1;

  LOOP
    v_codigo := 'IND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_codigo);
  END LOOP;

  INSERT INTO public.indicadores (codigo, cpf, nome, tipo, ativo)
  VALUES (v_codigo, v_cpf, COALESCE(NULLIF(v_nome,''), 'Paciente'), 'paciente', true);

  RETURN jsonb_build_object('ok', true, 'codigo', v_codigo, 'ja_era', false,
                            'nome', COALESCE(v_nome,''), 'pix', '');
END;
$function$;
GRANT EXECUTE ON FUNCTION public.paciente_virar_indicador(text, text) TO anon, authenticated;

COMMIT;

-- ── Verificação pós-migração (rode e confira) ──────────────────────────────
-- SELECT proname, pg_get_function_identity_arguments(oid)
--   FROM pg_proc WHERE proname IN ('paciente_salvar_pix','paciente_virar_indicador');
-- Esperado: ambas com o parâmetro final p_token.
