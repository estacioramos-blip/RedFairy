-- ============================================================================
-- migrate_oba_landing_eventos_so_insert.sql — o site da landing só INSERE
-- ============================================================================
--
-- O QUE ERA
-- anon e authenticated tinham TODOS os privilégios em oba_landing_eventos
-- (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER) e na
-- sequence do id (USAGE, SELECT, UPDATE) — o padrão que o Supabase dá a toda
-- tabela nova do public. O RLS segurava leitura, alteração e exclusão (só há
-- policy de INSERT), mas o RLS é a ÚNICA camada, e TRUNCATE nem passa por
-- ele. Conferido em 21/10/2026.
--
-- O QUE FICA
--   • anon e authenticated: só INSERT na tabela. Nada na sequence.
--   • É tudo o que o site usa: o intro-ab.js grava com
--     'Prefer: return=minimal' (não lê a linha de volta) e é o único código
--     que toca esta tabela (conferido: site, app, Admin).
--   • A coluna id é IDENTITY: o INSERT não verifica permissão na sequence.
--     O AUTO-TESTE abaixo prova isso antes de a mudança valer.
--
-- ⚠ Trocar o 'Prefer: return=minimal' do intro-ab.js por return=representation,
--   ou passar a usar select= ou upsert (on_conflict), QUEBRA a gravação: os
--   três pedem SELECT, que o anon não tem mais. E quebra calado.
--
-- AUTO-TESTE: dentro da mesma transação, a migration grava um evento COMO
-- ANON — exatamente o que o site faz — e o apaga em seguida. Se a gravação
-- falhar, a transação inteira é desfeita e NADA muda. Sem o teste, um erro
-- aqui pararia a medição em silêncio: o intro-ab.js engole o próprio erro
-- para não atrapalhar o site.
--
-- Não cria objeto novo. Idempotente.
-- ============================================================================

BEGIN;

REVOKE ALL ON TABLE    public.oba_landing_eventos        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.oba_landing_eventos_id_seq FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE  public.oba_landing_eventos        TO anon, authenticated;

-- ── Auto-teste: grava como o site grava ─────────────────────────────────────
SET LOCAL ROLE anon;
INSERT INTO public.oba_landing_eventos (sessao_id, variante, tipo)
VALUES ('__autoteste_migration_so_insert__', 'A', 'impressao');
RESET ROLE;

SET LOCAL ROLE authenticated;
INSERT INTO public.oba_landing_eventos (sessao_id, variante, tipo)
VALUES ('__autoteste_migration_so_insert__', 'B', 'clique');
RESET ROLE;

-- Apaga a linha do teste (como dono): não pode entrar na amostra.
DELETE FROM public.oba_landing_eventos
 WHERE sessao_id = '__autoteste_migration_so_insert__';

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Conferência (rodar depois, SOZINHA numa aba nova do SQL Editor) ─────────
-- Esperado: só INSERT = true; todo o resto = false.
-- SELECT r AS papel, p AS privilegio,
--        CASE WHEN p LIKE 'SEQ %'
--             THEN has_sequence_privilege(r, 'public.oba_landing_eventos_id_seq', substr(p, 5))
--             ELSE has_table_privilege(r, 'public.oba_landing_eventos', p) END AS tem
--   FROM unnest(ARRAY['anon','authenticated']) r,
--        unnest(ARRAY['INSERT','SELECT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER',
--                     'SEQ USAGE','SEQ SELECT','SEQ UPDATE']) p
--  ORDER BY 1, 2;
--
-- O estado bruto (anon e authenticated devem aparecer só com "a" = INSERT na
-- tabela, e não aparecer na sequence):
--   SELECT relname, relacl FROM pg_class
--    WHERE relname IN ('oba_landing_eventos', 'oba_landing_eventos_id_seq');
--
-- E o teste não deixou rastro (espera 0):
--   SELECT count(*) FROM public.oba_landing_eventos
--    WHERE sessao_id = '__autoteste_migration_so_insert__';
