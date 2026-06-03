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
| 024 | 2026-06-03 | Segurança — plano do RLS gateway (mapeamento) | Phase 2 | DEC-008 | `DOCS/91_RLS_PLAN.md`: mapa dos 74 acessos diretos / 10 tabelas, sensibilidade e proteção por tabela; achado-chave: sem `auth.uid()`, leituras por CPF/CRM são falsificáveis → decidido **token de sessão** (crachá). Ordem: token → Fase 1 (fáceis) → Fase 2 (saúde) → Fase 3 (médico/admin). Só plano, nada ligado. |

---

## Current Status

**Active Phase:** Phase 2 — Build out

**Handoff (2026-06-03, fim de sessão):**
Continuação da frente de **segurança (DEC-008)** + versionamento + plano do RLS (commits 022–024, em `main`/produção):
1. **Auth do médico validada em produção** ✅ — Estácio re-cadastrou o `6302/BA`, rodou `UPDATE ... is_admin=true`, e confirmou: cadastro/login (bcrypt) e painel admin funcionando.
2. **Fix do acesso ao admin** (022) — os "5 cliques" estavam órfãos (hero antiga); agora há botão **⚙️ Admin** no chip "LOGADO MÉDICO" da landing, visível só se `medico_is_admin`. ⚠️ O flag é gravado **no login** — re-cadastrar não basta; tem que `UPDATE is_admin` e **logar de novo**.
3. **RPCs de paciente versionadas** (023) — `functions_paciente.sql` (register/login/lookup, todas bcrypt confirmado).
4. **Plano do RLS gateway** (024) — `DOCS/91_RLS_PLAN.md`: 74 acessos diretos / 10 tabelas mapeados; decidido **token de sessão** (crachá) porque sem `auth.uid()` as leituras por CPF/CRM são falsificáveis.

**Next Action — construir o TOKEN (a fundação, antes da Fase 1):**
- Coluna de token (hash) em `profiles`/`medicos`; `login_paciente`/`login_medico` geram e devolvem o token; cliente guarda no localStorage; cada RPC sensível valida `(cpf/crm + token)` (+ `is_admin` p/ admin).
- Depois: Fase 1 (medicamentos leitura-pública/escrita-admin, leads, config) → Fase 2 (avaliacoes/triagens/oba/profiles) → Fase 3 (medicos + escrita config). Código→RPC **antes** de ligar RLS, em staging, 1 tabela por vez. (Ver `91_RLS_PLAN.md`.)
- Quick win seguro p/ aquecer: cortar `select('*')` em `profiles` (PatientDashboard:120 vaza o hash `senha_klipbit`).

**Pendências de produto (backlog):** peso no fluxo do paciente (TriagemModal→triagens, coluna já existe); rotação por cota do catálogo (campos prontos); UI split Lab/Imagem no ResultCard; limpar código morto dos 5-cliques (handleLogoClick + hero órfã em App.jsx).

**Blocking Items:** Nenhum. (Dívida: RLS ainda desabilitado — DEC-002/DEC-008; admin gate é client-side até o token+RLS.)

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
