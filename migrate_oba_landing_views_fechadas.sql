-- ============================================================================
-- migrate_oba_landing_views_fechadas.sql — fecha as 3 views de leitura da landing
-- ============================================================================
--
-- O QUE ERA
-- oba_landing_resumo, oba_landing_por_cta e oba_origem_resumo foram criadas
-- sem security_invoker. Uma view assim roda com a permissão do DONO
-- (postgres), que passa por cima do RLS — e as três tinham SELECT para o
-- anon. Ou seja: qualquer pessoa com a chave pública do site (ela está no
-- intro-ab.js, aberta) lia, de fora, os números do teste A/B, os cliques por
-- botão e o FUNIL POR PARCEIRO (visitas, cadastros, assinaturas). Testado em
-- 21/10/2026: as três respondiam 200 com os dados.
-- Não há dado pessoal (são totais), mas o funil por parceiro é informação
-- comercial: quanto cada divulgação converte é o que se negocia com ele.
--
-- O QUE FICA
--   • security_invoker = on: a view passa a obedecer ao RLS de quem consulta.
--     A tabela só tem policy de INSERT, então para o anon ela já sairia vazia.
--   • REVOKE do anon e do authenticated: em vez de vazio, o pedido é recusado
--     (erro 42501). Recusa explícita é melhor que vazio — vazio parece "não
--     tem dado" e esconde a regra.
--   • Ninguém no código lê essas views (conferido: site, app e Admin). A
--     leitura continua no SQL Editor, como dono — nada muda para o Estácio.
--
-- ⚠ O REVOKE é o que segura se alguém rodar de novo uma migration antiga.
--   CREATE OR REPLACE VIEW sem WITH (...) volta as opções da view ao padrão
--   (security_invoker desligado). Os GRANTs, ao contrário, sobrevivem ao
--   REPLACE. Por isso migrate_oba_utm.sql e migrate_oba_landing_ab.sql foram
--   atualizados para criar as views já com security_invoker = on.
--
-- Não cria objeto novo: a regra do GRANT de 30/10/2026 não se aplica aqui.
-- Idempotente.
-- ============================================================================

BEGIN;

ALTER VIEW public.oba_landing_resumo  SET (security_invoker = on);
ALTER VIEW public.oba_landing_por_cta SET (security_invoker = on);
ALTER VIEW public.oba_origem_resumo   SET (security_invoker = on);

REVOKE ALL ON public.oba_landing_resumo  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.oba_landing_por_cta FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.oba_origem_resumo   FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Conferência (rodar depois, SOZINHA numa aba nova do SQL Editor) ─────────
-- Esperado: 3 linhas, todas com invoker=true, anon_le=false, auth_le=false
-- SELECT c.relname AS view,
--        coalesce('security_invoker=on' = ANY (c.reloptions), false)  AS invoker,
--        has_table_privilege('anon', c.oid, 'SELECT')                  AS anon_le,
--        has_table_privilege('authenticated', c.oid, 'SELECT')         AS auth_le
--   FROM pg_class c
--  WHERE c.relnamespace = 'public'::regnamespace
--    AND c.relname IN ('oba_landing_resumo','oba_landing_por_cta','oba_origem_resumo')
--  ORDER BY 1;
--
-- E a leitura do dono continua funcionando:
--   SELECT * FROM public.oba_landing_resumo;
