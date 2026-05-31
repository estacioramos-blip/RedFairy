---
title: Product Requirements Document
type: prd
status: active
version: "1.0"
updated: "2026-05-31"
---

# RedFairy — Product Requirements Document (PRD v1.0)

## Product Vision

> **"Transformar um hemograma comum em uma triagem inteligente do eritron e do metabolismo do ferro, com conduta sugerida em segundos."**

RedFairy é uma plataforma médica de triagem hematológica. A partir dos dados de um
paciente (hemograma, ferritina, saturação de transferrina, contexto clínico), o motor de
decisão cruza os valores com matrizes por sexo e devolve diagnóstico provável, recomendação,
comentários e a lista dos próximos exames sugeridos (laboratório e imagem). Está em produção
em **redfairy.bio**.

**O que ele É:**
- Uma ferramenta de **triagem/rastreio** do eritron e do metabolismo do ferro.
- Um apoio à decisão para o médico: sugere conduta e próximos exames, sem substituir o julgamento clínico.
- Um histórico longitudinal para o paciente cadastrado (evolução em gráficos).
- Lar do **Projeto OBA** — sub-algoritmo para pacientes bariátricos (síndrome disabsortiva).

**O que ele NÃO é:** (esta lista evita scope creep)
- Não é um diagnóstico definitivo nem laudo médico — é triagem com sugestão de conduta.
- Não é um prontuário eletrônico completo (PEP) nem substitui um.
- Não é uma calculadora genérica de "qualquer exame" — o escopo é eritron + ferro (+ OBA).
- Não emite, por ora, pedidos de imagem como documentos separados (em andamento — ver Roadmap).

---

## Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| **Médico** | Avalia pacientes. Login por CRM/UF. Pode ser "afiliado" (Programa 4DOC). | Triagem rápida e confiável + conduta sugerida para copiar/entregar. |
| **Paciente LOGADO** | Tem CPF + senha. Limite de **3 triagens gratuitas**. | Experimentar o serviço e entender seu resultado. |
| **Paciente CADASTRADO** | Pagou **R$ 149,90/ano**. Acesso completo. | Histórico, gráficos de evolução e acompanhamento contínuo. |

> No `ResultCard`, `modoPaciente=true` é tratado como paciente **NÃO-cadastrado** (mostra banner de convite).

---

## Core Features (V1)

### 1. Triagem do Eritron (motor de decisão)
- `avaliarPaciente(inputs)` cruza os dados com `maleMatrix`/`femaleMatrix`.
- Retorna: `diagnostico`, `recomendacao`, `comentarios`, `proximosExames`,
  `proximosExamesLab`, `proximosExamesImagem`, `fraseData`, `g6pdAlerta`, `achadosParalelos`.
- `triagemEritron()` = avaliação parcial **sem** Ferritina/Saturação (pede esses 2 exames).
- Regras pós-matching: RNM de ferro (Sat > 50 **E** Ferritina > 1000); Densitometria (bariátrica F ≥ 45).

### 2. Separação LAB vs IMAGEM
- `proximosExames` é dividido por palavras-chave em `proximosExamesLab` e `proximosExamesImagem`.
- Lista oficial de IMAGEM é **escopo fechado** (7 exames — ver `02_PRODUCT_RULES.md`).

### 3. Projeto OBA (bariátricos)
- Sub-algoritmo para síndrome disabsortiva pós-cirurgia.
- Arquivos: `src/engine/obaEngine.js`, `src/engine/obaCutoffs.js`, `src/components/OBAModal.jsx`.

### 4. Conta de paciente + histórico
- Paciente logado (gratuito, 3 triagens) → cadastrado (pago) com histórico e gráficos de evolução (`HistoricoChartModal`, `PatientDashboard`).

### 5. Crítica de exames antigos
- `getFraseData` calcula a idade dos exames por faixas de dias e sinaliza por gravidade (verde/amarelo/vermelho).

---

## Scope (V1)

**Incluído:**
- Triagem eritron + ferro (motor + matrizes M/F), com achados paralelos.
- Projeto OBA (bariátricos).
- Contas de médico (CRM/UF, afiliado 4DOC) e de paciente (logado/cadastrado).
- Histórico e gráficos para paciente cadastrado.
- Separação Lab/Imagem dos próximos exames (no engine).

**Excluído (adiado para V2+):**
- UI completa do split Lab/Imagem + geração de pedidos de imagem separados — **em andamento**.
- Cadastro oportunista (oferecer registro antes de finalizar pedido gratuito) — backlog.
- Regra de afiliados-paciente (créditos 4DOC) — backlog.
- Refinamento geral do algoritmo — objetivo de fundo, contínuo.

---

## Success Criteria

| Metric | Target (M1) | Target (M3) | Target (M6) |
|--------|-------------|-------------|-------------|
| Médicos ativos | [definir] | [definir] | [definir] |
| Triagens/semana | [definir] | [definir] | [definir] |
| Conversão paciente logado → cadastrado | [definir] | [definir] | [definir] |

> Métricas ainda não definidas pelo Estácio — preencher quando houver meta de negócio.

---

> **Este PRD está LOCKED para V1.0.** Qualquer mudança de escopo exige uma entrada em
> `90_DECISION_LOG.md` e um bump de `version` no frontmatter — nunca editar escopo em silêncio.
