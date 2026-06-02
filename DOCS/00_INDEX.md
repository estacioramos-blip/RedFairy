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
**Next Action:** Refino do algoritmo — mapear gaps/discrepâncias da matriz (em curso). Pendente: UI do split Lab/Imagem no ResultCard. OBA evoluindo.
**Blocking Items:** Nenhum. Dívida aberta: RLS desabilitado no Supabase (decisão DEC-002).

**Handoff note (2026-06-02):** Última sessão entregou (tudo commitado/pushado, último commit `3ea1711`):
validação de datas — **sem data futura em nenhum campo** + limites de idade (**>120 rejeita, ≥100 confirma**)
[DEC-005]; **nomes em caixa alta**; fix do **bariátrico vazando** no Calculator; **formato + seamless** dos
campos Hb/VCM/RDW; **ferritina ♂ 336→300** (DEC-003); **novo fluxo OBA** (DEC-004); auditoria de inputs
órfãos do OBA; redesign da Landing + ajustes de design (popup LEIA MAIS pink, COMO FUNCIONA, COMEÇAR laranja).
**Pendente p/ retomar:** (1) **mapear gaps/discrepâncias da matriz** — tema de fundo que o Estácio quer atacar;
(2) Estácio ia **revisar a consistência do fluxo** em produção (testar datas/idade/nomes); (3) **UI do split
Lab/Imagem** no ResultCard. ⚠️ Confirmar com o Estácio o threshold "**idade ≥ 100 confirma**" (interpretado do "1000").

**Last Updated:** 2026-06-02
