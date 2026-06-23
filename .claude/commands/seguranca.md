---
description: Varredura de segurança do RedFairy (segredos, exposição de dados de paciente, Supabase, dependências).
---

Faça uma **varredura de segurança** do RedFairy — app médico em produção. Seja minucioso e prático; escreva em português acessível (o Estácio não é programador). NÃO altere nada — só relate.

Verifique:

1. **Segredos no código.** Procure tokens/chaves hardcoded: `service_role`, `SUPABASE_SERVICE`, `secret`, `apikey`, `password`, `Bearer `, `sk-`, tokens de Vercel/Telegram. A ÚNICA chave do Supabase que pode aparecer no front é a `anon` (pública); a `service_role` NUNCA pode estar no front. (Use Grep.)

2. **Arquivos sensíveis versionados.** Confirme que `.env*`, chaves, dumps e backups estão no `.gitignore` e NÃO foram commitados: `git ls-files | grep -iE 'env|key|secret|backup|dump|\.pem'`.

3. **Exposição de dados de paciente.** Queries Supabase no front que tragam dados de OUTROS pacientes (faltando filtro por `user_id` ou `cpf`); CPF/diagnóstico em `console.log`; dados sensíveis em URL.

4. **Supabase / RLS.** O `CLAUDE.md` indica RLS desabilitado nas tabelas principais — registre o risco e onde o papel `anon` poderia ler/escrever indevidamente (profiles, avaliacoes, triagens, assinaturas, pedidos_documento).

5. **Tokens em URL.** Há token de sessão em link (ex.: atalho da fada `?p=TOKEN&c=CPF`). Avalie o risco de exposição (histórico do navegador, logs).

6. **Dependências.** Rode `npm audit --omit=dev` e resuma as vulnerabilidades **altas/críticas** (sem ruído de dev).

## Saída
- Resumo (quantos 🔴/🟠/🟢).
- Lista por severidade com `arquivo:linha` e a correção recomendada.
- Para cada 🔴, diga o impacto em linguagem clara (o que um atacante conseguiria).
