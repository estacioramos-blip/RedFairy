-- ============================================================================
-- limpar_duplicata_oba_teste.sql   (LIMPEZA PONTUAL — não é migração)
--
-- O paciente de teste 014.358.095-72 tem DUAS linhas em `oba_anamnese` para uma
-- única avaliação: 31/07 15:00 e 31/07 15:55. Rastro do bug antigo em que
-- `salvarAnamnese` INSERIA linha nova a cada passagem pelo fluxo (voltar de
-- 'exames' para 'anamnese' e avançar de novo) — corrigido pelo `anamneseId`.
--
-- Conferido antes de apagar: as duas são clinicamente idênticas — mesma
-- cirurgia (Y DE ROUX | BYPASS), mesmos pesos (133 → 81), mesmos 11 meses de
-- pós-operatório, mesmo estado CRÍTICO, mesmos 11 alertas e 17 módulos, mesma
-- data de exames (10/06) e os mesmos 4 exames preenchidos. Os relatórios diferem
-- em 24 bytes de 17 mil (carimbo interno de data).
--
-- MANTÉM a de 15:55 e apaga a de 15:00. A mais recente é a que o app trata como
-- anamnese vigente (`anamneseAnterior` = última linha): apagar ela mudaria o que
-- o paciente e o médico veem hoje.
--
-- Isto NÃO é a correção do item 9 — aquela ignora linhas de REVISÃO MÉDICA, e
-- estas duas não são revisão, são duplicata legítima aos olhos do sistema. Sem
-- esta limpeza, o paciente seguiria vendo a próxima avaliação como a 3ª.
--
-- Autorizado pelo Estácio ("são dados de teste"). Rodar UMA vez.
-- ============================================================================

-- Antes: quantas linhas o CPF tem.
SELECT 'ANTES' AS quando, count(*) AS linhas FROM public.oba_anamnese WHERE cpf = '01435809572';

DELETE FROM public.oba_anamnese
 WHERE id = '28fabd7e-99e2-42b8-9e9a-ad8fe5434aba'::uuid
   AND cpf = '01435809572';   -- cinto de segurança: só apaga se o CPF bater

-- Depois: tem de sobrar 1 linha, a de 15:55.
SELECT 'DEPOIS' AS quando, count(*) AS linhas,
       min(created_at) AS unica_restante
  FROM public.oba_anamnese WHERE cpf = '01435809572';
