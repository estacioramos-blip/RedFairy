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
- `src/engine/` — decisionEngine.js (lógica central), maleMatrix.js, femaleMatrix.js, achadosParalelos.js, fallbackEngine.js
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
- Médico de teste: CRM 6302/BA (ESTÁCIO, afiliado).
- Paciente de teste no banco: CPF 013.529.807-54 (sexo M, nasc. 10/10/1990).

### WhatsApp ADM
- +55 71 99711-0804

### Projeto OBA
- Sub-algoritmo para pacientes bariátricos (síndrome disabsortiva pós-cirurgia).

---

## FATOS CRÍTICOS / ARMADILHAS

- **`rf_triagem_prefill` (localStorage) é CÓDIGO MORTO** — ninguém escreve nem lê. Não construir lógica em cima disso.
- LandingPage tem um componente **AuthMedico interno no Calculator.jsx** (não exportado à parte) onde acontece login/cadastro — separado da caixa CRM/UF do hero da LandingPage.
- ResultCard tem 3 "modos": médico (UI completa), paciente cadastrado (tratado como médico por ora), paciente NÃO-cadastrado (`modoPaciente=true`, mostra banner de convite).
- Detecção de mobile na LandingPage: `window.matchMedia('(hover: none), (pointer: coarse)').matches`.
- Warnings do Recharts ("width(-1) and height(-1)") são **cosméticos** — o gráfico renderiza. Não é bug.
- O ambiente Windows converte LF→CRLF nos arquivos (warning benigno do git).

---

## PENDÊNCIAS ATUAIS

### Em andamento
- **UI do ResultCard para split LAB/IMAGEM**: o engine já separa em `proximosExamesLab`/`proximosExamesImagem`, mas o ResultCard ainda mostra tudo junto numa seção "🧪 Próximos Exames Sugeridos" (~linha 1222, grid 2 colunas usando `resultado.proximosExames`).
  - Decisão do produto: cada exame de IMAGEM gera um pedido SEPARADO (ULTRASSOM e COLONOSCOPIA são feitos em locais diferentes). Botão "Solicitar Pedidos de Imagem" abre tela com todos empilhados, 1 por página. Médico não escolhe — gera todos os sugeridos.
  - Falta decidir e implementar a parte visual + geração de documentos.

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
