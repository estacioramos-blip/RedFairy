-- =============================================================================
-- reset_banco_teste.sql  —  RESET de dados para novos testes
-- =============================================================================
-- O QUE FAZ:
--   * Esvazia todas as tabelas de PACIENTES e dados transacionais
--     (libera os CPFs já usados para repetir testes do zero).
--   * Apaga todos os MÉDICOS, EXCETO o administrador (is_admin = true),
--     ou seja, preserva o ESTÁCIO 6302/BA com o acesso ao painel admin.
--   * PRESERVA o catálogo/configuração: config, medicamentos, suplementos.
--
-- COMO USAR:
--   Supabase Dashboard -> SQL Editor -> cole tudo -> Run.
--   É uma transação (BEGIN/COMMIT): ou aplica tudo, ou nada.
--   Para abortar depois de ver a conferência, troque COMMIT; por ROLLBACK;
--
-- ATENÇÃO: NÃO toca em auth.users (contas de autenticação ficam intactas).
-- =============================================================================

BEGIN;

-- 1) Zera pacientes e tudo ligado a eles (mantém config/medicamentos/suplementos).
-- Dirigido por LISTA: tabela que não existe mais é ignorada (e avisada) em vez
-- de abortar o reset inteiro — foi o que 'creditos_medico' fez depois da reforma
-- do CFM (set/2026). Um TRUNCATE só, para o CASCADE valer sobre o conjunto.
DO $reset$
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

  EXECUTE 'TRUNCATE TABLE ' || array_to_string(existentes, ', ') || ' RESTART IDENTITY CASCADE';

  IF array_length(ausentes, 1) IS NOT NULL THEN
    RAISE NOTICE 'Ignoradas (não existem neste banco): %', array_to_string(ausentes, ', ');
  END IF;
END
$reset$;

-- 2) Apaga todos os médicos EXCETO o administrador (você).
DELETE FROM public.medicos
WHERE is_admin IS NOT TRUE;

-- 3) Conferência: deve mostrar "medicos restantes = 1" e o resto = 0.
-- Deve dar medicos = 1 (o admin) e o resto 0, fora config/medicamentos/suplementos.
SELECT t.tabela,
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

COMMIT;
