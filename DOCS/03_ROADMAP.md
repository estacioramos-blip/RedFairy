---
title: Roadmap
type: roadmap
status: active
version: "1.0"
updated: "2026-05-31"
---

# RedFairy — Roadmap

> Sequência estratégica de entrega. Fonte da verdade para "o que vem agora".
> Quando um milestone for entregue, marque **Done** aqui na MESMA sessão.

---

## Guiding Principles

1. Triagem confiável primeiro — o motor de decisão é o coração do produto.
2. Fidelidade clínica antes de novas features (refinar algoritmo é o objetivo de fundo).
3. Conversão paciente (logado → cadastrado) e valor pro médico afiliado guiam o crescimento.

---

## Phase 1 — Core / MVP em produção
**Status:** ✅ COMPLETE

| Milestone | Description | Status |
|-----------|-------------|--------|
| Motor de decisão | `avaliarPaciente` + matrizes M/F + achados paralelos | ✅ |
| Triagem parcial | `triagemEritron()` (sem ferritina/saturação) | ✅ |
| Contas | Médico (CRM/UF, afiliado 4DOC) + paciente logado/cadastrado | ✅ |
| Deploy | Vercel → redfairy.bio | ✅ |

---

## Phase 2 — Build out
**Status:** 🟡 IN PROGRESS

| Milestone | Description | Status |
|-----------|-------------|--------|
| Histórico + gráficos | PatientDashboard + HistoricoChartModal | ✅ |
| Crítica de exames antigos | `getFraseData` por faixas de dias + cores por gravidade | ✅ |
| Separação Lab/Imagem (engine) | `proximosExamesLab` / `proximosExamesImagem` | ✅ |
| Projeto OBA | Sub-algoritmo bariátricos (engine + modal + cutoffs) | 🟡 evoluindo |
| **UI do split Lab/Imagem** | ResultCard ainda mostra tudo junto; falta UI + geração de pedidos de imagem separados | ⬜ |

---

## Phase 3 — Crescimento / conversão
**Status:** ⬜ NOT STARTED

| Milestone | Description | Status |
|-----------|-------------|--------|
| Cadastro oportunista | Oferecer registro antes de finalizar pedido gratuito | ⬜ |
| Regra afiliados-paciente | Créditos 4DOC | ⬜ |
| Métricas / analytics | Definir e instrumentar KPIs do PRD | ⬜ |

---

## Phase 4 — Refinamento contínuo (ongoing)
**Status:** 🟡 ongoing

- [ ] Refinamento geral do algoritmo (fidelidade clínica) — objetivo principal de fundo
- [ ] Endurecer segurança: avaliar reativar RLS no Supabase (ver Decision Log)

---

**Last Updated:** 2026-05-31 · **Current Phase:** 2 (Build out)
