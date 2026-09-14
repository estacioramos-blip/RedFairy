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

-- ---------------------------------------------------------------------------
-- admin_avaliacoes_recentes — tira o SELECT * da subconsulta interna
-- ---------------------------------------------------------------------------
-- A saída já era explícita (7 campos), então nada a mais saía do banco. Mas a
-- subconsulta interna ainda materializava as 47 colunas, e quem varrer o banco
-- procurando "SELECT *" encontra isto e tem de parar para entender que é
-- inofensivo. Custa nada nomear as colunas e acaba a ambiguidade.
--
-- ⚠ Assinatura IDÊNTICA, com o DEFAULT 200 (42P13 — não remover).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_avaliacoes_recentes(
  p_crm text, p_token text, p_limite int DEFAULT 200
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  IF NOT public.medico_e_plataforma(p_crm) THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Esta area e clinica: so medico da plataforma pode abrir.');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id',                a.id,
           'cpf',               a.cpf,
           'created_at',        a.created_at,
           'data_coleta',       a.data_coleta,
           'diagnostico_label', a.diagnostico_label,
           'diagnostico_color', a.diagnostico_color,
           'bariatrica',        a.bariatrica
         ) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v
    FROM (
      -- Só o que a tela desenha. Coluna nova em `avaliacoes` NÃO entra aqui
      -- sozinha — e e essa a intencao.
      SELECT id, cpf, created_at, data_coleta,
             diagnostico_label, diagnostico_color, bariatrica
        FROM public.avaliacoes
       ORDER BY created_at DESC
       LIMIT GREATEST(COALESCE(p_limite, 200), 1)
    ) a
   WHERE public.medico_tem_autorizacao(a.cpf, p_crm);

  RETURN jsonb_build_object('ok', true, 'linhas', v);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_avaliacoes_recentes(text, text, int) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
