-- ============================================================
-- migrate_rls_suplementos.sql  (DEC-010 — RLS para `suplementos`)
--
-- A tabela `suplementos` ficou com RLS LIGADO porém SEM políticas — efeito:
-- a chave anônima NÃO lê (catálogo some) e NÃO escreve (Salvar do admin quebra),
-- mesmo com os dados presentes (o seed entrou via papel privilegiado no SQL Editor).
--
-- Esta migração dá à `suplementos` o MESMO tratamento da Fase 1 da `medicamentos`:
--   • leitura PÚBLICA (catálogo aparece no admin e no app)
--   • escrita só-admin via RPC `salvar_suplemento` (SECURITY DEFINER + token_admin_ok)
--
-- A função SECURITY DEFINER roda como owner (postgres) e fura o RLS de forma
-- controlada — por isso a escrita admin funciona com o RLS ligado.
--
-- Aditivo e idempotente: CREATE OR REPLACE FUNCTION + DROP POLICY IF EXISTS.
-- ============================================================

-- Atualiza um suplemento do catálogo (só admin). p_dados = jsonb com os campos.
CREATE OR REPLACE FUNCTION public.salvar_suplemento(
  p_crm text, p_token text, p_id bigint, p_dados jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  UPDATE public.suplementos SET
    fabricante      = p_dados->>'fabricante',
    principio_ativo = p_dados->>'principio_ativo',
    concentracao    = p_dados->>'concentracao',
    posologia       = p_dados->>'posologia',
    via             = p_dados->>'via',
    apresentacao    = p_dados->>'apresentacao',
    composicao      = p_dados->>'composicao',
    indicacao       = p_dados->>'indicacao',
    observacoes     = p_dados->>'observacoes',
    ativo           = COALESCE((p_dados->>'ativo')::boolean, false)
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.salvar_suplemento(text,text,bigint,jsonb) TO anon, authenticated;

-- RLS: leitura pública (catálogo), escrita negada (vai pela RPC acima) -----------
ALTER TABLE public.suplementos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supl_public_read ON public.suplementos;
CREATE POLICY supl_public_read ON public.suplementos FOR SELECT USING (true);
