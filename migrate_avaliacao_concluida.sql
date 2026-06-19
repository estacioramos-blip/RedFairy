-- =============================================================================
-- migrate_avaliacao_concluida.sql
-- =============================================================================
-- Adiciona a coluna `concluida` em avaliacoes para distinguir a avaliação REAL
-- (que o paciente concluiu no formulário, clicando AVALIAR) do "espelho" criado
-- automaticamente quando a triagem mostra o resultado (ferritina/sat = null).
--
-- POR QUÊ: o espelho tem a MESMA data da triagem, então a contagem de avaliações
-- ficava inflada e a 1ª avaliação caía no fluxo da 2ª ("última gratuita", campos
-- já preenchidos etc.). Com `concluida` contamos só as avaliações de verdade.
--
-- COMO USAR: Supabase Dashboard -> SQL Editor -> cole tudo -> Run.
-- =============================================================================

ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS concluida boolean NOT NULL DEFAULT false;

-- Dados já existentes (teste): marca como concluídas, p/ não virarem "pendentes".
UPDATE public.avaliacoes SET concluida = true WHERE concluida = false;
