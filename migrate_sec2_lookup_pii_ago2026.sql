-- ============================================================================
-- migrate_sec2_lookup_pii_ago2026.sql
-- Auditoria final — SEC-2: reduz o PII que os helpers de prefill por CPF (rodam
-- ANTES do login, sem token — não dá pra gatear) devolvem a qualquer anônimo.
-- Decisão do Estácio: "reduzir ao mínimo (sexo/idade); tirar nome + flag
-- bariátrica/gestante".
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR, **DEPOIS** do deploy do frontend.
-- ⚠ ORDERING (correção clínica): tirar a flag `bariatrica` do lookup + o frontend
-- ANTIGO (TriagemModal l.150 sem a guarda `flagBariatricaOBA ||`) faz o médico no
-- domínio bariátrico avaliar um CPF sem-perfil-com-triagem pela matriz NÃO-bariátrica
-- (UI marcada, dado errado). O deploy do frontend corrigido tem que vir ANTES. Só a
-- redução de NOME (lookup_cpf_triagem) é retrocompatível; a das FLAGS não é.
--
-- Callers auditados:
--   lookup_cpf_triagem  → OBAEntradaPaciente/LandingPage/TriagemResultadoModal só
--     leem `origem==='profile'` (existe?). Ninguém lê nome/sexo/nascimento → a
--     função passa a devolver SÓ a existência do perfil (some o vazamento de NOME).
--   lookup_triagens_cpf → 2 callers usam só `count`; só o TriagemModal usa `ultima`
--     (prefill do funil anônimo). Mantém sexo/nascimento (mínimo p/ prefill); tira
--     bariatrica/gestante/semanas_gestacao (o dado de saúde por CPF).
-- ============================================================================

BEGIN;

-- ── lookup_cpf_triagem: só existência do perfil (era nome/sexo/nascimento) ──
-- Muda o RETURN TABLE → DROP + CREATE. A branch 'triagem' (que ninguém lia) sai:
-- os callers checam apenas origem='profile'; contagem de triagem é do lookup abaixo.
DROP FUNCTION IF EXISTS public.lookup_cpf_triagem(text);
CREATE FUNCTION public.lookup_cpf_triagem(cpf_input text)
 RETURNS TABLE(origem text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE cpf_limpo text := regexp_replace(coalesce(cpf_input,''), '\D', '', 'g');
BEGIN
  IF length(cpf_limpo) <> 11 THEN RETURN; END IF;
  -- Devolve UMA linha 'profile' se existir perfil; nada além disso (sem PII).
  RETURN QUERY SELECT 'profile'::text FROM public.profiles p WHERE p.cpf = cpf_limpo LIMIT 1;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.lookup_cpf_triagem(text) TO anon, authenticated;

-- ── lookup_triagens_cpf: mantém count + ultima{sexo,nascimento}; tira as flags ──
-- Return type (jsonb) não muda → CREATE OR REPLACE. Só o objeto `ultima` encolhe.
CREATE OR REPLACE FUNCTION public.lookup_triagens_cpf(p_cpf text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_count int;
  v_ultima jsonb;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;

  SELECT count(*) INTO v_count
    FROM public.triagens t
   WHERE regexp_replace(coalesce(t.cpf, ''), '\D', '', 'g') = v_cpf;

  -- SEC-2: só sexo + data_nascimento (o mínimo p/ o prefill do funil anônimo).
  -- REMOVIDOS: bariatrica, gestante, semanas_gestacao — dado de saúde que
  -- confirmava cirurgia/gravidez por CPF a qualquer anônimo.
  SELECT jsonb_build_object(
           'sexo', t.sexo, 'data_nascimento', t.data_nascimento,
           'created_at', t.created_at
         )
    INTO v_ultima
    FROM public.triagens t
   WHERE regexp_replace(coalesce(t.cpf, ''), '\D', '', 'g') = v_cpf
   ORDER BY t.created_at DESC
   LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'count', v_count, 'ultima', v_ultima);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.lookup_triagens_cpf(text) TO anon, authenticated;

COMMIT;

-- ── Verificação (com um CPF que tenha triagem, se houver) ───────────────────
-- SELECT public.lookup_triagens_cpf('SEUCPF');  -- ultima NÃO deve ter bariatrica/gestante
-- SELECT * FROM public.lookup_cpf_triagem('SEUCPF');  -- só a coluna origem
