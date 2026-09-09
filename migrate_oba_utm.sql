-- ============================================================================
-- migrate_oba_utm.sql   —   Rastreamento de origem (UTM)   ·   09/09/2026
--
-- OBJETIVO: saber quantas visitas, cadastros e ASSINATURAS cada parceiro de
-- divulgação traz, para decidir onde investir. A coluna que decide é
-- ASSINATURAS — visita é a métrica que engana (influenciador grande entrega
-- clique e não entrega cadastro).
--
-- ⚠ ISTO NÃO É O PROGRAMA DE INDICAÇÃO. Não usa código de indicador, não gera
--   crédito e não paga ninguém por conversão. O parceiro é remunerado por
--   contrato de valor fixo, FORA do sistema. Ver a seção da reforma CFM no
--   CLAUDE.md: pagar por paciente trazido é captação de clientela.
--
--   Por isso a origem mora em TABELA SEPARADA (`oba_origem`) e não numa coluna
--   de `profiles`: nenhuma função que calcula crédito, desconto ou vínculo
--   chega perto dela. A separação é estrutural, não uma regra de conduta que
--   alguém precise lembrar.
--
-- ⚠ NENHUM campo daqui pode alimentar crédito, desconto ou pagamento. Se um dia
--   você se pegar fazendo JOIN entre `oba_origem` e `creditos_*`, pare.
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. A origem nos eventos da landing (visitas).
--    Colunas novas, todas nuláveis: o que já está gravado continua válido, e o
--    intro-ab.js antigo (se algum cache ainda servir) segue funcionando.
--    A policy é por TABELA, não por coluna — `oba_landing_insert_anon`
--    (insert-only para anon) passa a valer para estas também, sem mudança.
-- ---------------------------------------------------------------------------
ALTER TABLE public.oba_landing_eventos ADD COLUMN IF NOT EXISTS utm_source   text;
ALTER TABLE public.oba_landing_eventos ADD COLUMN IF NOT EXISTS utm_medium   text;
ALTER TABLE public.oba_landing_eventos ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.oba_landing_eventos ADD COLUMN IF NOT EXISTS utm_content  text;

CREATE INDEX IF NOT EXISTS idx_landing_utm_source
  ON public.oba_landing_eventos (utm_source) WHERE utm_source IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. A origem de quem CHEGOU A SE CADASTRAR.
--
--    Uma linha por CPF. `primeiro_toque_em` é quando a origem foi registrada;
--    `cadastro_em` e `assinatura_em` marcam os dois momentos que interessam ao
--    funil. Guardar os dois na mesma linha (em vez de dois eventos) mantém a
--    tabela pequena e a view simples.
--
--    ⚠ LGPD: o cookie de origem, sozinho, é anônimo. AQUI ele deixa de ser —
--    a origem passa a estar ligada a um CPF e ao uso de um serviço de saúde.
--    É dado pessoal. Por isso a tabela é enxuta (nada de referrer, user agent
--    ou IP), fica sob RLS sem policy nenhuma, e é apagável sozinha.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.oba_origem (
  cpf               text PRIMARY KEY,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  utm_content       text,
  primeiro_toque_em timestamptz NOT NULL DEFAULT now(),
  cadastro_em       timestamptz,
  assinatura_em     timestamptz
);

ALTER TABLE public.oba_origem ENABLE ROW LEVEL SECURITY;
-- Sem policy nenhuma, de propósito: o acesso é EXCLUSIVAMENTE pela RPC abaixo,
-- que é SECURITY DEFINER e gateada por token. Mesmo padrão das outras tabelas
-- do projeto (ver a seção de RLS no CLAUDE.md).

-- ---------------------------------------------------------------------------
-- 3. A RPC que grava. Chamada pelo app DEPOIS do cadastro e DEPOIS da
--    assinatura — nunca de dentro de `register_paciente` nem de
--    `assinatura_registrar_pagamento`.
--
--    Por que fora e não dentro: `register_paciente` é uma função SQL de CTEs
--    encadeadas, e `assinatura_registrar_pagamento` move dinheiro. Enfiar
--    marketing dentro delas junta dois assuntos que a reforma acabou de
--    separar — e faz uma falha de medição derrubar um cadastro.
--    Se esta RPC falhar, perde-se a atribuição. Só isso.
--
--    PRIMEIRO TOQUE VENCE, aqui também: uma vez gravada a origem de um CPF,
--    ela não é sobrescrita. Quem descobriu o projeto por um influenciador e
--    voltou pelo Google continua sendo mérito do influenciador.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.oba_origem_registrar(
  p_cpf          text,
  p_token        text,
  p_etapa        text,                      -- 'cadastro' | 'assinatura'
  p_utm_source   text DEFAULT NULL,
  p_utm_medium   text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content  text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  -- lower(): o cliente já normaliza, mas a RPC é a última porta. Caixa
  -- diferente para o mesmo parceiro fragmentaria o funil em silêncio — e é o
  -- funil que decide onde o dinheiro de divulgação vai.
  v_src text := NULLIF(lower(left(btrim(coalesce(p_utm_source,'')),   100)), '');
  v_med text := NULLIF(lower(left(btrim(coalesce(p_utm_medium,'')),   100)), '');
  v_cmp text := NULLIF(lower(left(btrim(coalesce(p_utm_campaign,'')), 100)), '');
  v_cnt text := NULLIF(lower(left(btrim(coalesce(p_utm_content,'')),  100)), '');
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  -- GATE: só o dono do CPF registra a própria origem. Sem isto, qualquer
  -- anônimo atribuiria cadastros alheios ao parceiro que quisesse — e o que
  -- está em jogo aqui é a decisão de onde investir dinheiro de verdade.
  IF NOT public.token_paciente_ok(v_cpf, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sessao invalida');
  END IF;
  IF p_etapa NOT IN ('cadastro', 'assinatura') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Etapa invalida');
  END IF;

  INSERT INTO public.oba_origem AS o
    (cpf, utm_source, utm_medium, utm_campaign, utm_content,
     cadastro_em, assinatura_em)
  VALUES
    (v_cpf, v_src, v_med, v_cmp, v_cnt,
     CASE WHEN p_etapa = 'cadastro'   THEN now() END,
     CASE WHEN p_etapa = 'assinatura' THEN now() END)
  ON CONFLICT (cpf) DO UPDATE SET
    -- PRIMEIRO TOQUE VENCE: o COALESCE preserva o que já estava lá. Só
    -- preenche o que ainda era nulo.
    utm_source    = COALESCE(o.utm_source,   EXCLUDED.utm_source),
    utm_medium    = COALESCE(o.utm_medium,   EXCLUDED.utm_medium),
    utm_campaign  = COALESCE(o.utm_campaign, EXCLUDED.utm_campaign),
    utm_content   = COALESCE(o.utm_content,  EXCLUDED.utm_content),
    cadastro_em   = COALESCE(o.cadastro_em,   EXCLUDED.cadastro_em),
    assinatura_em = COALESCE(o.assinatura_em, EXCLUDED.assinatura_em);

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.oba_origem_registrar(text,text,text,text,text,text,text)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. A LEITURA — o funil por parceiro.
--
--    Ordenada por ASSINATURAS. É a única coluna que decide investimento:
--    visitas medem alcance, e alcance não paga a plataforma.
--
--    As visitas vêm de sessões DISTINTAS com impressão — não de linhas, senão
--    quem recarrega a página vira "duas visitas".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.oba_origem_resumo AS
WITH visitas AS (
  SELECT COALESCE(utm_source, '(direto)')  AS utm_source,
         COALESCE(utm_content, '')         AS utm_content,
         count(DISTINCT sessao_id)         AS visitas
    FROM public.oba_landing_eventos
   WHERE tipo = 'impressao'
   GROUP BY 1, 2
),
conversao AS (
  SELECT COALESCE(utm_source, '(direto)')  AS utm_source,
         COALESCE(utm_content, '')         AS utm_content,
         count(*) FILTER (WHERE cadastro_em   IS NOT NULL) AS cadastros,
         count(*) FILTER (WHERE assinatura_em IS NOT NULL) AS assinaturas
    FROM public.oba_origem
   GROUP BY 1, 2
)
SELECT
  COALESCE(v.utm_source,  c.utm_source)  AS parceiro,
  NULLIF(COALESCE(v.utm_content, c.utm_content), '') AS peca,
  COALESCE(v.visitas, 0)      AS visitas,
  COALESCE(c.cadastros, 0)    AS cadastros,
  COALESCE(c.assinaturas, 0)  AS assinaturas,
  round(100.0 * COALESCE(c.cadastros,0)   / NULLIF(COALESCE(v.visitas,0), 0), 1)   AS taxa_visita_cadastro_pct,
  round(100.0 * COALESCE(c.assinaturas,0) / NULLIF(COALESCE(c.cadastros,0), 0), 1) AS taxa_cadastro_assinatura_pct
FROM visitas v
FULL OUTER JOIN conversao c
  ON c.utm_source = v.utm_source AND c.utm_content = v.utm_content
ORDER BY 5 DESC, 3 DESC;

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='oba_landing_eventos'
--      AND column_name LIKE 'utm%';                    -- espera: 4 linhas
--
--   SELECT * FROM public.oba_origem_resumo;            -- vazio até haver dado
--
--   -- a tabela nova está fechada ao anon?
--   SELECT relrowsecurity, (SELECT count(*) FROM pg_policies
--                            WHERE tablename='oba_origem') AS policies
--     FROM pg_class WHERE relname='oba_origem';         -- espera: true, 0
--
--   -- ⛔ o teste que mantém marketing longe de dinheiro:
--   SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prosrc LIKE '%oba_origem%'
--      AND p.proname <> 'oba_origem_registrar';
--   -- espera: 0 linhas. Se aparecer uma função de crédito aqui, PARE.
-- ---------------------------------------------------------------------------
