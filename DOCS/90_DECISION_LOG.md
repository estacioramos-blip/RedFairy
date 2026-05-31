---
title: Decision Log
type: decision-log
status: active
version: "1.0"
updated: "2026-05-31"
---

# RedFairy — Decision Log

> Registra o **PORQUÊ** de decisões importantes — para que o futuro-você (e o Claude) nunca
> re-litiguem questões já resolvidas nem se afastem delas sem querer.
>
> **Gatilhos** (qualquer um → registrar): direção de produto, mudança de escopo, preço/taxa,
> modelo de negócio, escolha de stack, postura de segurança, mudança de regra, ou qualquer coisa
> que contradiga uma decisão anterior. Entrada mais nova no topo.

---

## 2026-05-31 — DEC-002 — RLS do Supabase mantido DESABILITADO (por ora)

**Decisão:** Manter o Row-Level Security desligado nas tabelas principais do Supabase no V1.0.

**Razão:**
- É o estado atual do projeto em produção; ligar RLS agora exigiria escrever policies para todas
  as tabelas e revalidar todos os fluxos de leitura/escrita do app — risco de quebrar produção.
- Documentar honestamente o estado real vale mais do que um doc aspiracional que mente.

**Impacto:**
- `02_PRODUCT_RULES.md` (Rule 2) registra isso como **dívida de segurança conhecida**.
- Roadmap Phase 4 inclui "avaliar reativar RLS".
- Antes de qualquer endpoint público novo que toque essas tabelas → reavaliar.

**Supersedes:** — (ajusta a regra genérica "RLS sempre ligado" do template do Product OS)

---

## 2026-05-31 — DEC-001 — Adoção do Product OS sobre código existente

**Decisão:** Adotar o workflow Product OS (pasta `/DOCS` como SSOT) no RedFairy, que já estava em produção.

**Razão:**
- Reduzir drift entre código e documentação; dar ao Claude Code um ponto de partida confiável a cada sessão.
- O Estácio não é programador de formação — docs claros em PT-BR diminuem re-descoberta e erro.

**Impacto:**
- `/DOCS` preenchido a partir do código real (não reconstruindo histórico completo — baseline + daqui pra frente).
- Stack confirmado: React 19 + Vite 8 + Tailwind 3.4 + Supabase; **JSX/JS, não TypeScript** (corrige suposição do template).
- Produto é **PT-BR sem i18n** (corrige suposição do template).
- A partir de agora: code follows docs; sync a cada mudança; protocolo de fechamento de sessão.

**Supersedes:** —

---

## Template (copiar para cada nova decisão)

```
## [YYYY-MM-DD] — [DEC-XXX] — [Título da decisão]

**Decisão:** [o que foi decidido]

**Razão:**
- [porquê]

**Impacto:**
- [o que muda em produto, docs ou código]

**Supersedes:** [link para decisão anterior se sobrescreve, senão "—"]
```
