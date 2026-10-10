-- ============================================================
-- migrate_ferrara.sql
--
-- Inclui o FERRARA® (carboximaltose férrica, Eurofarma) no catálogo de
-- ferro EV, classe alta_dose, DESLIGADO. A marca ativa da classe continua
-- a que estiver marcada (hoje, Ferinject); trocar é no Admin → Ferro EV.
--
-- Fonte: bula para o paciente aprovada pela ANVISA em 04/05/2026
-- (Registro 1.0043.1579):
--   • bolsa de 100 mL, 5 mg/mL = 500 mg de ferro III
--   • até 1.000 mg (2 bolsas) uma vez por semana
--   • tempo mínimo de infusão: 6 min por bolsa
--   • "solução pronta para uso e não deve ser diluído"
--
-- Coluna nova `pronto_para_uso`: a receita foi escrita para ampola que se
-- dilui ("Ampolas: N", "Diluir em ..."). Com a coluna ligada, a receita diz
-- "bolsa" e "NÃO diluir" (ver ehBolsaPronta em src/engine/ferroProtocol.js).
-- Padrão false: os medicamentos que já existem não mudam.
-- `diluicao` fica NULL — a bula proíbe diluir.
--
-- Idempotente: rodar de novo não faz nada.
-- ============================================================

BEGIN;

ALTER TABLE public.medicamentos
  ADD COLUMN IF NOT EXISTS pronto_para_uso BOOLEAN NOT NULL DEFAULT false;

INSERT INTO public.medicamentos
  (nome_comercial, principio_ativo, fabricante, classe, concentracao_mg_ml, frascos_mg,
   dose_max_sessao_mg, diluicao, tempo_infusao, intervalo_sessoes, pronto_para_uso,
   ativo, observacoes)
VALUES
  ('Ferrara', 'carboximaltose férrica', 'Eurofarma', 'alta_dose',
   5, '500', 1000, NULL, '≥ 6 min por bolsa', '7 dias', true, false,
   'Não adicionar outros medicamentos à bolsa. Contém 320 mg de sódio por bolsa '
   '(atenção em restrição de sal/hipertensão). Hemodiálise: máx. 200 mg por dose. '
   'Risco de hipofosfatemia.')
ON CONFLICT (nome_comercial) DO NOTHING;

COMMIT;

-- Conferência:
-- SELECT nome_comercial, classe, ativo, pronto_para_uso, frascos_mg, dose_max_sessao_mg,
--        tempo_infusao, intervalo_sessoes
--   FROM public.medicamentos ORDER BY classe, nome_comercial;
