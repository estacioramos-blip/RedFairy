-- =============================================================================
-- migrate_limpar_teste.sql   (LIMPEZA de dados de teste)
-- =============================================================================
-- Rodar no Supabase Dashboard → SQL Editor quando quiser zerar os testes.
--
-- APAGA os dados de teste (pacientes, indicadores, avaliações, créditos, reservas…),
-- PRESERVA o médico de teste 6302/BA (admin) e NÃO toca em config/preços nem nas
-- tabelas de referência (medicamentos, suplementos).
--
-- OBS.: as colunas novas (sexo, email, pix_titular, etc.) somem junto com as linhas —
-- não precisam de limpeza própria.
-- =============================================================================

-- Créditos primeiro (referenciam assinaturas/médicos/indicadores) --------------
DELETE FROM public.creditos_avaliacao;
DELETE FROM public.creditos_medico;
DELETE FROM public.creditos_indicador;
DELETE FROM public.assinaturas;

-- Dados clínicos / documentos --------------------------------------------------
DELETE FROM public.oba_anamnese;
DELETE FROM public.avaliacoes;
DELETE FROM public.triagens;
DELETE FROM public.prescricoes;
DELETE FROM public.pedidos_documento;
DELETE FROM public.extratos_oba;

-- Reservas / vínculos / opinião ------------------------------------------------
DELETE FROM public.encaminhamentos_medico;
DELETE FROM public.indicacoes_precadastro;
DELETE FROM public.opiniao_medica;

-- Contas (apagar por último) ---------------------------------------------------
DELETE FROM public.profiles;
DELETE FROM public.indicadores;

-- MÉDICOS: apaga todos MENOS o 6302/BA (preserva o admin de teste). ------------
-- Se quiser zerar TODOS os médicos, troque por:  DELETE FROM public.medicos;
DELETE FROM public.medicos WHERE crm <> '6302/BA';

-- =============================================================================
-- OPCIONAL — para RE-TESTAR o onboarding 4DOC + titular do PIX do 6302/BA:
-- ele precisa estar SEM cep/cpf/pix (senão o 4DOC é pulado). Descomente:
-- =============================================================================
-- UPDATE public.medicos
--    SET cep = NULL, cpf = NULL, pix_chave = NULL,
--        pix_titular = NULL, pix_titular_pj = false, pix_cnpj = NULL, usa_telegram = false
--  WHERE crm = '6302/BA';

-- =============================================================================
-- NÃO apagar (dados de referência / configuração):
--   config, medicamentos, suplementos, medicos_prescritores, leads_comerciais
-- (se quiser zerar captações do site, apague medicos_prescritores/leads_comerciais à mão)
-- =============================================================================
