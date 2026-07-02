-- =============================================================================
-- migrate_limpar_teste_4doc.sql   (LIMPEZA de teste + ZERA o 4DOC do 6302/BA)
-- =============================================================================
-- Rodar no Supabase → SQL Editor. Igual ao migrate_limpar_teste.sql, MAS também
-- limpa cep/cpf/pix/titular do médico 6302/BA (mantendo ele como admin) — assim o
-- onboarding 4DOC + o titular do PIX REAPARECEM. Use este pra RE-TESTAR o 4DOC do médico.
-- NÃO toca em config/preços, medicamentos, suplementos.
-- =============================================================================

DELETE FROM public.creditos_avaliacao;
DELETE FROM public.creditos_medico;
DELETE FROM public.creditos_indicador;
DELETE FROM public.assinaturas;

DELETE FROM public.oba_anamnese;
DELETE FROM public.avaliacoes;
DELETE FROM public.triagens;
DELETE FROM public.prescricoes;
DELETE FROM public.pedidos_documento;
DELETE FROM public.extratos_oba;

DELETE FROM public.encaminhamentos_medico;
DELETE FROM public.indicacoes_precadastro;
DELETE FROM public.opiniao_medica;

DELETE FROM public.profiles;
DELETE FROM public.indicadores;
DELETE FROM public.medicos WHERE crm <> '6302/BA';

-- Zera o 4DOC do 6302/BA (mantém CRM/nome/senha/admin) → onboarding 4DOC reaparece.
UPDATE public.medicos
   SET cep = NULL, cpf = NULL, pix_chave = NULL,
       pix_titular = NULL, pix_titular_pj = false, pix_cnpj = NULL, usa_telegram = false
 WHERE crm = '6302/BA';
