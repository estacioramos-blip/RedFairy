-- ============================================================
-- migrate_oba_extrato.sql  (DEC-014 — opt-in OBA + médico usa Telegram)
--
-- 1) avaliacoes.quer_extrato_oba: quando o médico marca o paciente como
--    bariátrico, ele pode optar por receber o EXTRATO da anamnese OBA do
--    paciente (quando o paciente preencher). A escolha fica na avaliação.
--    A ENTREGA do extrato (canal/gatilho) é fase 2.
-- 2) medicos.usa_telegram: checkbox "USO TAMBÉM O TELEGRAM" no cadastro 4DOC —
--    futura base para entregar extratos/notificações ao médico via Telegram.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS. Termina com NOTIFY pgrst.
-- ============================================================

ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS quer_extrato_oba BOOLEAN DEFAULT false;
ALTER TABLE public.medicos    ADD COLUMN IF NOT EXISTS usa_telegram     BOOLEAN DEFAULT false;

NOTIFY pgrst, 'reload schema';
