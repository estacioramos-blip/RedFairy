# RedFairy — Contexto do Projeto

> Plataforma médica de triagem hematológica (rastreio do eritron / metabolismo do ferro).
> Stack: React + Vite + Tailwind + Supabase. Deploy: Vercel → redfairy.bio.

---

## COMO TRABALHAR NESTE PROJETO ("Parceria Tango")

Este projeto é um sistema médico em produção. Siga estas regras de colaboração:

1. **Inspecione antes de mudar.** Leia o arquivo/trecho relevante antes de editar. Não assuma estrutura — verifique.
2. **Pergunte antes de adivinhar.** Se houver ambiguidade real, pergunte. Não invente comportamento.
3. **Uma coisa de cada vez.** Mudanças incrementais e revisáveis. Evite refatorações grandes não solicitadas.
4. **Valide antes de entregar.** Rode o build/check apropriado antes de considerar pronto:
   - JSX: `npx esbuild --loader:.jsx=jsx --bundle=false ARQUIVO --outfile=/tmp/out.js` (ou `npm run build`)
   - JS puro: `node --check ARQUIVO`
5. **Mostre o diff e peça confirmação antes de commitar.** Não commite automaticamente sem o OK do Estácio.
6. **Commits descritivos** explicando o "o quê" e o "porquê".
7. **Preserve compatibilidade.** Campos/arrays usados em vários lugares (ex.: `proximosExames`) não devem ser removidos sem checar todos os usos.

---

## ESTRUTURA

- `src/` — App.jsx (raiz da aplicação)
- `src/components/` — LandingPage.jsx, Calculator.jsx, ResultCard.jsx, TriagemModal.jsx, PatientDashboard.jsx, HistoricoChartModal.jsx, TermosModal.jsx, etc.
- `src/engine/` — decisionEngine.js (lógica central), maleMatrix.js, femaleMatrix.js, achadosParalelos.js, fallbackEngine.js, **obaEngine.js** (motor do OBA/bariátrico: `avaliarOBA`, `classificarEstadoClinico`), **obaCutoffs.js** (`classificarValor` por exame)
- Build: `npm run build` (vite, ~647 módulos, ~6-8s)
- Dev: `npm run dev` (localhost:5173/5174)
- Deploy: push em `main` → Vercel auto-deploy → redfairy.bio

---

## CONCEITOS DE DOMÍNIO

### Tipos de usuário
- **Médico**: avalia pacientes. Login por CRM/UF. Pode ser "afiliado" (Programa 4DOC).
- **Paciente LOGADO**: tem CPF + senha, só 3 triagens gratuitas.
- **Paciente CADASTRADO**: pagou R$ 149,90/ano, acesso completo (histórico, gráficos).
- No ResultCard, `modoPaciente=true` é tratado como paciente NÃO-cadastrado.

### Engine (decisionEngine.js)
- `avaliarPaciente(inputs)` é a função central. Cruza os dados com `maleMatrix`/`femaleMatrix`.
- Retorna objeto com: `diagnostico`, `recomendacao`, `comentarios`, `proximosExames`, `proximosExamesLab`, `proximosExamesImagem`, `fraseData`, `g6pdAlerta`, `achadosParalelos`, etc.
- `triagemEritron()` = avaliação parcial sem Ferritina/Saturação (pede esses 2 exames).
- **Regras pós-matching já implementadas:**
  - Sat. Transferrina > 50 **E** Ferritina > 1000 → adiciona "RESSONÂNCIA NUCLEAR MAGNÉTICA DO ABDOME SUPERIOR COM PROTOCOLO DE FERRO"
  - Bariátrica + sexo F + idade ≥ 45 → adiciona "DENSITOMETRIA ÓSSEA"
- **Separação LAB vs IMAGEM:** `proximosExames` é dividido por palavras-chave em `proximosExamesLab` e `proximosExamesImagem`.
  - Padrão IMAGEM (regex, case-insensitive): `ULTRASSON|COLONOSCOP|ENDOSCOP|RESSON|RNM|DENSITOMETR`
  - Lista oficial de exames de IMAGEM (escopo fechado — não adicionar outros sem pedir):
    1. ULTRASSONOGRAFIA DE ABDÔMEN TOTAL
    2. ULTRASSONOGRAFIA PÉLVICA
    3. ULTRASSONOGRAFIA DE RINS E VIAS URINÁRIAS
    4. COLONOSCOPIA
    5. ENDOSCOPIA DIGESTIVA ALTA
    6. RESSONÂNCIA NUCLEAR MAGNÉTICA COM PROTOCOLO DE FERRO
    7. DENSITOMETRIA ÓSSEA
  - `formatarParaCopiar` ainda usa o `proximosExames` original (não quebrar isso).

### Supabase
- Projeto: pfzghybajniyesoiwrcp
- Tabelas: profiles, medicos, triagens, avaliacoes, assinaturas, pedidos_documento, oba_anamnese, config
- RLS desabilitado nas tabelas principais.
- `oba_anamnese` ganhou colunas **`relatorio_oba` (jsonb)** e **`estado_clinico` (text)** — o relatório/baseline do OBA é gravado na última linha do CPF.
- `config` (chave/valor) — preços: `valor_solicitacao_medica`, `valor_documento_medico` (documento/prescrição/pedido — **em uso no fluxo do médico**, Calculator/ResultCard), `valor_teleconsulta` (**novo**, teleconsulta do OBA — NÃO reaproveitar o documento_medico), `valor_anuidade`, `pix_chave`, etc. Editáveis em Admin → Configurações (RPC `salvar_config`).
- Médico de teste: CRM 6302/BA (ESTÁCIO, afiliado).
- Paciente de teste no banco: CPF 013.529.807-54 (sexo M, nasc. 10/10/1990).

### WhatsApp ADM
- +55 71 99711-0804

### Projeto OBA
- Sub-algoritmo para pacientes bariátricos (síndrome disabsortiva pós-cirurgia).
- **Motor `obaEngine.js`:** `avaliarOBA(resultadoEritron, dadosOBA, examesOBA)` → `{ tipoCirurgia, mesesPosCirurgia, grauDisabsorcao, alertas[], modulos[], examesComplementares[], dataAvaliacao }`. Cada alerta/módulo tem `nivel` no vocabulário **canônico `grave | moderado | leve | normal`** (constantes GRAVE/MODERADO/LEVE/NORMAL). **Todo módulo DEVE usar esse vocabulário** (ver armadilha do cardiovascular).
- **`classificarEstadoClinico(relatorio, { eritronColor, temExames })`** → `{ estado, provisorio, motivo, resumo }`. Régua determinística (pior componente domina): **CRÍTICO** (≥1 grave ou eritron red) > **RUIM** (orange ou ≥2 moderados) > **RAZOÁVEL** (yellow / 1 moderado / ≥3 leves) > **BOM** > **ÓTIMO**. `provisorio=true` quando sem exames (régua é rascunho clínico, ajustável).
- **Visão longitudinal (acordada com Estácio):** transformar OBA de "foto" em "filme" — unidade = **CICLO** (1º = BASELINE, depois follow-ups). Roadmap por fases nas PENDÊNCIAS.

---

## FATOS CRÍTICOS / ARMADILHAS

- **`rf_triagem_prefill` (localStorage) é CÓDIGO MORTO** — ninguém escreve nem lê. Não construir lógica em cima disso.
- LandingPage tem um componente **AuthMedico interno no Calculator.jsx** (não exportado à parte) onde acontece login/cadastro — separado da caixa CRM/UF do hero da LandingPage.
- ResultCard tem 3 "modos": médico (UI completa), paciente cadastrado (tratado como médico por ora), paciente NÃO-cadastrado (`modoPaciente=true`, mostra banner de convite).
- Detecção de mobile na LandingPage: `window.matchMedia('(hover: none), (pointer: coarse)').matches`.
- Warnings do Recharts ("width(-1) and height(-1)") são **cosméticos** — o gráfico renderiza. Não é bug.
- O ambiente Windows converte LF→CRLF nos arquivos (warning benigno do git).
- **`PlayButton` (`src/components/PlayButton.jsx`) é o botão padrão de confirmar/avançar** do fluxo do paciente: círculo cinza piscante com ▶ vinho, subtexto vinho em caixa alta (`label`) e `hint` laranja opcional. `forwardRef` (dá pra focar). Reaproveita o keyframe `rf-play-wine`. Usado em: CompletarPerfil ("CONFIRMO"), Pagamento PIX ("JÁ PAGUEI"), boas-vindas ("CONTINUAR"), TriagemResultado ("SALVAR E PROSSEGUIR") e OBA ("AVANÇAR PARA EXAMES"). Alinhamento: à direita (`items-end`) na maioria; centralizado só no PIX.
- **ARMADILHA Unicode/JSX:** o ambiente grava caracteres acentuados como escapes `\uXXXX`. Em **atributo JSX de string** (`label="JÁ PAGUEI"`) isso vira TEXTO LITERAL (mojibake na tela) — o JSX não interpreta `\u` ali. Solução: usar **expressão** `label={"JÁ PAGUEI"}` (string JS, o `\u` é interpretado). Dentro de `{"..."}` tanto o char real quanto o escape funcionam.
- **Padrão de modal "splash 4DOC"** (visual que o Estácio aprovou): imagem nítida por alguns segundos (splash, zIndex 5) → imagem vira fundo esmaecido com **hover** atrás do conteúdo (`blur 10px/opacity .12` → `blur 0/opacity .5`). Header e título ficam em zIndex 10 (aparecem durante o splash). Referência: modal `showAfiliados` no Calculator.jsx (~l.1399) e `CompletarPerfilModal.jsx`.
- **ARMADILHA do vocabulário de gravidade no obaEngine:** módulos do OBA DEVEM usar `grave/moderado/leve/normal` (constantes GRAVE/MODERADO/LEVE/NORMAL). O módulo de risco cardiovascular usava um vocabulário próprio (`'critico'/'alterado'`) e por isso saía como **NORMAL** na tela (fallback do `NIVEL_UI`) e não contava no estado clínico. Já corrigido — não reintroduzir vocabulário paralelo.
- **Splash do relatório OBA:** controlado por `const SPLASH_REL_IMG` no topo do `OBAModal.jsx`. Está `null` (sem splash, relatório abre direto). Para ligar: importar a imagem **landscape** e atribuir ali; o enquadramento (`backgroundSize:'100% auto'`, largura cheia, parcialmente sobreposta) já está pronto.
- **Foto dinâmica por sexo:** `CompletarPerfilModal` usa `ELE_DIGITA.png` (masc.) / `ELA_DIGITA.png` (fem.), padrão feminino se sexo desconhecido. Nomes de arquivo **sem espaço** (espaço quebrava o import no Vite dev → 500/HMR).
- **Bug do foco da aba (Supabase):** `onAuthStateChange` dispara ao voltar o foco (TOKEN_REFRESHED do mesmo usuário). Em `App.jsx` o `setSession` só troca quando o `user.id` muda — senão o `PatientDashboard` remontava e fechava o OBA Modal. Não reverter para `setSession(session)` direto.
- **Flag bariátrica persistente** ("uma vez bariátrico, sempre bariátrico"): `carregarDados` no PatientDashboard grava `profiles.bariatrica=true` se houver avaliação bariátrica e o perfil ainda não refletir. Antes, o status ficava só na avaliação e a nova avaliação vinha sem ele (OBA não disparava no relogin).
- **Multi dev servers confundem:** se 5173/5174 estiverem ocupados, o `npm run dev` sobe em 5175 — testar SEMPRE na porta que o Vite imprime; servidores antigos servem código obsoleto e dão 500/HMR quebrado.

---

## PENDÊNCIAS ATUAIS

### Foco atual: OBA longitudinal (`src/components/OBAModal.jsx`)
Objetivo: transformar o OBA de avaliação única em **plataforma longitudinal** (de "foto" para "filme"). Unidade = **CICLO** (1º = BASELINE; depois follow-ups).

Fluxo atual: bariátrico sem anamnese → `verificarEAbrirOBA` (PatientDashboard ~l.167) → `setShowOBAModal(true)` (abre direto, sem banner) → etapa `'anamnese'` → `salvarAnamnese` → etapa `'exames'` → **etapa `'relatorio'`** (BASELINE).
Invocação: `<OBAModal>` em PatientDashboard ~l.525, props: `cpf, nome, dataNascimento, sexo, idade, examesRedFairy, dadosRedFairy, resultadoEritron, onConcluir, onFechar`.

**Roadmap por fases (acordado):**
- **Fase 1 — BASELINE visível ✅ FEITA** (commit `78eedf9`): etapa `'relatorio'` com Estado Geral Clínico + termômetro + alertas + módulos + exames; salva `relatorio_oba`/`estado_clinico`; título "AGORA TEMOS UM CONHECIMENTO CLÍNICO SOBRE VOCÊ"; CTA teleconsulta (RUIM/CRÍTICO) com `valor_teleconsulta` + WhatsApp.
- **Fase 2 — persistência longitudinal:** tabelas `oba_pacientes` (estável) + `oba_ciclos` (por avaliação); migrar do modelo simples atual (colunas em `oba_anamnese`).
- **Fase 3 — follow-up simplificado:** OBA "curto" que reusa o estável + comparação entre ciclos.
- **Fase 4 — evolução visual:** termômetro do estado ao longo do tempo + gráficos por analito.
- **Fase 5 — monetização/parceiros:** botões de ação (exames/teleconsulta/documento) ligados aos gatilhos do motor; encaminhamentos (ex.: psicólogo).

Pendente de definição do Estácio:
- **Régua do estado clínico** (`classificarEstadoClinico`) é rascunho — revisar os cortes clínicos.
- **Imagem landscape** do topo do relatório (ligar via `SPLASH_REL_IMG`).
- **Revisão geral da anamnese** (campos/ordem).

### Em andamento (paralelo)
- **UI do ResultCard para split LAB/IMAGEM**: o engine já separa em `proximosExamesLab`/`proximosExamesImagem`, mas o ResultCard ainda mostra tudo junto numa seção "🧪 Próximos Exames Sugeridos" (~linha 1222, grid 2 colunas usando `resultado.proximosExames`).
  - Decisão do produto: cada exame de IMAGEM gera um pedido SEPARADO (ULTRASSOM e COLONOSCOPIA são feitos em locais diferentes). Botão "Solicitar Pedidos de Imagem" abre tela com todos empilhados, 1 por página. Médico não escolhe — gera todos os sugeridos.
  - Falta decidir e implementar a parte visual + geração de documentos.

### Concluído recentemente
- **OBA Fase 1 + correções (commit `78eedf9`):** relatório/baseline; fix do cardiovascular; auto-marcações (intestinal→fibromiálgico, acompanhamento→especialistas); foto dinâmica por sexo no perfil + hint de e-mail; fix do foco da aba; flag bariátrica persistente; `valor_teleconsulta` no Admin; tela "Olá" melhor no mobile.
- Padrão **`PlayButton`** aplicado em todo o fluxo do paciente (ver ARMADILHAS) — commits até `87ff3e2`.
- `CompletarPerfilModal`, `PagamentoCadastroModal` (PIX), boas-vindas e `OBAModal` no padrão novo.
- `BoasVindasModal.jsx` **apagado** (era código morto). O "Olá, NOME!" vivo é inline no `PatientDashboard.jsx`.

### Backlog (adiado)
- Cadastro oportunista (oferecer registro ao paciente antes de finalizar pedido gratuito).
- Regra afiliados-paciente (créditos 4DOC).
- Crítica de exames antigos (>45 dias) — já existe `getFraseData` por faixas de dias.
- Refinamento geral do algoritmo (objetivo principal do Estácio com o Claude Code).

---

## NOTAS PARA O CLAUDE CODE

- O Estácio NÃO é programador de formação — explique decisões técnicas em linguagem acessível e evite jargão desnecessário.
- Antes de mexer no engine ou nas matrizes, leia `decisionEngine.js`, `maleMatrix.js` e `femaleMatrix.js` para entender o fluxo completo.
- Sempre rode `npm run build` antes de propor commit.
- Mostre o diff e espere confirmação antes de `git commit`/`git push`.
