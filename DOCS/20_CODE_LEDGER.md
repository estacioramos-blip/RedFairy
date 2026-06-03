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
| 025 | 2026-06-03 | Segurança — token de sessão (crachá) | Phase 2 | DEC-008 | `migrate_token_sessao.sql`: colunas `session_token_hash`/`session_token_exp` em profiles/medicos; login_*/register_* emitem token (sha256, 30d); crachás `token_medico_ok`/`token_admin_ok`/`token_paciente_ok`. Cliente guarda `medico_token`/`paciente_token` e limpa no logout. Não-destrutivo (retorno do login só ganha `token`). Base p/ Fases 1-3 do RLS. Aplicado e validado em produção (`tem_token=true`). |
| 026 | 2026-06-03 | Segurança — RLS Fase 1 (medicamentos/config/leads) | Phase 2 | DEC-008 | RPCs admin `salvar_medicamento`/`salvar_config` (crachá `token_admin_ok`) em `migrate_rls_fase1_rpcs.sql`; AdminPage salva catálogo e config via RPC (helper `credAdmin`). `migrate_rls_fase1_enable.sql` liga RLS (medicamentos/config leitura pública+escrita RPC; leads só INSERT) — rodar só após o deploy. Fecha a adulteração da chave Pix/catálogo via anon key. |
| 027 | 2026-06-03 | Fix — tabelas medicamentos/leads_comerciais criadas | Phase 2 | DEC-007/008 | Ao ligar o RLS, descobriu-se que `medicamentos` e `leads_comerciais` NUNCA existiram no Supabase (só `config`) — catálogo DEC-007 degradava calado, inserts de lead falhavam em silêncio. Aplicado `migrate_add_medicamentos.sql` (+seed 5 drogas) e criado `migrate_create_leads.sql`. RLS Fase 1 ligado e validado em produção (catálogo, modal 2 receitas, config R/W sob RLS). |
| 028 | 2026-06-03 | Anuidade do paciente dinâmica (config + Pix gerado) | Phase 2 | DEC-009 | `src/lib/pix.js`: gerador de código Pix (EMV+CRC16), verificado contra o código original de R$149,90. Valor vem de `config.valor_anuidade` (admin edita); exibido na LandingPage (3 lugares), PagamentoCadastroModal e TermosModal; código Pix do pagamento gerado dinamicamente. Sem o valor no banco, cai no padrão 149,90. |

---

## Current Status

**Active Phase:** Phase 2 — Build out

**Handoff (2026-06-03 — sessão 2, fim):**
Avançou muito a segurança (DEC-008) + anuidade dinâmica (DEC-009). Tudo em `main`/produção (commits 025–028):
1. **Token de sessão (crachá)** ✅ — `migrate_token_sessao.sql` aplicado e validado (`tem_token=true`). login_*/register_* emitem token (sha256, 30d); crachás `token_medico_ok`/`token_admin_ok`/`token_paciente_ok`; cliente guarda `medico_token`/`paciente_token`.
2. **RLS Fase 1 FECHADA** ✅ — medicamentos/config (SELECT público, escrita só-RPC via `salvar_medicamento`/`salvar_config`) + leads_comerciais (só INSERT). Validado em produção.
3. **Conserto: tabelas fantasma** — `medicamentos` e `leads_comerciais` NUNCA existiram no banco (só `config`); criadas agora. Catálogo DEC-007 finalmente vivo.
4. **Anuidade dinâmica (DEC-009)** ✅ — `src/lib/pix.js` (gerador Pix EMV+CRC16, verificado contra o código real 149,90); valor vem de `config.valor_anuidade`; admin edita; landing/modal/termos exibem do banco. Display validado por Estácio.
5. **Tabelas de pagamento verificadas** — `assinaturas`, `pedidos_documento`, `profiles.boas_vindas_vista` existem e completas. (Bônus: `assinaturas` tem colunas Stripe sem uso — fluxo atual é Pix manual "Já paguei", baseado em confiança.)

**Pendências desta frente:**
- Teste funcional do código Pix gerado (scanear/conferir) — a matemática está verificada, mas não foi testado no banco real ainda.

**Next Action — RLS Fase 2 (dados de saúde) ou Pagamento automático:**
- **Fase 2 (recomendado p/ segurança):** proteger `avaliacoes`/`triagens`/`oba_anamnese`/`profiles` + as sensíveis `assinaturas`/`pedidos_documento` com o token (RPCs de leitura/escrita validando crachá → ligar RLS). Converter código→RPC ANTES de ligar RLS, 1 tabela por vez. Ver `DOCS/91_RLS_PLAN.md`.
- **Pagamento automático:** colunas Stripe já existem em `assinaturas`; sair do "confia no paciente" p/ verificação real (gateway/webhook).
- Quick win: cortar `select('*')` em `profiles` (PatientDashboard:120 traz o hash `senha_klipbit` p/ o cliente).

**Backlog produto:** peso no fluxo do paciente (TriagemModal→triagens, coluna existe); rotação por cota do catálogo; UI split Lab/Imagem no ResultCard; limpar código morto (handleLogoClick + hero órfã em App.jsx ~218-253).

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
