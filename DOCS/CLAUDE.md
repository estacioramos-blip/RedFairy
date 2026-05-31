# RedFairy — Claude Code Instructions

Você está trabalhando no **RedFairy** — plataforma médica de triagem hematológica
(rastreio do eritron / metabolismo do ferro). **Stack:** React 19 + Vite 8 + Tailwind 3.4 + Supabase.

> Este projeto roda num **Product OS**: `/DOCS` é a única fonte da verdade (SSOT).
> Código segue docs. **Se não está em `/DOCS`, não construa.**
>
> Há também um `CLAUDE.md` na **raiz do repositório** com o contexto de domínio detalhado
> (motor, matrizes, tipos de usuário, OBA, armadilhas). Leia-o antes de mexer no engine.

---

## SOURCE OF TRUTH (leia só o que a tarefa precisa)

Nunca pré-carregue todos os docs — desperdiça contexto. Leia o UM arquivo relevante:

- `DOCS/01_PRD.md` — o que construímos, escopo (LOCKED por versão)
- `DOCS/02_PRODUCT_RULES.md` — regras não-negociáveis de tech / segurança / design
- `DOCS/03_ROADMAP.md` — fases + o que vem
- `DOCS/20_CODE_LEDGER.md` — log append-only do que foi construído
- `DOCS/90_DECISION_LOG.md` — PORQUÊ das decisões (ler antes de mudar estratégia)

---

## NO DRIFT (a disciplina central)

1. Não construir features fora do escopo do `01_PRD.md`.
2. Se um pedido **conflita** com os docs → PARE e proponha a mudança no doc PRIMEIRO. Não construa em silêncio.
3. Mudando regra/preço/escopo/stack? A ordem é sempre: **(1) editar o doc + bump de `version`, (2) entrada no `90_DECISION_LOG.md` com o PORQUÊ, (3) SÓ ENTÃO o código.** Nunca código primeiro.
4. Na dúvida, releia `02_PRODUCT_RULES.md`.

---

## DOCUMENTATION SYNC RULE

Uma mudança de código que altere comportamento visível ao usuário DEVE, na **mesma mudança**:
- Atualizar o(s) arquivo(s) de `/DOCS` relevante(s)
- Adicionar uma linha em `DOCS/20_CODE_LEDGER.md` (append-only, nunca editar linhas antigas)
- Adicionar entrada em `DOCS/90_DECISION_LOG.md` se mudou regra/escopo/estratégia
- Marcar o milestone **Done** em `DOCS/03_ROADMAP.md` se completou um

Persistir decisões **conforme acontecem**, não em lote no fim — a sessão pode ser interrompida a qualquer momento.

---

## SEGURANÇA (NON-NEGOTIABLE)

- **Nunca commitar segredos.** `.env*` gitignored. Chaves em env vars / secret store, nunca no código.
- **Sem fallback de segredo:** nunca `process.env.SECRET || "fallback"` — falhar se faltar.
- **Chaves de API são backend-only** — nunca no bundle do browser.
- Toda mutação de API: rate limiting → auth check → validação, nessa ordem.
- ⚠️ **RLS está DESABILITADO** nas tabelas principais do Supabase — dívida conhecida (ver `02_PRODUCT_RULES.md` Rule 2 e `90_DECISION_LOG.md` DEC-002). Não documentar como se estivesse ligado.

### Account / deploy safety (verificar a cada sessão antes de deploy/env/infra)

| Service | Expected account | Verify command |
|---------|------------------|----------------|
| GitHub | `estacioramos-blip` (repo `estacioramos-blip/RedFairy`) | `gh auth status` |
| Vercel | ⚠️ A PREENCHER (`npx vercel whoami`) | `npx vercel whoami` |

**Vercel project IDs:** deploy é via **integração GitHub→Vercel** (push em `main`), não pelo CLI local — não há `.vercel/project.json` na máquina. orgId/projectId ficam no dashboard da Vercel (preencher se algum dia usar o CLI).
**Qualquer divergência → PARE e avise o Estácio.** (Conta errada = deploy no projeto errado ou vazamento de env vars.)

> Na prática, o deploy hoje é por **push em `main` → Vercel auto-deploy → redfairy.bio**.

---

## ENGENHARIA ("Parceria Tango")

- Mudança mínima — preservar APIs e padrões já existentes. Imitar o estilo do código ao redor.
- Production-ready — sem `TODO` por implementar.
- Uma mudança lógica → um commit.
- Build local TEM que passar antes de qualquer deploy: `npm run build`. Se falhar, NÃO deployar.
- **Mostre o diff e espere confirmação antes de `git commit` / `git push`.**

---

## SESSION CLOSE PROTOCOL (rodar em TODO fim de sessão)

Quando o Estácio disser "tchau / pronto / fechar / é isso" — ou antes de parar:

1. **Sincronizar estado** — atualizar "Current Status" em `DOCS/00_INDEX.md` / `20_CODE_LEDGER.md`: data de hoje, o que entrou, próxima prioridade. Remover o que ficou obsoleto.
2. **Roadmap** — marcar milestone **Done** em `03_ROADMAP.md` se completou; sinalizar se a prioridade desviou.
3. **Ledger** — garantir uma linha em `20_CODE_LEDGER.md` para cada feature da sessão.
4. **Decision log** — garantir que mudança de regra/escopo/estratégia foi capturada em `90_DECISION_LOG.md`.
5. **Commit & push** — após OK do Estácio, stage (código + docs), commit claro, push. Não deixar trabalho solto.
6. **Handoff note** — 3–5 linhas no topo do Current Status para a próxima sessão retomar sem re-descoberta.

---

## SESSION START

Em sessão nova ou retomada, antes de escrever código: ler o "Status / handoff note",
checar mudanças não-commitadas, e confirmar a prioridade do dia com o Estácio.

**Se não está em `/DOCS`, não construa.**
