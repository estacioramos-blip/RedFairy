-- ============================================================
-- migrate_prescricoes_log_fase2.sql  (DEC-012 — Log de prescrições, fase 2)
--
-- Rastreio PRECISO por marca: em vez de atribuir tudo à marca ativa ATUAL
-- (fase 1), grava um LOG no momento da prescrição, capturando a marca que
-- estava ativa naquele instante. Se a marca ativa mudar, o histórico antigo
-- permanece correto.
--
-- Gancho: trigger AFTER INSERT em `avaliacoes` — para cada flag de tratamento,
-- registra a(s) marca(s) ativa(s) da categoria correspondente.
--   ferro_injetavel -> AS DUAS marcas ativas de medicamentos (uma por classe)
--   ferro_oral / vitb12_im / vitb12_sl / vitamina_b12 / bariatrica
--        -> marca ativa do suplemento da categoria
--
-- Backfill: avaliações existentes entram com as marcas ativas ATUAIS (baseline);
-- daqui pra frente o trigger captura a marca do momento.
--
-- admin_prescricoes passa a ler do LOG (mesmo formato de retorno — a aba não muda).
--
-- Idempotente: CREATE TABLE IF NOT EXISTS, UNIQUE(avaliacao_id,marca) +
-- ON CONFLICT DO NOTHING, CREATE OR REPLACE, DROP TRIGGER IF EXISTS.
-- Termina com NOTIFY pgrst.
-- ============================================================

-- 1) Tabela-log ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescricoes (
  id            BIGSERIAL PRIMARY KEY,
  avaliacao_id  UUID,
  medico_crm    TEXT,
  cpf_paciente  TEXT,
  categoria     TEXT,
  marca         TEXT NOT NULL,
  fabricante    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (avaliacao_id, marca)
);
-- RLS fechado: só as funções SECURITY DEFINER (trigger e admin_prescricoes) tocam.
ALTER TABLE public.prescricoes ENABLE ROW LEVEL SECURITY;

-- 2) Trigger: registra prescrições no momento da avaliação ----------------------
CREATE OR REPLACE FUNCTION public.fn_log_prescricao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Ferro EV: as 2 marcas ativas (uma por classe)
  IF NEW.ferro_injetavel IS TRUE THEN
    INSERT INTO public.prescricoes (avaliacao_id, medico_crm, cpf_paciente, categoria, marca, fabricante, created_at)
    SELECT NEW.id, NEW.medico_crm, NEW.cpf, 'Ferro EV (' || classe || ')', nome_comercial, fabricante, NEW.created_at
      FROM public.medicamentos WHERE ativo IS TRUE
    ON CONFLICT (avaliacao_id, marca) DO NOTHING;
  END IF;

  -- Suplementos: marca ativa da categoria correspondente à flag
  INSERT INTO public.prescricoes (avaliacao_id, medico_crm, cpf_paciente, categoria, marca, fabricante, created_at)
  SELECT NEW.id, NEW.medico_crm, NEW.cpf, categoria, nome_comercial, fabricante, NEW.created_at
    FROM public.suplementos
   WHERE ativo IS TRUE AND (
       (categoria = 'ferro_oral'                AND NEW.ferro_oral   IS TRUE) OR
       (categoria = 'b12_injetavel'             AND NEW.vitb12_im    IS TRUE) OR
       (categoria = 'b12_sublingual'            AND NEW.vitb12_sl    IS TRUE) OR
       (categoria = 'b12_oral'                  AND NEW.vitamina_b12 IS TRUE) OR
       (categoria = 'polivitaminico_bariatrico' AND NEW.bariatrica   IS TRUE)
     )
  ON CONFLICT (avaliacao_id, marca) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_log_prescricao ON public.avaliacoes;
CREATE TRIGGER trg_log_prescricao
  AFTER INSERT ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_prescricao();

-- 3) Backfill das avaliações existentes (marcas ativas atuais = baseline) -------
INSERT INTO public.prescricoes (avaliacao_id, medico_crm, cpf_paciente, categoria, marca, fabricante, created_at)
SELECT av.id, av.medico_crm, av.cpf, 'Ferro EV (' || m.classe || ')', m.nome_comercial, m.fabricante, av.created_at
  FROM public.avaliacoes av CROSS JOIN public.medicamentos m
 WHERE m.ativo IS TRUE AND av.ferro_injetavel IS TRUE
ON CONFLICT (avaliacao_id, marca) DO NOTHING;

INSERT INTO public.prescricoes (avaliacao_id, medico_crm, cpf_paciente, categoria, marca, fabricante, created_at)
SELECT av.id, av.medico_crm, av.cpf, s.categoria, s.nome_comercial, s.fabricante, av.created_at
  FROM public.avaliacoes av JOIN public.suplementos s ON s.ativo IS TRUE AND (
       (s.categoria = 'ferro_oral'                AND av.ferro_oral   IS TRUE) OR
       (s.categoria = 'b12_injetavel'             AND av.vitb12_im    IS TRUE) OR
       (s.categoria = 'b12_sublingual'            AND av.vitb12_sl    IS TRUE) OR
       (s.categoria = 'b12_oral'                  AND av.vitamina_b12 IS TRUE) OR
       (s.categoria = 'polivitaminico_bariatrico' AND av.bariatrica   IS TRUE)
     )
ON CONFLICT (avaliacao_id, marca) DO NOTHING;

-- 4) admin_prescricoes: agora lê do LOG (mesmo formato de retorno) --------------
CREATE OR REPLACE FUNCTION public.admin_prescricoes(p_crm text, p_token text)
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

  WITH
  por_marca AS (
    SELECT marca, min(fabricante) AS fabricante, min(categoria) AS categoria, count(*) AS n
      FROM public.prescricoes GROUP BY marca
  ),
  meses AS (
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes, count(*) AS n
      FROM public.prescricoes GROUP BY 1
  )
  SELECT jsonb_build_object(
    'ok', true,
    'por_marca', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'marca', marca, 'fabricante', fabricante, 'categoria', categoria, 'n', n
      ) ORDER BY n DESC, marca) FROM por_marca), '[]'::jsonb),
    'por_mes', COALESCE((SELECT jsonb_agg(jsonb_build_object('mes', mes, 'n', n) ORDER BY mes) FROM meses), '[]'::jsonb)
  ) INTO resultado;

  RETURN resultado;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_prescricoes(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
