-- ============================================================
-- migrate_creditos_fase2.sql  (DEC-011 — Motor de créditos 4DOC, fase 2)
--
-- Torna o crédito do médico REGISTRADO e AUTOMÁTICO (a fase 1 só calculava
-- na hora). Sem mudança na UX de paciente/pagamento — tudo nos bastidores.
--
-- Regra (confirmada pelo Estácio):
--   • atribuição = PRIMEIRO médico que triou o paciente (menor created_at em
--     triagens ∪ avaliacoes), capturado NO CADASTRO (antes do delete de triagens).
--   • 1 crédito por paciente convertido (cadastrou + pagou). Renovação anual
--     NÃO gera crédito novo → cpf_paciente UNIQUE no ledger.
--
-- Partes:
--   1. profiles.medico_origem (CRM do 1º médico)
--   2. tabela-razão creditos_medico (ledger auditável, RLS fechado)
--   3. consume_triagem_on_signup: grava medico_origem ANTES de apagar triagens
--   4. trigger em assinaturas: credita automaticamente ao virar 'ativa'
--   5. backfill: medico_origem dos perfis + ledger das assinaturas ativas
--   6. admin_listar_medicos: n_convertidos passa a vir do ledger (fonte da verdade)
--
-- Idempotente: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS /
-- CREATE OR REPLACE / DROP TRIGGER IF EXISTS / ON CONFLICT DO NOTHING.
-- ============================================================

-- 1) Vínculo permanente paciente -> médico de origem ---------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medico_origem TEXT;

-- 2) Ledger de créditos (1 linha por paciente convertido) ----------------------
CREATE TABLE IF NOT EXISTS public.creditos_medico (
  id            BIGSERIAL PRIMARY KEY,
  medico_crm    TEXT NOT NULL,
  cpf_paciente  TEXT NOT NULL UNIQUE,      -- 1 crédito por paciente (anti-duplicata)
  assinatura_id UUID,                      -- assinaturas.id é UUID
  valor         INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now()
);
-- RLS fechado: ninguém lê/escreve via anon. As funções SECURITY DEFINER
-- (trigger e admin_listar_medicos) rodam como owner e furam o RLS.
ALTER TABLE public.creditos_medico ENABLE ROW LEVEL SECURITY;

-- 3) consume_triagem_on_signup — captura medico_origem ANTES do delete ----------
CREATE OR REPLACE FUNCTION consume_triagem_on_signup(
  p_user_id UUID,
  p_cpf TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bariatrica BOOLEAN;
  v_profile_cpf TEXT;
  v_deleted_count INT;
  v_medico_origem TEXT;
BEGIN
  -- Defesa 1: so o proprio user pode consumir suas triagens
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Nao autorizado';
  END IF;

  -- Defesa 2: o CPF tem que bater com o profile do user
  SELECT cpf INTO v_profile_cpf
  FROM profiles
  WHERE id = p_user_id;

  IF v_profile_cpf IS NULL OR v_profile_cpf <> p_cpf THEN
    RAISE EXCEPTION 'CPF nao corresponde ao profile do usuario';
  END IF;

  -- 1. Le a triagem mais recente do CPF (bypassa RLS porque SECURITY DEFINER)
  SELECT bariatrica INTO v_bariatrica
  FROM triagens
  WHERE cpf = p_cpf
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. Se bariatrica = true, copia pra profile
  IF v_bariatrica IS TRUE THEN
    UPDATE profiles
    SET bariatrica = TRUE
    WHERE id = p_user_id;
  END IF;

  -- 2b. Captura o medico de origem (1o que triou) ANTES de apagar as triagens.
  --     Considera triagens E avaliacoes; preserva valor ja existente.
  SELECT medico_crm INTO v_medico_origem
  FROM (
    SELECT medico_crm, created_at FROM triagens
      WHERE cpf = p_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM avaliacoes
      WHERE cpf = p_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
  ) s
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_medico_origem IS NOT NULL THEN
    UPDATE profiles
    SET medico_origem = COALESCE(medico_origem, v_medico_origem)
    WHERE id = p_user_id;
  END IF;

  -- 3. Deleta TODAS as triagens daquele CPF (orfas ou nao)
  WITH deleted AS (
    DELETE FROM triagens WHERE cpf = p_cpf RETURNING 1
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  RETURN jsonb_build_object(
    'bariatrica_copied', COALESCE(v_bariatrica, false),
    'triagens_deleted', v_deleted_count,
    'medico_origem', v_medico_origem
  );
END;
$$;

GRANT EXECUTE ON FUNCTION consume_triagem_on_signup(UUID, TEXT) TO authenticated;

-- 4) Trigger: credita o medico_origem quando a assinatura vira 'ativa' ----------
CREATE OR REPLACE FUNCTION public.fn_credita_medico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  TEXT;
  v_orig TEXT;
BEGIN
  IF NEW.status <> 'ativa' THEN
    RETURN NEW;
  END IF;

  SELECT cpf, medico_origem INTO v_cpf, v_orig
  FROM public.profiles WHERE id = NEW.user_id;

  IF v_orig IS NOT NULL AND btrim(v_orig) <> '' AND v_cpf IS NOT NULL THEN
    INSERT INTO public.creditos_medico (medico_crm, cpf_paciente, assinatura_id)
    VALUES (v_orig, v_cpf, NEW.id)
    ON CONFLICT (cpf_paciente) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_credita_medico ON public.assinaturas;
CREATE TRIGGER trg_credita_medico
  AFTER INSERT ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_credita_medico();

-- 5a) Backfill: medico_origem dos perfis existentes (pelos screenings que restam)
WITH screenings AS (
  SELECT cpf, medico_crm, created_at FROM public.triagens
    WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
  UNION ALL
  SELECT cpf, medico_crm, created_at FROM public.avaliacoes
    WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
),
first_doc AS (
  SELECT DISTINCT ON (cpf) cpf, medico_crm
  FROM screenings ORDER BY cpf, created_at ASC
)
UPDATE public.profiles p
SET medico_origem = fd.medico_crm
FROM first_doc fd
WHERE p.cpf = fd.cpf AND p.medico_origem IS NULL;

-- 5b) Backfill: ledger a partir das assinaturas ativas ja existentes
INSERT INTO public.creditos_medico (medico_crm, cpf_paciente, assinatura_id)
SELECT p.medico_origem, p.cpf, a.id
FROM public.profiles p
JOIN public.assinaturas a ON a.user_id = p.id AND a.status = 'ativa'
WHERE p.medico_origem IS NOT NULL AND btrim(p.medico_origem) <> '' AND p.cpf IS NOT NULL
ON CONFLICT (cpf_paciente) DO NOTHING;

-- 6) admin_listar_medicos: n_convertidos agora vem do LEDGER (fonte da verdade) -
CREATE OR REPLACE FUNCTION public.admin_listar_medicos(p_crm text, p_token text)
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
  screenings AS (
    SELECT cpf, medico_crm
      FROM public.triagens
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
    UNION ALL
    SELECT cpf, medico_crm
      FROM public.avaliacoes
     WHERE medico_crm IS NOT NULL AND btrim(medico_crm) <> '' AND cpf IS NOT NULL
  ),
  triados AS (
    SELECT medico_crm AS crm, count(DISTINCT cpf) AS n
      FROM screenings GROUP BY medico_crm
  ),
  conv AS (
    SELECT medico_crm AS crm, count(*) AS n
      FROM public.creditos_medico GROUP BY medico_crm
  )
  SELECT jsonb_build_object(
    'ok', true,
    'medicos', COALESCE(jsonb_agg(jsonb_build_object(
      'id',            m.id,
      'nome',          m.nome,
      'crm',           m.crm,
      'uf',            m.uf,
      'celular',       m.celular,
      'email',         m.email,
      'cep',           m.cep,
      'is_admin',      m.is_admin,
      'afiliado',      (m.cep IS NOT NULL AND btrim(m.cep) <> ''
                        AND m.cpf IS NOT NULL AND btrim(m.cpf) <> ''
                        AND m.pix_chave IS NOT NULL AND btrim(m.pix_chave) <> ''),
      'n_triados',     COALESCE(t.n, 0),
      'n_convertidos', COALESCE(cv.n, 0)
    ) ORDER BY COALESCE(cv.n, 0) DESC, COALESCE(t.n, 0) DESC, m.nome), '[]'::jsonb)
  )
  INTO resultado
  FROM public.medicos m
  LEFT JOIN triados t  ON t.crm  = m.crm
  LEFT JOIN conv    cv ON cv.crm = m.crm;

  RETURN resultado;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_listar_medicos(text, text) TO anon, authenticated;

-- Recarrega o cache de schema do PostgREST (DDL: coluna/tabela/função novas).
NOTIFY pgrst, 'reload schema';
