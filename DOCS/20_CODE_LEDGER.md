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
| 019 | 2026-06-02 | Solicitação CFM com 2 receitas + contador de cota | Phase 2 | DEC-007 | `gerarSolicitacaoCFM` monta a conduta de ferro EV com as 2 marcas ativas (dose de Ganzoni → frascos/sessões); `prescricoes_emitidas++` ao copiar o documento (1×/ficha), só quando há indicação de ferro EV (exclui SOBRECARGA). Helpers `calcReceita`/`primeiroNumero` movidos p/ `ferroProtocol.js` (fonte única). |
| 020 | 2026-06-02 | Segurança — auth do médico via RPC (bcrypt) | Phase 2 | DEC-008 | `migrate_medico_auth.sql`: RPCs `register_medico`/`login_medico`/`complete_medico` (bcrypt, retorno {ok,id,nome,crm,is_admin,erro}) + coluna `is_admin`. Calculator e LandingPage (caixa do hero) cortados para as RPCs; `senha_klipbit` eliminado do cliente. Falta: auth do admin, RLS gateway, versionar RPCs de paciente. |
| 021 | 2026-06-02 | Segurança — admin exige is_admin | Phase 2 | DEC-008 | App.jsx: painel admin (5 cliques) só abre se `medico_is_admin` no localStorage (vem do login_medico); senão mostra "Acesso restrito". Flag limpo em todos os logouts. Trava acesso casual; proteção forte dos dados vem no RLS gateway. |
| 022 | 2026-06-03 | Fix — entrada do painel admin (botão na landing) | Phase 2 | DEC-008 | Os "5 cliques" ficaram órfãos (logo na hero antiga, substituída pela LandingPage) → admin inacessível. Novo botão ⚙️ Admin no chip "LOGADO MÉDICO" da navbar, visível só se `medico_is_admin`; prop `onModoAdmin` → setModo('admin'). |
| 023 | 2026-06-03 | Segurança — versionar RPCs de paciente | Phase 2 | DEC-008 | `functions_paciente.sql`: register_paciente/login_paciente/lookup_cpf_triagem capturadas verbatim do Supabase (estavam só no banco). Confirmado bcrypt no paciente. Só versionamento (já existem no banco); fonte da verdade para o RLS gateway. |

---

## Current Status

**Active Phase:** Phase 2 — Build out

**Handoff (2026-06-02, fim de sessão):**
Sessão entregou 3 frentes (commits 014–021, tudo em `main`/produção):
1. **Ferro EV por Ganzoni** com peso real (DEC-006) — `ferroProtocol.js`, peso no Calculator (coluna `peso` em avaliacoes/triagens via `migrate_add_peso.sql`).
2. **Catálogo de medicamentos patrocinado** (DEC-007) — tabela `medicamentos` + aba 💊 no admin + modal/CFM com 2 receitas (alta_dose × dose_fracionada) + contador de cota. `migrate_add_medicamentos.sql`.
3. **Segurança DEC-008** — auth do médico via RPC com **bcrypt** (`migrate_medico_auth.sql`: register/login/complete_medico) e painel admin exige `is_admin`. `senha_klipbit` fora do cliente.

**⏳ AGUARDANDO TESTE DO ESTÁCIO** (migration + `DELETE FROM medicos` já rodados; push feito):
1. Re-cadastrar `6302/BA` pelo app; depois `UPDATE medicos SET is_admin=true WHERE crm='6302/BA';`
2. Testar login de médico (caixa do hero + Calculator) e painel admin (logado como 6302/BA → 5 cliques).

**Next Action (DEC-008 — continuar):**
- **RLS gateway** (grande/arriscado, fazer em staging): ligar RLS + converter acessos diretos a `medicos`/`avaliacoes`/`triagens`/`config` para RPC. Há SELECTs/UPDATE diretos em `medicos` no Calculator (749, 855, 901, 1206, 1494, 2042/2052/2105) e LandingPage (768).
- **Versionar no repo** as RPCs de paciente (`login_paciente`/`register_paciente`/`lookup_cpf_triagem`) — hoje só no Supabase. (register_paciente já capturado no histórico do chat; usa bcrypt — paciente está seguro.)

**Pendências de produto (backlog):** peso no fluxo do paciente (TriagemModal→triagens, coluna já existe); rotação por cota do catálogo (campos prontos); UI split Lab/Imagem no ResultCard.

**Blocking Items:** Nenhum. (Dívida: RLS ainda desabilitado — DEC-002/DEC-008; admin gate é client-side até o RLS gateway.)

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
