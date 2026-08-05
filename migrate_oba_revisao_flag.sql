-- ============================================================================
-- migrate_oba_revisao_flag.sql   (item 9 da auditoria ago/2026)
--
-- PROBLEMA: o número da avaliação do paciente ("Avaliação nº 3", "3ª avaliação
-- concluída!") é calculado como
--
--     numeroCiclo = nº de linhas em oba_anamnese do CPF + 1
--
-- e a REVISÃO MÉDICA insere uma linha nova — de propósito, para preservar o
-- retrato original do paciente sob `relatorio_oba._paciente_original`. As duas
-- decisões são individualmente corretas e juntas produzem um erro: um paciente
-- que fez 2 avaliações e teve UMA revisada pelo médico vê a próxima anunciada
-- como a 4ª. O médico corrigir a anamnese não é um novo ciclo clínico — é o
-- mesmo ciclo, corrigido.
--
-- POR QUE UMA COLUNA, e não o marcador que já existe:
-- `relatorio_oba._revisado_por_medico` é gravado só quando o RELATÓRIO é
-- gerado, lá no fim do fluxo. Uma revisão abandonada antes disso (o médico
-- fecha o modal na metade) deixa a linha inserida SEM marcador nenhum — e ela
-- continuaria contando como ciclo. O marcador tem de nascer junto com a linha.
--
-- `oba_anamnese_inserir` aceita qualquer coluna real da tabela (não tem
-- allowlist fechada), então a coluna nova passa a ser gravada sem mexer na RPC.
--
-- BACKFILL: linhas antigas de revisão são reconhecíveis pelo marcador do
-- relatório. As que forem revisão abandonada (sem relatório) ficam como
-- `false` — não há como distingui-las retroativamente, e errar para "conta como
-- ciclo" preserva o comportamento atual em vez de mudar números já vistos.
--
-- Idempotente.
-- ============================================================================

ALTER TABLE public.oba_anamnese
  ADD COLUMN IF NOT EXISTS revisao_medica boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.oba_anamnese.revisao_medica IS
  'true = linha criada por REVISÃO MÉDICA da anamnese, não por um novo ciclo do paciente. Não conta no número da avaliação.';

-- Backfill do que dá para reconhecer com segurança.
UPDATE public.oba_anamnese
   SET revisao_medica = true
 WHERE revisao_medica = false
   AND COALESCE((relatorio_oba->>'_revisado_por_medico')::boolean, false) = true;

-- Índice pequeno: a contagem por CPF filtra por esta coluna em toda abertura do
-- painel do paciente e do OBA pelo médico.
CREATE INDEX IF NOT EXISTS idx_oba_anamnese_cpf_ciclo
  ON public.oba_anamnese (cpf) WHERE revisao_medica = false;

NOTIFY pgrst, 'reload schema';
