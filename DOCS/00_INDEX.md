# RedFairy — Product OS

> **Framework:** Product OS para Claude Code (método Kelsch)
> **Projeto:** Plataforma médica de triagem hematológica (rastreio do eritron / metabolismo do ferro).
> **Stack:** React 19 + Vite 8 + Tailwind 3.4 + Supabase · Deploy: Vercel → redfairy.bio

---

Esta pasta `/DOCS` é a **única fonte da verdade (SSOT)** do projeto.
Se não está em `/DOCS`, não construa. Código segue docs — nunca o contrário.

## Como ler este OS

1. **01_PRD.md** — O que estamos construindo, para quem, escopo (LOCKED por versão)
2. **02_PRODUCT_RULES.md** — Regras não-negociáveis (tech, segurança, design)
3. **03_ROADMAP.md** — Fases, milestones, status atual
4. **20_CODE_LEDGER.md** — O que foi construído (append-only)
5. **90_DECISION_LOG.md** — PORQUÊ as decisões foram tomadas

> Há também um `CLAUDE.md` na raiz do repositório com o contexto de domínio detalhado
> (tipos de usuário, motor, Supabase, armadilhas). Os dois se complementam.

## Regra de leitura (economiza contexto)

Leia SÓ o arquivo relevante para a tarefa. Nunca pré-carregue todos os docs.
- Mudando regra/preço/escopo? → `02_PRODUCT_RULES.md` + `90_DECISION_LOG.md`
- Conferindo o que vem? → `03_ROADMAP.md`
- Registrando trabalho concluído? → `20_CODE_LEDGER.md`

---

## Current Status

**Phase:** 2 — Build out
**Next Action:** UI do split Lab/Imagem no ResultCard (+ pedidos de imagem separados). Projeto OBA evoluindo em paralelo.
**Blocking Items:** Nenhum. Dívida aberta: RLS desabilitado no Supabase (decisão DEC-002).

**Handoff note (2026-05-31):** Instalado o Product OS e preenchidos os 8 arquivos de `/DOCS`
a partir do código real (commit pendente de OK do Estácio). Trabalho recente foi todo no
Projeto OBA. Próximo foco em aberto: ou continuar OBA, ou atacar a UI do split Lab/Imagem.

**Last Updated:** 2026-05-31
