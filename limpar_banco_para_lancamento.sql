-- ============================================================================
-- limpar_banco_para_lancamento.sql
--
-- Zera os dados de TESTE antes do lançamento, preservando o que não é teste.
-- Levantado tabela a tabela no banco (ago/2026), não de memória.
--
-- ⚠ APAGA DADOS. Leia as duas listas antes de rodar.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- PRESERVA (NÃO toca):
--
--   · `config`        — preços, cotação do dólar, comissões. Limpar aqui quebra
--                       pagamento, comissão e o Caixa de uma vez.
--   · `medicos`       — só a linha do ADMIN (CRM 6302/BA). É a única com
--                       `is_admin`; sem ela você perde o painel de Configurações
--                       e teria que recriar a linha na mão. Os demais médicos de
--                       teste saem.
--   · `medicamentos`  — catálogo (nome comercial, fabricante, cota). Referência.
--   · `suplementos`   — idem. São 30 itens que você não vai querer redigitar.
--
-- APAGA (dados de teste):
--   pacientes, triagens, avaliações, anamneses do OBA, assinaturas, pedidos de
--   documento, prescrições emitidas, todas as tabelas de crédito/comissão, os
--   registros de indicação, a trilha de acessos e os estornos do Caixa.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ORDEM: `avaliacoes` tem FK para `profiles` (ON DELETE CASCADE), então sairia
-- junto de qualquer forma — mas apago explicitamente antes, para a contagem
-- final mostrar o que de fato aconteceu em vez de esconder o efeito da cascata.
--
-- Roda tudo numa transação: ou limpa inteiro, ou não mexe em nada.
-- ============================================================================

BEGIN;

-- ── ANTES ────────────────────────────────────────────────────────────────────
SELECT 'ANTES' AS quando, t.tabela, t.n FROM (
  SELECT 'profiles' AS tabela, count(*) AS n FROM public.profiles
  UNION ALL SELECT 'avaliacoes',             count(*) FROM public.avaliacoes
  UNION ALL SELECT 'triagens',               count(*) FROM public.triagens
  UNION ALL SELECT 'oba_anamnese',           count(*) FROM public.oba_anamnese
  UNION ALL SELECT 'assinaturas',            count(*) FROM public.assinaturas
  UNION ALL SELECT 'pedidos_documento',      count(*) FROM public.pedidos_documento
  UNION ALL SELECT 'prescricoes',            count(*) FROM public.prescricoes
  UNION ALL SELECT 'medicos',                count(*) FROM public.medicos
  UNION ALL SELECT 'indicadores',            count(*) FROM public.indicadores
  UNION ALL SELECT 'acessos_paciente',       count(*) FROM public.acessos_paciente
  UNION ALL SELECT '-- PRESERVADAS --',      NULL
  UNION ALL SELECT 'config (preserva)',      count(*) FROM public.config
  UNION ALL SELECT 'medicamentos (preserva)',count(*) FROM public.medicamentos
  UNION ALL SELECT 'suplementos (preserva)', count(*) FROM public.suplementos
) t ORDER BY t.tabela;

-- ── Dinheiro / comissões ─────────────────────────────────────────────────────
DELETE FROM public.abatimentos_paciente;
DELETE FROM public.creditos_indicador;
DELETE FROM public.creditos_medico;
DELETE FROM public.creditos_avaliacao;
DELETE FROM public.caixa_estornos;
DELETE FROM public.indicacoes_precadastro;
DELETE FROM public.encaminhamentos_medico;
DELETE FROM public.indicadores;

-- ── Clínico / paciente ───────────────────────────────────────────────────────
DELETE FROM public.pedidos_documento;
DELETE FROM public.prescricoes;
DELETE FROM public.opiniao_medica;
DELETE FROM public.extratos_oba;
DELETE FROM public.oba_anamnese;
DELETE FROM public.assinaturas;
DELETE FROM public.avaliacoes;          -- antes de profiles (FK)
DELETE FROM public.triagens;
DELETE FROM public.profiles;

-- ── Trilha de auditoria de acesso (médico → paciente) ────────────────────────
DELETE FROM public.acessos_paciente;

-- ── Médicos: fica SÓ o admin ─────────────────────────────────────────────────
-- Cinto de segurança: só apaga quem NÃO é admin. Se um dia o CRM do admin
-- mudar, esta linha continua certa — a régua é a flag, não o número do CRM.
DELETE FROM public.medicos WHERE COALESCE(is_admin, false) = false;

-- ── DEPOIS ───────────────────────────────────────────────────────────────────
-- Tudo tem de estar em 0, menos: medicos = 1 (o admin), config = 14,
-- medicamentos = 5, suplementos = 30.
SELECT 'DEPOIS' AS quando, t.tabela, t.n FROM (
  SELECT 'profiles' AS tabela, count(*) AS n FROM public.profiles
  UNION ALL SELECT 'avaliacoes',             count(*) FROM public.avaliacoes
  UNION ALL SELECT 'triagens',               count(*) FROM public.triagens
  UNION ALL SELECT 'oba_anamnese',           count(*) FROM public.oba_anamnese
  UNION ALL SELECT 'assinaturas',            count(*) FROM public.assinaturas
  UNION ALL SELECT 'pedidos_documento',      count(*) FROM public.pedidos_documento
  UNION ALL SELECT 'prescricoes',            count(*) FROM public.prescricoes
  UNION ALL SELECT 'medicos (so o admin)',   count(*) FROM public.medicos
  UNION ALL SELECT 'indicadores',            count(*) FROM public.indicadores
  UNION ALL SELECT 'acessos_paciente',       count(*) FROM public.acessos_paciente
  UNION ALL SELECT '-- PRESERVADAS --',      NULL
  UNION ALL SELECT 'config (preserva)',      count(*) FROM public.config
  UNION ALL SELECT 'medicamentos (preserva)',count(*) FROM public.medicamentos
  UNION ALL SELECT 'suplementos (preserva)', count(*) FROM public.suplementos
) t ORDER BY t.tabela;

-- Confere que o admin sobreviveu. Tem de voltar 1 linha, com is_admin = true.
SELECT crm, nome, is_admin, plataforma, validado FROM public.medicos;

COMMIT;

-- Se algo acima parecer errado, troque COMMIT por ROLLBACK e rode de novo.
