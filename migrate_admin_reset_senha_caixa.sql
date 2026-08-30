-- =============================================================================
-- migrate_admin_reset_senha_caixa.sql   (ago/2026 — recuperação da senha do Caixa)
-- =============================================================================
-- RODAR NO SUPABASE DASHBOARD -> SQL EDITOR (revisar antes).
--
-- PROBLEMA: a senha da Tesouraria vive como hash bcrypt em config.caixa_senha_hash.
-- Quem está DENTRO do Caixa pode trocá-la (caixa_trocar_senha), mas não existia
-- nenhum caminho de volta: senha trocada e esquecida = Caixa inacessível para
-- sempre, sem passar pelo SQL Editor. Foi exatamente o que aconteceu.
--
-- SOLUÇÃO: o ADMIN (dono da plataforma) redefine a senha do Caixa pelo painel.
-- É a hierarquia natural — quem responde pelo dinheiro destrava o tesoureiro —
-- e evita a alternativa comum, um "link de recuperação" por e-mail: link de
-- reset da senha do dinheiro circulando por caixa de entrada é superfície de
-- ataque nova, e a plataforma nem envia e-mail hoje.
--
-- A senha nunca trafega em texto fora do HTTPS nem fica no cliente: chega aqui e
-- é gravada já como hash bcrypt, igual ao caixa_trocar_senha.
--
-- Guarda: token_admin_ok (CRM + token de sessão do admin, migrate_token_sessao.sql).
-- Sem ela, qualquer um com a anon key redefiniria a senha da Tesouraria.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_resetar_senha_caixa(p_crm text, p_token text, p_nova text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
BEGIN
  IF NOT public.token_admin_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  IF coalesce(length(p_nova),0) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Senha muito curta (minimo 6)');
  END IF;

  -- INSERT/ON CONFLICT (e não UPDATE puro como o caixa_trocar_senha): se a linha
  -- do hash sumir do config, o UPDATE não faria nada e devolveria "ok" sem ter
  -- gravado — o Caixa continuaria trancado e ninguém saberia por quê.
  INSERT INTO public.config (chave, valor)
  VALUES ('caixa_senha_hash', crypt(p_nova, gen_salt('bf', 10)))
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

  -- Derruba a sessão aberta do Caixa. Sem isso, quem estava logado com a senha
  -- antiga continuaria dentro por até 7 dias (o token vive no config e não
  -- depende da senha) — e o reset viraria teatro.
  DELETE FROM public.config WHERE chave IN ('caixa_token_hash', 'caixa_token_exp');

  -- Rastro de quem destravou a Tesouraria e quando. É a única chave do acesso ao
  -- dinheiro que pode ser trocada por terceiro; sem registro, um reset indevido
  -- (token de admin roubado) não deixaria pegada nenhuma. As chaves começam com
  -- 'caixa' — logo, ficam fora da leitura anon (migrate_fix_config_segredos.sql).
  INSERT INTO public.config (chave, valor, descricao) VALUES
    ('caixa_senha_reset_por', upper(btrim(coalesce(p_crm,''))), 'CRM do admin que redefiniu a senha da Tesouraria'),
    ('caixa_senha_reset_em',  now()::text,                      'Quando a senha da Tesouraria foi redefinida pelo admin')
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_resetar_senha_caixa(text,text,text) TO anon, authenticated;

-- Faz o PostgREST enxergar a função nova na hora (sem isso, a chamada do painel
-- pode responder "function not found" até o schema recarregar sozinho).
NOTIFY pgrst, 'reload schema';
