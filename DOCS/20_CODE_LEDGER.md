---
title: Code Ledger
type: code-ledger
status: active
version: "1.0"
updated: "2026-06-02"
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
| 003 | 2026-06-01 | Redesign da LandingPage | Phase 2 | — | Hero (medalhão circular, comprimidos 3D, hover), paleta pink/cinza alternada, fix do menu mobile (slide), seções centralizadas, máscaras de V.R. por sexo no mockup. |
| 004 | 2026-06-01 | TriagemModal — ajustes mobile | Phase 2 | — | Fontes do topo e dos labels (Hb/VCM/RDW) reduzidas e em linha única; seta em coluna própria; "VOLTAR"/"PREENCHA" sem sobreposição. |
| 005 | 2026-06-01 | OBA — auditoria de inputs órfãos | Phase 2 | — | Conecta PTH/magnésio/cálcio iônico (módulo ósseo-mineral + cutoffs), vacina_covid (imunização) e niacina; flag de Síndrome pós-COVID; corrige 4 ramos mortos de status ósseo/dental. |
| 006 | 2026-06-01 | Fluxo de entrada do Projeto OBA | Phase 2 | DEC-004 | Botão COMEÇAR → popup (8s) → login CPF/senha → triagem com flag bariátrico travado. |
| 007 | 2026-06-01 | Ferritina ♂ teto do normal 336→300 | Phase 4 | DEC-003 | Ajuste coordenado: matriz M, cutoffs OBA, fallback, V.R., gráfico e demo; bandas contíguas; feminino mantido em 150. |
| 008 | 2026-06-01 | Fix: bariátrico vazando no Calculator médico | Phase 2 | DEC-004 | Calculator deixa de herdar `rf_flag` (sinal do paciente OBA); bariátrico no médico só por dado de demo explícito. Corrige paciente novo nascendo marcado bariátrico. |
| 009 | 2026-06-01 | Calculator — campos Hb/VCM/RDW (formato + seamless) | Phase 2 | — | Formato compacto do TriagemModal (Hb em 2 colunas, label nowrap — "(g/dL)" não quebra); auto-salto de cursor Hb→VCM→RDW (por tamanho ou 1,3s), sem travar. |
| 010 | 2026-06-02 | Validação — sem data futura em todos os campos | Phase 2 | DEC-005 | `type=date` com `max=hoje`; máscaras DD/MM/AAAA avisam + limpam + refocam (TriagemModal, Calculator, OBAModal, PatientDashboard, ResultCard, AuthPage). |
| 011 | 2026-06-02 | Validação — idade na data de nascimento | Phase 2 | DEC-005 | Idade > 120 rejeitada; ≥ 100 pede confirmação (Calculator + TriagemModal). |
| 012 | 2026-06-02 | Nomes em caixa alta (médico/paciente) | Phase 2 | — | ResultCard e CompletarPerfilModal convertem nome para maiúsculas; demais já estavam. |
| 013 | 2026-06-02 | Landing — ajustes de design | Phase 2 | — | Popup LEIA MAIS com fundo pink+aros e fonte/cor da seção (continuação); remove "MÉDICOS" solto e reduz entrelinha em COMO FUNCIONA; "COMEÇAR" laranja no OBA. |
| 014 | 2026-06-02 | UI — redesign modais Médico/Afiliados + foco senha + setas | Phase 2 | — | AuthMedico/Afiliados com splash de imagem, campos amarelos, fundo revelável e botão ▶ CONFIRME; foco na senha ao aceitar termos (landing); setas ↑↓ centradas/ampliadas no TriagemResultadoModal. (commit 3c24878) |
| 015 | 2026-06-02 | Ferro EV — Fórmula de Ganzoni com peso real | Phase 2 | DEC-006 | Novo `ferroProtocol.js` (função pura, gestante 11,5); ModalFerroEV usa peso real (pré-preenchido, editável, pede peso se ausente) no lugar de 70 kg fixo; campo Peso no Calculator + coluna `peso` em `avaliacoes`/`triagens` (`migrate_add_peso.sql`). Lado paciente pendente. |
| 016 | 2026-06-02 | Catálogo de medicamentos — schema + seed | Phase 2 | DEC-007 | `migrate_add_medicamentos.sql`: tabela `medicamentos` (classe alta_dose/dose_fracionada, params de infusão, ativo, contador de cota) + seed das 5 drogas EV do Brasil (Ferinject, Monofer, Noripurum, Ferropurum, Sucrofer). Só schema+doc; aba admin e wiring do modal nos próximos passos. |
| 017 | 2026-06-02 | Admin — aba 💊 Medicamentos | Phase 2 | DEC-007 | AdminPage: catálogo por classe, radio p/ marca ativa (uma por classe), edição de parâmetros de infusão e contador; degrada com aviso se a tabela não existir. |
| 018 | 2026-06-02 | Modal ferro EV — 2 receitas do catálogo | Phase 2 | DEC-007 | `ModalFerroEV` lê as marcas ativas (alta_dose + dose_fracionada) e renderiza 2 receitas com frascos/sessões calculados da dose de Ganzoni, no lugar das opções Sacarato/Ferrinject fixas. Falta `gerarSolicitacaoCFM` (2 receitas) + contador na geração do documento. |

---

## Current Status

**Active Phase:** Phase 2 — Build out
**Next Action:** Refino do algoritmo — mapear gaps/discrepâncias da matriz (em curso). Pendente: UI do split Lab/Imagem no ResultCard. OBA evoluindo.
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
