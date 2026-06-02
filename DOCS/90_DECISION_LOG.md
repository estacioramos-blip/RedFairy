---
title: Decision Log
type: decision-log
status: active
version: "1.2"
updated: "2026-06-02"
---

# RedFairy — Decision Log

> Registra o **PORQUÊ** de decisões importantes — para que o futuro-você (e o Claude) nunca
> re-litiguem questões já resolvidas nem se afastem delas sem querer.
>
> **Gatilhos** (qualquer um → registrar): direção de produto, mudança de escopo, preço/taxa,
> modelo de negócio, escolha de stack, postura de segurança, mudança de regra, ou qualquer coisa
> que contradiga uma decisão anterior. Entrada mais nova no topo.

---

## 2026-06-02 — DEC-007 — Catálogo de medicamentos de ferro EV + prescrição patrocinada (4DOC)

**Decisão:** A plataforma passa a manter um **catálogo de medicamentos de ferro endovenoso** (backend), e a prescrição de ferro EV deixa de ter marcas fixas no código. Em vez de uma "regra simplificada", a conduta de cada caso gera **sempre DUAS receitas** — uma de **alta dose** e uma de **dose fracionada** — usando a marca que estiver **ativa** em cada classe no backend.

**Razão / modelo de negócio:**
- **Acesso do paciente:** nem todo paciente compra Ferinject/Monofer (caros). Emitir as duas classes deixa o paciente aplicar conforme o acesso — plano de saúde, **posto do SUS**, centro de infusão, ou compra direta.
- **Programa 4DOC patrocinado:** o Dr. Ramos negocia com os fabricantes benefícios para os médicos afiliados em troca de volume de prescrição. A **alavanca comercial** é *qual marca está ativa em cada classe* — controlada pelo backend.

**Classes (sempre as duas prescritas):**
- 🟥 **`alta_dose`** — 1–2 infusões, dose alta por sessão. Concorrência: **Ferinject** (carboximaltose férrica, Takeda/Vifor) × **Monofer** (derisomaltose férrica, Pfizer — não causa hipofosfatemia).
- 🟦 **`dose_fracionada`** — sacarato (*iron sucrose*), ~200 mg/sessão, várias sessões; acessível no SUS. Concorrência: **Noripurum EV** (Takeda) × **Ferropurum** (Blau) × **Sucrofer** (União Química).
- **Uma marca `ativo=true` por classe** (MVP — sem rotação por cota ainda; troca manual no admin). Cota por contagem fica para depois (campos `prescricoes_emitidas`/`cota_total` já criados).

**Lista (pesquisa 2026-06-02 — registro/comercialização no Brasil):**
- Confirmados EV: Noripurum EV, Ferropurum, Sucrofer (sacarato 20 mg/mL · 100 mg/amp); Ferinject (carboximaltose 50 mg/mL · 500 mg); Monofer (derisomaltose 100 mg/mL · frascos 500 e 1000 mg).
- **Fora:** Dexfer e Endofer (são **orais**, não EV); Ferumoxytol, gluconato férrico IV e ferro-dextrana — **sem registro ANVISA** confirmado.

**Impacto técnico:**
- Nova tabela `medicamentos` (catálogo editável) + seed das 5 drogas. Config dropa a ideia de "classe padrão".
- `ResultCard`/`ModalFerroEV` e `AdminPage.gerarSolicitacaoCFM` passam a **ler do catálogo** (2 receitas), no lugar de "Ferro Sacarato ou Carboximaltose" fixos.
- Nova aba **💊 Medicamentos** no AdminPage (escolher marca ativa por classe + editar parâmetros).
- **Contagem de prescrição ao gerar o documento** (gancho para cota futura).

**Supersedes:** revoga a resposta "fixar uma classe padrão" cogitada antes (nunca codada) — agora **sempre as duas classes**. Estende a implementação do DEC-006 (mg de Ganzoni → nº de ampolas/sessões por marca do catálogo).

---

## 2026-06-02 — DEC-006 — Protocolo de dose de ferro endovenoso (Fórmula de Ganzoni)

**Decisão:** A plataforma passa a calcular automaticamente a dose de reposição de ferro endovenoso pela **Fórmula de Ganzoni**, substituindo a antiga "regra simplificada" (que não existe mais no código) e a frase fixa de conduta.

> **Déficit de ferro (mg) = peso (kg) × (Hb alvo − Hb atual) × 2,4 + 500**

**Parâmetros (definição clínica do Dr. Ramos, hematologista):**
- **Hb alvo:** ♂ **13,5** g/dL · ♀ **12,0** g/dL (limite inferior do normal por sexo).
- **Hb alvo na gestante:** **11,5** g/dL (carve-out clínico distinto da ♀ não-gestante).
- **Ferro de reserva:** **500 mg** fixo (adultos).
- **Constante:** **2,4** (fixa — embute volemia e conteúdo de ferro da Hb).
- **Clamp:** se Hb atual ≥ Hb alvo, a parcela da Hb zera (repõe só os 500 mg de reserva).

**Razão:**
- A "regra simplificada" anterior foi perdida e era menos precisa; Ganzoni é o padrão consagrado e individualiza pelo peso.
- A landing já promete "Cálculo de dose para infusão de ferro" (`public/index.html`), até então sem implementação real.

**Impacto:**
- **Coleta de PESO (kg) de todo paciente na triagem** (Calculator do médico + TriagemModal do paciente; salvar em `avaliacoes`/`triagens`). É campo novo de dado clínico.
- Novo módulo de engine `src/engine/ferroProtocol.js` (função pura de cálculo).
- O cálculo só dispara em diagnósticos com **indicação de ferro EV**; **nunca** em sobrecarga (Sat > 50 / ferritina alta) — onde o ferro é contraindicado.
- A conversão mg → nº de ampolas/infusões dependerá do **catálogo de medicamentos** (dose máxima por sessão de sacarato/carboximaltose) — integração subsequente.

**Implementação (2026-06-02):**
- `ResultCard.jsx` — o `ModalFerroEV` agora usa `ferroProtocol.js` com o **peso real** (pré-preenchido da triagem, editável no modal). Se o peso não foi informado, o modal **pede o peso** antes de calcular (não cai mais em 70 kg fixo).
- Substituiu a antiga `calcularFerroEV` (peso 70 kg fixo; Hb alvo ♂14,0/♀12,5) — esses valores foram aposentados em favor dos alvos acima.
- O gate de exibição (`precisaFerroEV`) já existia e está mantido: dispara só com texto "ENDOVENOSA/INTRAVENOSA" no diagnóstico/recomendação e Hb abaixo do alvo; nunca em verde → exclui sobrecarga.
- Coleta de peso implementada no **Calculator (médico)** + coluna `peso` em `avaliacoes`/`triagens` (`migrate_add_peso.sql`). Lado **paciente (TriagemModal)** ainda pendente.

**Supersedes:** aposenta os parâmetros do antigo modal de ferro EV (70 kg fixo; Hb alvo ♂14,0/♀12,5).

---

## 2026-06-02 — DEC-005 — Validação de datas e idade nos formulários

**Decisão:** Nenhum campo de data aceita data futura. A data de nascimento valida a idade resultante: **> 120 anos é rejeitada**; **≥ 100 anos exige confirmação** explícita.

**Razão:**
- Erro grosseiro de digitação travava o fluxo em silêncio (data futura) ou distorcia o diagnóstico (a idade entra na avaliação).
- Sanidade clínica: exame não é colhido "amanhã"; 120 anos é o limite plausível.

**Impacto:**
- `type="date"` recebe `max={hoje}` (bloqueio na origem). Máscaras DD/MM/AAAA: data futura/inválida → avisa, **limpa o campo e refoca** o cursor.
- Data de nascimento (Calculator + TriagemModal): idade > 120 rejeita; ≥ 100 confirma via diálogo.

**Supersedes:** —

---

## 2026-06-01 — DEC-004 — Fluxo de entrada do Projeto OBA: login antes da triagem

**Decisão:** O botão "Sou Bariátrico / COMEÇAR" (página Projeto OBA) deixa de cair direto na triagem e passa a: popup explicativo (8s) → entrada de CPF / criação de senha (como qualquer paciente novo) → TriagemModal já com o flag bariátrico marcado e travado.

**Razão:**
- O fluxo antigo pulava a criação de ACESSO (login/senha) — inconsistente com o cadastro de paciente.
- O seguimento OBA pressupõe paciente cadastrado (modelo de negócio: acompanhamento recorrente de baixo custo).
- O sexo (bariátrico/bariátrica) só é definido na triagem; o flag apenas marca a condição, que é permanente uma vez registrada.

**Impacto:**
- `LandingPage` (popup + roteamento para a entrada de CPF) e `TriagemModal` (consome `rf_flag`, trava o checkbox bariátrico, rótulo "(Projeto OBA®)").
- Sem mudança de escopo do PRD — correção de fluxo dentro do Projeto OBA (Phase 2).

**Supersedes:** —

---

## 2026-06-01 — DEC-003 — Ferritina: teto do normal masculino 336 → 300 ng/mL

**Decisão:** Baixar o limite superior da ferritina normal masculina de 336 para 300 ng/mL em todo o sistema (matriz M, cutoffs OBA, fallback, V.R. exibido, gráfico de histórico e demo da landing). Feminino mantido em 150.

**Razão:**
- Pesquisa de consenso (Cleveland Clinic, Red Cross Lifeblood, ASH) mostra faixa ampla entre laboratórios; 336 estava no lado alto e deixava passar como "saudável" ferritinas que merecem investigação.
- Decisão clínica do Dr. Ramos (hematologista).

**Impacto:**
- Homens com ferritina 301–336 e saturação normal passam de "SAUDÁVEL" para "PROCESSO INFLAMATÓRIO / DOENÇA CRÔNICA" (ou "BARIÁTRICO COM FERRITINA ELEVADA"). Bandas mantidas contíguas (piso da banda elevada bariátrica 337→301).
- Mantida intacta a entrada feminina ID 65 (hemoglobinopatia C), onde 25–336 é envelope de "ferritina adequada", não o teto do normal.
- Commit `17d74d7`.

**Supersedes:** —

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
