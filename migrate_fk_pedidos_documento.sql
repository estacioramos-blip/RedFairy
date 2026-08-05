-- ============================================================================
-- migrate_fk_pedidos_documento.sql
--
-- BUG ENCONTRADO ao preparar a limpeza do banco (ago/2026):
--
--     pedidos_documento.user_id  →  FOREIGN KEY REFERENCES auth.users(id)
--
-- Só que este app NÃO usa Supabase Auth: o paciente entra com CPF + token e o
-- perfil dele vive em `public.profiles`. `auth.users` está VAZIA (0 linhas) e
-- vai continuar vazia. A FK é resquício de quando o login era do Supabase.
--
-- Efeito: o pedido GRATUITO de exames (`PatientDashboard.handlePedirExamesSugeridos`)
-- envia `user_id: profile.id` — um id de `public.profiles`, que nunca existe em
-- `auth.users`. A inserção viola a FK e falha SEMPRE. A tabela ter 0 linhas é a
-- confirmação: esse pedido nunca chegou a ser gravado.
--
-- Passou despercebido porque a falha era silenciosa: o `catch` engolia o erro e
-- o WhatsApp abria do mesmo jeito, então na tela parecia ter funcionado. (Desde
-- `migrate_pedidos_documento_rpcs.sql` a RPC devolve `ok:false` e o cliente
-- avisa — foi assim que dava para ver o problema.)
--
-- CORREÇÃO: apontar a FK para `public.profiles(id)`, que é onde o paciente
-- realmente mora — igual ao que `avaliacoes.user_id` já faz
-- (`avaliacoes_user_id_fkey REFERENCES profiles(id) ON DELETE CASCADE`).
--
-- `ON DELETE SET NULL` (e não CASCADE) de propósito: apagar um paciente não deve
-- apagar o registro financeiro do pedido dele. O pedido é comprovante de uma
-- cobrança — o Caixa concilia por ele. Perde o vínculo, não a linha. O `cpf` e o
-- `celular` continuam na própria tabela, então o pedido segue identificável.
--
-- Seguro rodar: a tabela está vazia, nenhuma linha para validar ou migrar.
-- Idempotente.
-- ============================================================================

ALTER TABLE public.pedidos_documento
  DROP CONSTRAINT IF EXISTS pedidos_documento_user_id_fkey;

ALTER TABLE public.pedidos_documento
  ADD CONSTRAINT pedidos_documento_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Confirmação: tem de apontar para public.profiles.
SELECT k.conname, pg_get_constraintdef(k.oid) AS definicao
  FROM pg_constraint k
  JOIN pg_class c ON c.oid = k.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname='public' AND c.relname='pedidos_documento' AND k.contype='f';

NOTIFY pgrst, 'reload schema';
