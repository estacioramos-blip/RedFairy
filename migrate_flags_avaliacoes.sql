-- ============================================================
-- migrate_flags_avaliacoes.sql
--
-- O formulario do paciente coleta varias flags de Historico Clinico e
-- Medicamentos/Suplementos que NAO eram gravadas (faltavam colunas). Sem isso,
-- ao voltar para uma nova avaliacao as marcacoes vinham vazias.
--
-- Adiciona as colunas que faltam (boolean, default false). IF NOT EXISTS =>
-- nao mexe nas que ja existem. Idempotente.
-- ============================================================

ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS alcoolista        boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS transfundido      boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS anemia_previa     boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS sideropenia       boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS sobrecarga_ferro  boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS hb_alta           boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS doador_sangue     boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS celiaco           boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS g6pd              boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS testosterona      boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS tiroxina          boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS methotrexato      boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS hiv_tratamento    boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS hidroxiureia      boolean NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS anticonvulsivante boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
