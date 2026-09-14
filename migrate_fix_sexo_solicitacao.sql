-- ============================================================================
-- migrate_fix_sexo_solicitacao.sql   (13/09/2026)
--
-- PROBLEMA
--   `gerarSolicitacaoCFM` (painel ADM) escrevia, em TODO documento:
--       "Paciente do sexo feminino, portadora de diagnóstico de ..."
--   inclusive para homens. A causa: ele lia `avaliacao.sexo`, e a tabela
--   `avaliacoes` NÃO tem coluna `sexo` — o dado mora em `profiles.sexo`.
--   Como `undefined === 'M'` é sempre falso, o else do ternário sempre vencia.
--   Não era campo vazio, que alguém percebe: era uma afirmação errada escrita
--   com naturalidade no meio de um texto clínico que um médico assina.
--
--   O mesmo `undefined` ia para a fórmula de Ganzoni. Ali o motor falha
--   FECHADO (`HB_ALVO[undefined]` é undefined → devolve null), então nunca
--   saiu dose errada. Mas o cálculo NUNCA rodava a partir do painel, e o
--   documento saía mandando calcular à mão — culpando o peso, que estava lá.
--
-- CORREÇÃO
--   `admin_oba_ficha` passa a devolver também o sexo do paciente. É a porta
--   que já exige médico de plataforma + autorização e grava trilha, então o
--   dado viaja pelo mesmo caminho controlado do resto do prontuário.
--
--   Fonte: `profiles.sexo`, com `oba_anamnese.sexo` como reserva (o bariátrico
--   responde o sexo na anamnese, e há perfil antigo sem o campo preenchido).
--
-- ⚠ Esta função é a MESMA definida em migrate_consentimento_acesso.sql, com o
--   sexo acrescentado. Se as duas divergirem, vale esta — é a mais nova. As
--   duas camadas da régua continuam aqui; não removê-las ao editar.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_oba_ficha(p_crm text, p_token text, p_cpf text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf  text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_oba  jsonb;
  v_av   jsonb;
  v_sexo text;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  IF NOT public.medico_e_plataforma(p_crm) THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Esta area e clinica: so medico da plataforma pode abrir.');
  END IF;

  IF NOT public.pode_ler_paciente(v_cpf, p_crm, p_token, NULL, 'admin_ficha') THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Este paciente nao autorizou o acesso aos dados de saude dele.');
  END IF;

  SELECT to_jsonb(o.*) INTO v_oba
    FROM public.oba_anamnese o
   WHERE regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g') = v_cpf
   ORDER BY o.created_at DESC
   LIMIT 1;

  SELECT COALESCE(jsonb_agg(to_jsonb(a.*) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_av
    FROM public.avaliacoes a
   WHERE regexp_replace(coalesce(a.cpf, ''), '\D', '', 'g') = v_cpf;

  -- Só 'M' ou 'F' passam. Qualquer outra coisa vira NULL, e o gerador de
  -- documento deixa de afirmar o sexo em vez de chutar um.
  SELECT upper(btrim(s)) INTO v_sexo FROM (
    SELECT COALESCE(
             (SELECT p.sexo FROM public.profiles p
               WHERE regexp_replace(coalesce(p.cpf,''), '\D','','g') = v_cpf
               LIMIT 1),
             v_oba->>'sexo'
           ) AS s
  ) t;
  IF v_sexo NOT IN ('M', 'F') THEN
    v_sexo := NULL;
  END IF;

  RETURN jsonb_build_object('ok', true, 'linha', v_oba,
                            'avaliacoes', v_av, 'sexo', v_sexo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_oba_ficha(text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
