---
title: Code Ledger
type: code-ledger
status: active
version: "1.0"
updated: "2026-05-31"
---

# RedFairy — Code Ledger

> **Propósito:** log append-only de mudanças relevantes em nível de feature — O QUE foi construído.
> **Regra:** uma linha após concluir um entregável. Nunca editar/apagar linhas antigas.
> Detalhe em nível de commit → ver histórico do git.

---

## Ledger Entries

| # | Date | Feature | Phase / Milestone | Decision Ref | Summary |
|---|------|---------|-------------------|--------------|---------|
| 001 | 2026-05-31 | Product OS adotado | Phase 2 | DEC-001 | Estrutura `/DOCS` preenchida a partir do código real (PRD, rules, roadmap, ledger, decision log) |
| 002 | até 2026-05-30 | **Baseline — estado existente** | Phases 1–2 | — | Motor de decisão (matrizes M/F, achados paralelos, triagem parcial), contas médico/paciente, histórico+gráficos, crítica de exames antigos, separação Lab/Imagem no engine, Projeto OBA (engine+cutoffs+modal). App em produção em redfairy.bio. |

---

## Current Status

**Active Phase:** Phase 2 — Build out
**Next Action:** UI do split Lab/Imagem no ResultCard (+ geração de pedidos de imagem separados). OBA segue evoluindo em paralelo.
**Blocking Items:** Nenhum. (Dívida aberta: RLS desabilitado no Supabase — ver DEC-002.)

---

## How to add an entry

```
| [#] | [YYYY-MM-DD] | [Feature] | Phase [X] | [Decision ref ou —] | [resumo de uma linha do que entrou] |
```

**Regras:**
1. Uma linha por feature / unidade lógica de trabalho.
2. Adicionar DEPOIS de o trabalho estar commitado.
3. Referenciar a fase do `03_ROADMAP.md`.
4. Se mudou regra/escopo, o PORQUÊ vai em `90_DECISION_LOG.md` e é referenciado aqui.
5. Append-only — nunca reescrever histórico. Atualizar "Current Status" a cada sessão.
