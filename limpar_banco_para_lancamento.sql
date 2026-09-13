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
SELECT 'ANTES' AS quando, t.tabela,
       (xpath('/row/c/text()', query_to_xml(
          format('SELECT count(*) AS c FROM public.%I', t.tabela),
          false, true, '')))[1]::text::bigint AS n
FROM (VALUES
  ('profiles'),('avaliacoes'),('triagens'),('oba_anamnese'),('assinaturas'),
  ('pedidos_documento'),('prescricoes'),('medicos'),('indicadores'),
  ('acessos_paciente'),('autorizacoes_acesso'),('oba_origem'),
  ('config'),('medicamentos'),('suplementos')
) AS t(tabela)
-- tabela que não existe neste banco simplesmente não aparece, em vez de
-- derrubar a conferência inteira.
WHERE to_regclass('public.' || t.tabela) IS NOT NULL
ORDER BY t.tabela;

-- ── O que é apagado, na ordem (FK primeiro) ─────────────────────────────────
-- Dirigido por LISTA, e não por uma linha de DELETE por tabela, porque o schema
-- muda: 'creditos_medico' existia e a reforma do CFM (set/2026) apagou — a linha
-- fixa derrubava o script inteiro e a limpeza não acontecia. Aqui, tabela que
-- não existe é ignorada e AVISADA no fim, em vez de abortar tudo.
DO $limpa$
DECLARE
  alvo       text;
  existentes text[] := '{}';
  ausentes   text[] := '{}';
  ordem      text[] := ARRAY[
    -- dinheiro / comissões
    'abatimentos_paciente', 'creditos_indicador', 'creditos_avaliacao',
    'caixa_estornos', 'indicacoes_precadastro', 'encaminhamentos_medico',
    'indicadores',
    -- clínico / paciente
    'pedidos_documento', 'prescricoes', 'opiniao_medica', 'extratos_oba',
    'oba_anamnese', 'assinaturas', 'avaliacoes', 'triagens', 'profiles',
    -- trilha de auditoria e consentimento
    'acessos_paciente',
    -- ⚠ AUTORIZAÇÃO DE ACESSO AO PRONTUÁRIO (13/09/2026) — apagar é OBRIGATÓRIO.
    -- A autorização é chaveada pelo CPF. Se sobreviver a uma limpeza e o mesmo
    -- CPF for cadastrado de novo, ela RESSUSCITA: o novo titular passa a ter um
    -- médico autorizado que nunca autorizou. Consentimento não se herda.
    'autorizacoes_acesso',
    -- origem de marketing: também chaveada por CPF, e é PII
    'oba_origem',
    -- leads do site
    'leads_comerciais'
  ];
BEGIN
  FOREACH alvo IN ARRAY ordem LOOP
    IF to_regclass('public.' || alvo) IS NULL
      THEN ausentes   := ausentes   || alvo;
      ELSE existentes := existentes || format('public.%I', alvo);
    END IF;
  END LOOP;

  FOREACH alvo IN ARRAY existentes LOOP
    EXECUTE 'DELETE FROM ' || alvo;
  END LOOP;

  IF array_length(ausentes, 1) IS NOT NULL THEN
    RAISE NOTICE 'Ignoradas (não existem neste banco): %', array_to_string(ausentes, ', ');
  END IF;
END
$limpa$;

-- ── Médicos: fica SÓ o admin ─────────────────────────────────────────────────
-- Cinto de segurança: só apaga quem NÃO é admin. Se um dia o CRM do admin
-- mudar, esta linha continua certa — a régua é a flag, não o número do CRM.
DELETE FROM public.medicos WHERE COALESCE(is_admin, false) = false;

-- ── DEPOIS ───────────────────────────────────────────────────────────────────
-- Tudo tem de estar em 0, menos: medicos = 1 (o admin), config = 14,
-- medicamentos = 5, suplementos = 30.
SELECT 'DEPOIS' AS quando, t.tabela,
       (xpath('/row/c/text()', query_to_xml(
          format('SELECT count(*) AS c FROM public.%I', t.tabela),
          false, true, '')))[1]::text::bigint AS n
FROM (VALUES
  ('profiles'),('avaliacoes'),('triagens'),('oba_anamnese'),('assinaturas'),
  ('pedidos_documento'),('prescricoes'),('medicos'),('indicadores'),
  ('acessos_paciente'),('autorizacoes_acesso'),('oba_origem'),
  ('config'),('medicamentos'),('suplementos')
) AS t(tabela)
-- tabela que não existe neste banco simplesmente não aparece, em vez de
-- derrubar a conferência inteira.
WHERE to_regclass('public.' || t.tabela) IS NOT NULL
ORDER BY t.tabela;

-- Confere que o admin sobreviveu. Tem de voltar 1 linha, com is_admin = true.
SELECT crm, nome, is_admin, plataforma, validado FROM public.medicos;

COMMIT;

-- Se algo acima parecer errado, troque COMMIT por ROLLBACK e rode de novo.
