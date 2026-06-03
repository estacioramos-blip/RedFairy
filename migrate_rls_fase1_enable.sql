-- ============================================================
-- migrate_rls_fase1_enable.sql  (DEC-008 — RLS Fase 1, parte 2: LIGAR RLS)
--
-- ⚠️ RODAR SOMENTE DEPOIS que o app novo estiver no ar (o AdminPage já
-- salvando via salvar_medicamento/salvar_config). Antes disso, ligar o RLS
-- quebraria o "Salvar" do admin.
--
-- Efeito:
--   • medicamentos: leitura pública (catálogo), escrita só via RPC admin.
--   • config:       leitura pública (preços/Pix são exibidos), escrita só RPC admin.
--   • leads_comerciais: qualquer um INSERE (formulário), ninguém LÊ via anon.
--
-- As funções SECURITY DEFINER (salvar_*) furam o RLS — escrita admin segue OK.
-- Idempotente: DROP POLICY IF EXISTS antes de criar.
-- ============================================================

-- medicamentos: leitura pública, escrita negada (vai pela RPC) -----------------
ALTER TABLE public.medicamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS med_public_read ON public.medicamentos;
CREATE POLICY med_public_read ON public.medicamentos FOR SELECT USING (true);

-- config: leitura pública, escrita negada (vai pela RPC) -----------------------
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS config_public_read ON public.config;
CREATE POLICY config_public_read ON public.config FOR SELECT USING (true);

-- leads_comerciais: só INSERT (formulário), sem leitura via anon ---------------
ALTER TABLE public.leads_comerciais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_insert ON public.leads_comerciais;
CREATE POLICY leads_insert ON public.leads_comerciais FOR INSERT WITH CHECK (true);
