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
5. **Teste antes do Estácio testar.** Antes de entregar qualquer mudança para teste manual do Estácio:
   - Dispare o agente **`code-reviewer`** sobre os arquivos alterados (bugs, lógica clínica, armadilhas do projeto).
   - Se a mudança tem superfície executável, **exercite o fluxo afetado de verdade** antes de entregar (a antiga skill `/verify` não existe mais): motor/engine → bundlar com `npx esbuild src/engine/ARQUIVO.js --bundle --format=esm --outfile=/tmp/x.mjs` e simular os casos no Node (casos-limite e cruzamentos, não só o caminho feliz); UI/fluxo → subir o dev server e percorrer a tela alterada (a skill `run` ajuda).
   - Só entregue para o Estácio depois que o build passar e os problemas apontados forem corrigidos (ou explicitamente relatados). O teste do Estácio é clínico/visual — o técnico é responsabilidade do agente.
6. **Mostre o diff e peça confirmação antes de commitar.** Não commite automaticamente sem o OK do Estácio.
7. **Commits descritivos** explicando o "o quê" e o "porquê".
8. **Preserve compatibilidade.** Campos/arrays usados em vários lugares (ex.: `proximosExames`) não devem ser removidos sem checar todos os usos.

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
- **Médico**: avalia pacientes. Login por CRM/UF. "Afiliado" hoje significa apenas *cadastro completo* (CEP+CPF+PIX), ou seja, tem para onde receber pelas avaliações — a marca 4DOC foi aposentada (ver reforma CFM).
- **Paciente LOGADO**: tem CPF + senha, só 3 triagens gratuitas.
- **Paciente CADASTRADO**: pagou a anuidade, acesso completo (histórico, gráficos).
  - ⚠ **NUNCA escreva o valor da anuidade em documento nem em código.** Ele é lido do
    Supabase (`config.valor_anuidade`) e o ADMIN muda quando quiser, em Admin →
    Configurações. Este arquivo dizia "R$ 149,90/ano" enquanto banco e código diziam
    200 — número em documento envelhece calado e leva alguém a errar em público.
  - Único fallback legítimo: `VALOR_ANUIDADE_PADRAO` em `src/lib/pix.js`, usado só
    quando a leitura do `config` falha. Se um dia divergir do banco, o banco é que vale.
- No ResultCard, `modoPaciente=true` é tratado como paciente NÃO-cadastrado.

### Engine (decisionEngine.js)
- `avaliarPaciente(inputs)` é a função central. Cruza os dados com `maleMatrix`/`femaleMatrix`.
- Retorna objeto com: `diagnostico`, `recomendacao`, `comentarios`, `proximosExames`, `proximosExamesLab`, `proximosExamesImagem`, `proximosExamesEndoscopia`, `proximosExamesBioimagem`, `proximosExamesCardio`, `proximosExamesRespiratorio`, `proximosExamesAvaliacao`, `fraseData`, `g6pdAlerta`, `achadosParalelos`, etc.
- `triagemEritron()` = avaliação parcial sem Ferritina/Saturação (pede esses 2 exames).
- **Regras pós-matching já implementadas:**
  - Sat. Transferrina > 50 **E** Ferritina > 1000 → adiciona "RESSONÂNCIA NUCLEAR MAGNÉTICA DO ABDOME SUPERIOR COM PROTOCOLO DE FERRO"
  - Bariátrica + sexo F + idade ≥ 45 → adiciona "DENSITOMETRIA ÓSSEA"
- **Separação por SERVIÇO** (`splitExames`, decisionEngine.js ~l.170): `proximosExames` é classificado em **6 serviços**, em CASCATA e mutuamente exclusivos — cada exame cai em EXATAMENTE um. A ordem é a precedência; o laboratório fica com o resto.
    1. `proximosExamesEndoscopia` — `COLONOSCOP|ENDOSCOP`
    2. `proximosExamesBioimagem` — `ULTRASSON|\bUSG\b|RESSON|RNM|DENSITOMETR`
    3. `proximosExamesCardio` — `ELETROCARDIOGRAMA|ECOCARDIOGRAMA|ERGOMÉTRIC|HOLTER|\bMAPA\b|ANGIOTOMOGRAFIA CORONARIAN|SCORE DE CÁLCIO|CINTILOGRAFIA MIOC`
    4. `proximosExamesRespiratorio` — `ESPIROMETRIA|PROVA DE FUNÇÃO PULMONAR|PLETISMOGRAFIA`
    5. `proximosExamesAvaliacao` — `^AVALIAÇÃO COM|^CONSULTA COM|ENCAMINHAMENTO`
    6. `proximosExamesLab` — o que sobrou
  - `proximosExamesImagem` = endoscopia + bioimagem (mantido só por **compatibilidade**; a UI e os pedidos usam os sub-arrays).
  - **Por que serviços e não categorias:** cada grupo vira um PEDIDO FÍSICO separado, porque são feitos em lugares diferentes. Não se faz ECG no laboratório nem colonoscopia no serviço de imagem. É por isso que o `\bUSG\b` existe (8 entradas das matrizes escrevem o ultrassom abreviado e caíam em `lab` — a gestante do id 114 levaria "USG OBSTÉTRICA COM DOPPLER" ao balcão do laboratório), e por isso a `ANGIOTOMOGRAFIA` aparece QUALIFICADA como CORONARIANA (uma futura "de abdome" viraria pedido cardiológico por engano).
  - ⚠ Ao acrescentar exame novo nas matrizes, confira em qual serviço ele cai. Cair no serviço errado não dá erro nenhum — só manda o paciente ao lugar errado com o papel na mão.
  - `formatarParaCopiar` ainda usa o `proximosExames` original (não quebrar isso).

### Supabase
- Projeto: pfzghybajniyesoiwrcp
- Tabelas: profiles, medicos, triagens, avaliacoes, assinaturas, pedidos_documento, oba_anamnese, config
- ⚠ **RLS LIGADO em TODAS as 13 tabelas principais** (Fases 1-3, ago/2026) — este arquivo
  dizia o contrário. Quase todas têm **ZERO policies**: o acesso é EXCLUSIVAMENTE por RPC
  `SECURITY DEFINER` gateada por token (`credPaciente/credMedico/credAmbas/credAdministrador`
  em `src/lib/cred.js`). Exceções com policy: `config` e `triagens` (só leitura/insert público).
  - **Consequência prática:** `supabase.from('tabela').select/insert/update` **não funciona**
    e **falha em SILÊNCIO** — o RLS filtra tudo, o supabase-js não lança exceção, e você vê
    `count 0` ou "salvo" sem ter salvo. Foram exatamente assim os itens 6, 7 e 8 da auditoria.
    Antes de escrever acesso a tabela, procure a RPC correspondente.
- `oba_anamnese` ganhou colunas **`relatorio_oba` (jsonb)** e **`estado_clinico` (text)** — o relatório/baseline do OBA é gravado na última linha do CPF.
- `config` (chave/valor) — preços. **Modelo consolidado (2 valores de "trabalho médico"):**
  - `valor_solicitacao_medica` = **"Valor da Solicitação de Exame"** — cobre TODAS as solicitações (lab, bioimagem, endoscopia, cardiológico, outros) **+ atestado pós-consulta**. Em uso no fluxo do médico (Calculator/ResultCard).
  - `valor_documento_medico` = **"Valor de Relatório"** — cobre **consulta/teleconsulta, discussão de caso, relatório específico** e documentos (prescrição/pedido). **Também é a fonte do CTA de teleconsulta do OBA** (OBAModal lê esta chave).
  - **`valor_teleconsulta` foi APOSENTADA** (unificada no `valor_documento_medico`) — ninguém mais lê. A linha pode continuar órfã no banco sem efeito. **NÃO reintroduzir** consulta/teleconsulta como valor separado.
  - **Pagamento e descontos (reforma CFM, 09/09/2026 — ver a seção própria abaixo):**
    - `valor_usd_avaliacao` = **AVALIAR do médico**, em dólar digital, creditado NA HORA da avaliação (`creditos_avaliacao`, RPC `medico_avaliar_paciente`). Não depende de o paciente assinar: é trabalho prestado. Era `comissao_usd_nao_afiliado`, renomeada em R1.
    - `credito_indicacao_brl` = **em REAIS**, o que o PACIENTE que indica acumula. Só abate anuidade e documentos dele (`indicador_conta`, `aplicar_abatimento`, `caixa_abater`). **Nunca vira dinheiro.**
    - `desconto_boas_vindas_brl` = **em REAIS**, abatido da PRIMEIRA anuidade de quem chega indicado (`desconto_boas_vindas`, aplicado no `PagamentoCadastroModal`).
    - ⚠ **`comissao_usd_por_conversao` foi APAGADA** (R3). Era a comissão por paciente trazido — do médico e do indicador. **NÃO recriar.**
    - `cotacao_dolar` sobrou só para converter o pagamento das avaliações em R$.
  - Outros: `valor_anuidade`, `cotacao_dolar`, `pix_chave`, etc. Editáveis em Admin → Configurações (RPC `salvar_config`).
  - ⚠ **Os valores em US$/R$ citados acima são o que está no banco HOJE, não constantes.**
    Todos vêm de `config` e o ADMIN muda quando precisar. Cite a CHAVE, nunca o número —
    número em documento envelhece calado (foi o que aconteceu com a anuidade).
- Médico de teste: CRM 6302/BA (ESTÁCIO, afiliado).
- ⚠ **Paciente de teste 013.529.807-54 NÃO existe mais no banco** (conferido 09/09/2026). O único perfil cadastrado é o CPF 039.563.145-90, e há 0 avaliações e 0 triagens. Testes que dependem de vínculo médico↔paciente precisam criá-lo antes.

### Programa de indicação — reforma ético-regulatória (09/09/2026)

**Por que existe esta seção:** o médico responsável técnico responde perante o
CFM/CRM pelo mecanismo de incentivo da plataforma — **mesmo quando quem recebe é
leigo**. Resolução CFM 2.336/2023 e Resolução CFM 2.170/2017 (captação de
clientela). Sem este registro, alguém reverte as regras achando que é "só um
programa de indicação desligado".

> **PAGAR POR TRABALHO MÉDICO FEITO** → permitido
> **DAR DESCONTO POR FIDELIDADE** → permitido
> **PAGAR POR PACIENTE TRAZIDO** → **NÃO**

| # | situação | regra |
|---|---|---|
| **R1** | médico avalia paciente | **recebe** em dólar (`valor_usd_avaliacao`), no ato da avaliação, 1× por paciente. Trabalho prestado. |
| **R2** | médico indica/encaminha | **não recebe nada.** ENCAMINHAR e RECOMENDAR continuam existindo como **ferramenta clínica** — criam o vínculo médico↔paciente (`encaminhamentos_medico`, `medico_tem_vinculo`), que é o que dá acesso ao prontuário. |
| **R3** | paciente indica paciente | acumula crédito em R$ (`credito_indicacao_brl`) que **só abate anuidade e documentos dele**. Sem limite, sem validade, **sem saque**. |
| **R4** | leigo indica | **não recebe nada.** Quem ganha é o indicado, com `desconto_boas_vindas_brl` na 1ª anuidade. |
| **R5** | influenciador/parceiro | fora do sistema. Contrato por valor fixo de divulgação, como fornecedor — **nunca por conversão**. Nada a implementar. |

**Migrations:** `migrate_cfm_r1_valor_avaliacao.sql` → `_r2_remove_comissao_indicacao.sql`
→ `_r3_credito_so_abate.sql` → `_r4_desconto_boas_vindas.sql`. **Rodar nessa ordem.**

**O que sumiu do banco (não recriar):** tabela `creditos_medico`; funções
`fn_credita_medico` (virou `fn_credita_indicacao`), `fn_libera_creditos_pendentes`,
`medico_tem_avaliacao_completa`, `caixa_pagar_indicador`, `paciente_salvar_pix`,
`salvar_pix_indicador`, `register_indicador`, `login_indicador`, `lookup_indicador`,
`contato_indicador`; colunas bancárias de `indicadores` (pix/usdc/titular/CNPJ/senha/token/email);
tipo `pix` do `caixa_abater` (era o PAGAR EXCEDENTE, o único saque do paciente).

⚠ **ARMADILHAS desta reforma:**
- **`creditos_medico` era controle de acesso, não só dinheiro.** `medico_tem_vinculo`
  a usava como prova de vínculo. Foi reescrita (medico_origem OU triou OU avaliou OU
  `encaminhamentos_medico` OU `creditos_avaliacao`) ANTES do DROP. Apagar sem isso
  tiraria do médico o acesso aos pacientes dele.
- **Indicador leigo não tem CPF nem senha** (R4). `indicadores.cpf` é NULL para ele —
  a UNIQUE aceita vários NULL. Guardar CPF de não-usuário é PII sem contrapartida
  (LGPD). Só nome (1º nome) e celular opcional. **Não reintroduzir CPF/senha ali.**
- **Ordem dos descontos no pagamento:** boas-vindas PRIMEIRO (é gratuito), crédito
  depois, e `aplicar_abatimento` recebe só o que sobrou. Invertendo, o paciente
  queima crédito para cobrir o que o desconto já cobria — e crédito queimado não volta.
- **Nada de cifra no site aberto** (`site-bariatrico/index.html`): `carregarComissoes`
  foi removida. O valor da avaliação é remuneração médica e aparece só depois do login.
- **A marca "4DOC / Programa de Afiliados" foi aposentada** na interface: nomeava o
  programa de indicação. Identificadores internos (`cardFada4doc`, `showConvite4doc`…)
  ficaram como estão — renomeá-los é churn sem efeito para o usuário.
- `senha_klipbit` em `profiles`/`medicos` **continua**: é o hash bcrypt da senha, nome
  legado. Não confundir com pagamento — não há integração Klipbit/USDC em lugar nenhum.

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
- **Foto dinâmica por sexo:** `CompletarPerfilModal` usa `ELE_DIGITA.jpg` (masc.) / `ELA_DIGITA.jpg` (fem.), padrão feminino se sexo desconhecido. Nomes de arquivo **sem espaço** (espaço quebrava o import no Vite dev → 500/HMR). Convertidas de PNG (~3MB) para JPEG ~896px/q82 (~140-160KB, fundo `#FDF7F7`); o splash nítido dura 1200ms.
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
- **Fase 1 — BASELINE visível ✅ FEITA** (commit `78eedf9`): etapa `'relatorio'` com Estado Geral Clínico + termômetro + alertas + módulos + exames; salva `relatorio_oba`/`estado_clinico`; título "AGORA TEMOS UM CONHECIMENTO CLÍNICO SOBRE VOCÊ"; CTA teleconsulta (RUIM/CRÍTICO) com `valor_documento_medico` (ex-`valor_teleconsulta`, unificado) + WhatsApp.
- **Fase 2 — persistência longitudinal:** tabelas `oba_pacientes` (estável) + `oba_ciclos` (por avaliação); migrar do modelo simples atual (colunas em `oba_anamnese`).
- **Fase 3 — follow-up simplificado:** OBA "curto" que reusa o estável + comparação entre ciclos.
- **Fase 4 — evolução visual:** termômetro do estado ao longo do tempo + gráficos por analito.
- **Fase 5 — monetização/parceiros:** botões de ação (exames/teleconsulta/documento) ligados aos gatilhos do motor; encaminhamentos (ex.: psicólogo).

Pendente de definição do Estácio:
- **Régua do estado clínico** (`classificarEstadoClinico`) é rascunho — revisar os cortes clínicos.
- **Imagem landscape** do topo do relatório (ligar via `SPLASH_REL_IMG`).
- **Revisão geral da anamnese** (campos/ordem).

### Concluído recentemente
- **Split por SERVIÇO completo (motor + UI + documentos)** — a antiga pendência "UI do ResultCard para split LAB/IMAGEM" está FECHADA (verificado 09/09/2026). `servicosDeExame` (ResultCard ~l.871) monta um documento por serviço, `enviarWhatsApp` (~l.945) grava `tipos_documento` como `exames_lab`/`exames_bioimagem`/`exames_endoscopia`/... e cobra **um `valor_solicitacao_medica` por SERVIÇO** (prescrição sai por `valor_documento_medico`). A seção "🧪 Próximos Exames Sugeridos" (~l.1602) mostra um card por serviço. Dois níveis de fallback para retorno antigo do motor — nunca perde exame.
- **OBA Fase 1 + correções (commit `78eedf9`):** relatório/baseline; fix do cardiovascular; auto-marcações (intestinal→fibromiálgico, acompanhamento→especialistas); foto dinâmica por sexo no perfil + hint de e-mail; fix do foco da aba; flag bariátrica persistente; `valor_teleconsulta` no Admin; tela "Olá" melhor no mobile.
- Padrão **`PlayButton`** aplicado em todo o fluxo do paciente (ver ARMADILHAS) — commits até `87ff3e2`.
- `CompletarPerfilModal`, `PagamentoCadastroModal` (PIX), boas-vindas e `OBAModal` no padrão novo.
- `BoasVindasModal.jsx` **apagado** (era código morto). O "Olá, NOME!" vivo é inline no `PatientDashboard.jsx`.

### Backlog (adiado)
- Cadastro oportunista (oferecer registro ao paciente antes de finalizar pedido gratuito).
- ~~Regra afiliados-paciente (créditos 4DOC)~~ — **morta** com a reforma CFM de 09/09/2026.
- Crítica de exames antigos (>45 dias) — já existe `getFraseData` por faixas de dias.
- Refinamento geral do algoritmo (objetivo principal do Estácio com o Claude Code).

---

## NOTAS PARA O CLAUDE CODE

- O Estácio NÃO é programador de formação — explique decisões técnicas em linguagem acessível e evite jargão desnecessário.
- Antes de mexer no engine ou nas matrizes, leia `decisionEngine.js`, `maleMatrix.js` e `femaleMatrix.js` para entender o fluxo completo.
- Sempre rode `npm run build` antes de propor commit.
- Mostre o diff e espere confirmação antes de `git commit`/`git push`.

---

## Landing bariatrico.net — faixa de abertura e teste A/B

Site de marketing, projeto separado do app React. Vive em `site-bariatrico/`:
`index.html` + `support.js` (dc-runtime) + `intro-ab.js` + `images/` + `vendor/`.
Sem build, sem Vite — edita o arquivo e commita.

### O que é a faixa

Faixa de vidro fosco com borda dourada que sobe do centro para cima ao carregar
a home, com uma frase explicativa do SaaS. O desfoque sobre o site clareia
enquanto ela sobe. Sai sozinha ou no primeiro toque/clique/rolagem.

Não bloqueia nada: `pointer-events: none` em tudo. Isso é deliberado —
interstitial que trava aumenta o abandono, que é justamente o que o teste
quer reduzir.

### Ajustes finos (topo do `intro-ab.js`)

- `FRASES.A` / `FRASES.B` — as duas variantes de copy
- `T.subida` — duração do movimento (hoje 2100ms)
- `T.visivel` — permanência total em tela (hoje 5200ms)
- `T.foco` — desfoque -> nitidez do site atrás
- `ALTURA_SUBIDA` — o quanto sobe a partir do centro (hoje 19vh)
- `VIDRO` — opacidade do vidro fosco (hoje 0.52)

### Modo de teste

`?intro=1` mostra de novo, `?intro=A` e `?intro=B` forçam cada frase.
No modo de teste NADA é gravado — para os testes internos não entrarem
na amostra.

Sem esse parâmetro a faixa aparece uma vez por sessão (`sessionStorage`).
Recarregar não repete; fechar o navegador sim, e isso é o comportamento
correto para o teste.

### Medição

Tabela `oba_landing_eventos` no mesmo Supabase do app, chave anon, RLS
insert-only. Views de leitura: `oba_landing_resumo` (visitas, cliques e
abandono por variante) e `oba_landing_por_cta`.

Registra 1 impressão por sessão e 1 clique no primeiro CTA tocado.
"Saiu sem clicar" sai por subtração — evento de saída (`beforeunload`) é
pouco confiável no celular e perderia justamente quem mais interessa.

Os CTAs são identificados por `href`, `data-contato`, `aria-label` e texto
visível. NÃO dá para usar os `onClick="{{ }}"`: o dc-runtime os compila em
handlers React e eles somem do DOM.

O `fetch` usa `keepalive: true` — sem isso o clique que leva para
app.bariatrico.net seria cancelado no meio da navegação.

### Detalhes do dc-runtime que importam

O runtime esconde o `<x-dc>`, carrega React/ReactDOM do `vendor/` de forma
assíncrona e só então monta o `#dc-root`. Qualquer script que precise do site
renderizado tem de esperar `#dc-root .sc-host` existir.

A hero tem coreografia própria de ~2,4s (clip-path, título, cards com atraso
de 0,85 / 1,0 / 1,15s). A faixa deixa isso acontecer por baixo do desfoque.

### Duas notas antigas, medidas e corrigidas (09/09/2026)

**Tela branca até o React montar — RESOLVIDO** (commit `e056882`). O CSS do site
vive no bloco helmet do template e só é compilado quando o React monta, ou seja,
depois da janela em que a tela ficava branca. A correção é um `<style>` no `<head>`
REAL, antes do `support.js`, com `html, body { background: #14100E }` — o tom da
hero, das seções, do rodapé e do blog.

⚠ **Ao editar o `<head>` da landing, não escreva nome de tag entre `<` e `>` em
comentário.** O dc-runtime acha o início do template varrendo o FONTE CRU com
regex (`support.js:39`), não com o parser do navegador. Uma menção literal em
comentário faz ele começar o template no lugar errado e despejar o resto do
comentário como texto visível na tela. Aconteceu de verdade na primeira versão
dessa correção.

**O `fetch(location.href)` do `boot()` NÃO baixa o HTML duas vezes** — a anotação
anterior era pessimista. A home é servida com `max-age=0, must-revalidate` + ETag,
então o segundo pedido é condicional: volta `304` com 0 bytes de corpo. Medido em
produção: 1ª = 200 com 18.315 bytes (brotli), 2ª = 304 com 0 bytes.

O custo real, que não estava anotado: `updateHtml` (`support.js:1326`) recompila o
template e chama `registry.bump()` **incondicionalmente**, mesmo com o HTML
idêntico — um re-parse dos 66 KB e uma re-renderização completa a cada visita.
Verificado no navegador que isso **não remonta o DOM** (marquei o nó da hero e ele
sobreviveu): sem defeito visível, sem animação reiniciada, sem imagem recarregada.

DECISÃO (Estácio, 09/09/2026): **deixar como está.** Sobra uma ida à rede e um
pouco de CPU que ninguém percebe; as alternativas cobram caro demais — apagar o
re-fetch significa manter biblioteca de terceiro editada à mão (o `support.js` é
gerado, o `dc-runtime` NÃO está neste repo), e dar `max-age` à home é mexer no
cache de um site no ar para economizar um 304.

**Achado solto para conferir um dia:** o `vercel.json` da raiz manda
`no-cache, no-store, must-revalidate` para `/` e `*.html`, mas a produção responde
`max-age=0, must-revalidate`. Ou seja, esse `vercel.json` não governa a landing —
provavelmente `www.bariatrico.net` é um projeto Vercel separado apontando para
`site-bariatrico/`.

### Rastreamento de origem (UTM) — medição de marketing

⚠ **NÃO é o programa de indicação.** Não usa código de indicador, não gera
crédito e não paga ninguém por conversão — o parceiro é remunerado por
contrato de valor fixo, fora do sistema. Pagar por paciente trazido é captação
de clientela (ver a seção da reforma CFM acima). A separação é **estrutural**:
a origem vive em `oba_origem`, tabela que nenhuma função de crédito, desconto
ou vínculo enxerga.

**Como funciona.** A landing captura `utm_source/medium/campaign/content` da
URL, guarda num cookie próprio `oba_origem` de **90 dias** (paciente bariátrico
conhece, some por semanas e volta) e anexa a origem ao link do app no clique.
O app lê da URL, guarda em `localStorage.rf_utm` e registra em dois momentos:
cadastro e assinatura.

**Primeiro toque vence**, nos três lugares (cookie da landing, `rf_utm` do app,
e o `COALESCE` do `ON CONFLICT` na RPC). Quem descobriu por um influenciador e
voltou pelo Google continua sendo mérito do influenciador.

| onde | o quê |
|---|---|
| `site-bariatrico/intro-ab.js` §2.5 | captura, cookie, e `anexarOrigem()` no clique |
| `site-bariatrico/vercel.json` | **links curtos por parceiro — 1 linha cada** |
| `site-bariatrico/privacidade.html` | página autônoma; link no rodapé |
| `src/lib/origem.js` | `capturarOrigemDaUrl()` e `registrarOrigem(cpf, etapa)` |
| `migrate_oba_utm.sql` | 4 colunas em `oba_landing_eventos`, tabela `oba_origem`, RPC, view |
| view `oba_origem_resumo` | funil por parceiro, **ordenado por assinaturas** |

⚠ **ARMADILHAS:**
- **A captura fica ANTES das guardas do `intro-ab.js`.** As guardas dão `return`
  para robô, link com âncora e sessão que já viu a faixa. Depois delas,
  perderíamos a origem de quem volta pela 2ª vez e de quem chega por link com
  `#seção` — e esse parceiro viraria "(direto)". Só o REGISTRO obedece às guardas.
- **Cookie não atravessa domínio.** `bariatrico.net` ≠ `app.bariatrico.net`; a
  URL é o único caminho. Por isso o `anexarOrigem()` reescreve o `href` no clique
  em vez de o `index.html` ter os parâmetros fixos — assim qualquer CTA novo
  funciona sozinho.
- **Link curto NUNCA aponta para `?ind=` ou `?ref=`.** É a regra que mantém
  marketing e indicação separados: um parceiro pago com link de indicador vira
  indicador remunerado por conversão. Redirect é `permanent: false` (301 fica
  cacheado para sempre e trava a campanha).
- **`registrarOrigem` nunca derruba o fluxo:** é chamada depois do cadastro/da
  assinatura, sem `await`, e engole o próprio erro. Falha de medição perde
  atribuição; jamais um cadastro.
- **LGPD:** o cookie sozinho é anônimo; ao ligar a origem ao CPF em `oba_origem`
  ela vira dado pessoal associado a serviço de saúde. Por isso a tabela é enxuta
  (sem IP, sem user agent) e existe a `privacidade.html`.

### Para desligar o teste

Remover a linha `<script src="./intro-ab.js"></script>` do `index.html`.