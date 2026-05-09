# RedFairy — HANDOFF (08-09/05/2026)

## Contexto do projeto
- **Repo local:** `C:\Users\Estacio\Desktop\redfairy`
- **Repo remoto:** https://github.com/estacioramos-blip/RedFairy.git (branch main, sempre `git push` ao fim)
- **Stack:** React + Vite + Tailwind + Supabase (`pfzghybajniyesoiwrcp`) + Vercel
- **URL produção:** https://redfairy.bio
- **Médico:** Dr. Estácio Ferreira Ramos, CRM 6302/BA, WhatsApp 5571997110804
- **Decisão estratégica importante:** o sistema é **só para médicos com CRM** (não mais COREN/CREFITO/CRN/etc), com base em duas razões:
  1. Médicos prescrevem (geração de receita), interpretam hemogramas, podem direcionar pacientes
  2. Médicos gostam de exclusividade; parceiros (indústria farmacêutica) têm infra pra acessar esse público

## Arquivos-chave
- `src/App.jsx` — entry point. Linha 72 já corrigida: `modoDemo={false}` (médico não entra em modo demo)
- `src/components/Calculator.jsx` — 1700+ linhas. Contém:
  - `AuthMedico` (linhas 82-360, login/cadastro com 3 modos: hub|cadastro|login + tela cadSucesso)
  - `AdminConfigModal` (config admin)
  - `Calculator` wrapper (linha 480+)
  - `CalculatorForm` (form principal, linha ~530+)
  - `LabInput`, `CheckboxCard` (componentes auxiliares no fim)
- `src/components/AuthPage.jsx` — login/cadastro PACIENTE (RPC consume_triagem_on_signup)
- `src/components/PatientDashboard.jsx` — dashboard paciente
- `src/components/TriagemModal.jsx` — popup inicial de triagem
- `src/components/TriagemResultadoModal.jsx` — popup azul de resultado
- `src/components/LandingPage.jsx` — landing
- `src/components/BoasVindasModal.jsx` — modal pós-cadastro paciente
- `src/components/OBAModal.jsx` — anamnese bariátrica
- `src/engine/decisionEngine.js` — engine clínica
- `src/assets/welcome.png` — imagem programa de afiliados (usada no modal showAfiliados)
- `src/assets/fairy-chat.png` — imagem do convite afiliado (médico+casal)
- `src/assets/redfairy-hero.png` — hero da landing

## Banco Supabase
- Dashboard: https://supabase.com/dashboard/project/pfzghybajniyesoiwrcp
- Confirm email DESLIGADO
- RLS habilitado em: profiles, triagens, avaliacoes, oba_anamnese, pedidos_documento, assinaturas
- **RLS DESABILITADO** em: medicos (porque médicos não usam Supabase Auth, só CRM+senha_klipbit própria)
- Tabela `medicos` colunas: id, nome, crm, uf, celular, email, created_at, endereco, pix_chave, **senha_klipbit** (adicionada na sessão), **cep** (adicionada), **cpf** (adicionada)
- Limpa-banco padrão:
```sql
DELETE FROM avaliacoes; DELETE FROM oba_anamnese; DELETE FROM pedidos_documento;
DELETE FROM triagens; DELETE FROM assinaturas; DELETE FROM profiles;
DELETE FROM medicos; DELETE FROM auth.users;
```
- Limpar localStorage: F12 → Console → `localStorage.clear()`

## ===========================================================
## O QUE FOI FEITO NESTA SESSÃO (tudo commitado e pushed)
## ===========================================================

### Sessão 1 — Bugs e redesign do dashboard paciente
- ✅ Fix bug bariátrica não gravar no INSERT do TriagemResultadoModal
- ✅ Fix bug gestante não pré-preencher (useEffect calcula semanas atuais)
- ✅ Decisão "triagem não vira histórico" via RPC `consume_triagem_on_signup` (SECURITY DEFINER)
- ✅ Migrations: profiles ganhou bariatrica, gestante, semanas_gestacao_triagem, data_triagem_gestacao
- ✅ Redesign histórico vazio do PatientDashboard (caminho bariátrica vs não-bariátrica)
- ✅ Modal de despedida + pedido gratuito + toast WhatsApp + logout
- ✅ Texto: "Hemograma" → "Eritrograma" no decisionEngine
- ✅ Texto PARABÉNS reescrito (tira "se estiverem normais e", caso contrário "se você fez ou está em tratamento")

### Sessão 2 — Fluxo médico afiliado
- ✅ Convite afiliado pós-primeira-avaliação (modal com fairy-chat.png + texto persuasivo + checkbox "AGORA NÃO" recusa em 3s)
- ✅ Bug: App.jsx linha 72 `modoDemo={!localStorage.getItem('medico_crm')}` corrigido pra `modoDemo={false}` (médico não entra como demo)
- ✅ Removido bloqueio `if (!cadastrado) return <AuthMedico>` em Calculator (médico avalia LIVRE)
- ✅ Modal showAfiliados redesenhado: imagem welcome.png, CEP separado, CPF, 3 checkboxes mutuamente exclusivos pra Pix (telefone/cpf/email), placeholder "Chave aleatória ou outra chave PIX", subtextos vermelho escuro
- ✅ Tabela medicos ganhou colunas cep, cpf, senha_klipbit (RLS desabilitado)
- ✅ Tela "Cadastro concluído" com botão Entrar → leva ao modo login
- ✅ Olho na senha (mostrar/ocultar) no cadastro e login
- ✅ Link "Esqueci a senha" + modal placeholder com WhatsApp
- ✅ Auth Médico em 3 modos: hub | cadastro | login (mas Hub vai ser eliminado — ver abaixo)
- ✅ Botão "Voltar" agora retorna pro convite (via prop onVoltarParaConvite) em vez do hub
- ✅ Convite ganhou link "Já sou afiliado? Entrar" → vai DIRETO pra modo login
- ✅ Triagem do médico: borda vermelha no campo "Semanas de gestação"
- ✅ TriagemResultadoModal: botões "← Voltar ao início" → "Continuar" (sem seta)
- ✅ Cadastro: removido CRM- prefix do conselhoLimpo (login agora aceita só "6302/BA")
- ✅ Removido dropdown "Tipo de Conselho" (só CRM agora)
- ✅ Renomeado "Número do Conselho/UF" → "Número do CRM/UF"
- ✅ Subtextos "login permanente" e "senha de acesso" em vermelho escuro
- ✅ Tela cadastro: removido retângulo rosa "Informe seus dados..."

## ===========================================================
## PENDÊNCIAS — CADA UMA TESTÁVEL, EM ORDEM DE PRIORIDADE
## ===========================================================

### A) Bugs/ajustes pequenos imediatos do fluxo médico (curtos)

**A1. Hub não está sendo eliminado.** Apesar do código `setShowAuthMedicoOverlay('cadastro')` (linha 1670 Calculator.jsx) e `modoInicial={typeof showAuthMedicoOverlay === 'string' ? showAuthMedicoOverlay : 'cadastro'}` (linha 1712), o usuário relata que o Hub aparece quando clica "Cadastrar agora". Investigar HMR ou outro disparo. **Solução possível:** verificar se em algum lugar `setShowAuthMedicoOverlay(true)` ainda é chamado. Roda `findstr /n "setShowAuthMedicoOverlay" src\components\Calculator.jsx` antes.

**A2. Auto-preenchimento do Login com email errado.** Após "Cadastrar agora", a tela "Cadastro concluído" tem botão Entrar → que faz `setLoginConselho(conselho.trim().toUpperCase())`. O usuário relata que o campo CRM/UF aparece preenchido com "CEOCYTOMIC" (que é "ceo@cytomica.com" sem `@`, em maiúsculas, cortado em 12 chars pelo `formatarConselho`). **Diagnóstico:** `conselho` state está vindo errado. **Solução:** simplesmente não pré-preencher. Trocar por `setLoginConselho('')`.

**A3. Modal showAfiliados imagem cortada.** A welcome.png aparece cortada no topo (220px). Tentamos animação blur (deu ruim) e voltamos pro padrão de 220px que ainda corta. Talvez aumentar pra 280-320px ou redimensionar a imagem fonte.

**A4. Tela "Cadastro concluído" sem identidade visual.** Aparece simples, fundo escuro, ícone 🎉, sem destaque. Falta "Bem-vindo(a) ao RedFairy", logo, talvez fundo gradiente bordô.

**A5. Acentuação tela "Estamos felizes":** "voce" → "você", "PROGRAMA" (já tá ok), "Conheca os beneficios" → "Conheça os benefícios", "inicio" → "início".

**A6. Acentuação tela "Benefícios":** "Conteudo em desenvolvimento" → "Conteúdo em desenvolvimento", "lista detalhada dos beneficios" → "benefícios", botão "x" → "✕".

### B) Nova feature — Histórico do paciente para o médico (escopo definido)

Médico afiliado, ao digitar CPF na triagem, **assim que digita** o CPF completo:

1. Sistema busca CPF nas tabelas:
   - `profiles` (paciente cadastrado)
   - `triagens` (triagens órfãs com CPF)
   - `avaliacoes` (avaliações completas)

2. **Se 1 só registro encontrado:** comportamento atual (médico segue triagem normal).

3. **Se 2 ou mais registros (avaliações):**
   - Sistema mostra **GRÁFICO de evolução** (Hb/VCM/RDW/Ferritina/Sat) já existente no código (mas no atual handoff não localizamos — buscar `recharts`, `<svg>`, `EvolucaoChart` etc.)
   - **Sem mencionar nome dos médicos** que fizeram as avaliações antigas
   - Médico pode adicionar nova avaliação completa (com Ferritina/Sat)

4. **Privacidade:** decisão estratégica do Dr. Estácio: as informações são do paciente, não do médico. Adicionar essa cláusula nos Termos de Uso (TC) do médico afiliado e do paciente.

5. **Atualizar TC** (Calculator.jsx linhas ~52-72 e PatientDashboard se houver).

### C) Pendências da sessão anterior (médio prazo)

- **Tela de pagamento (placeholder)** — antes de Stripe real (Fase 8 do roadmap)
- **Stripe** — integração completa (Fase 8)
- **Módulo ADM para `pedidos_documento`** — notificação no painel ADM quando pedido criado, lista pendentes, status
- **TC em Calculator.jsx** — revisão jurídica (Termos profissionais médicos)
- **UNIQUE constraint em `profiles.cpf`** — evitar duplicidade de pacientes
- **Atalhos demo Ctrl+Shift+M/F/B/G** ainda preenchem `idade` direto — mantidos a pedido do usuário pra testes (úteis em algoritmo + OBAModal)

### D) Pendências de polish/UX (longo prazo)

- **Renomear `senha_klipbit`** → `senha_hash` (cosmético, evitar confusão futura)
- **Padrão visual unificado em todos os modais** — usuário curtiu o convite (fairy-chat). Aplicar em outros modais: BoasVindasModal, modal Felicitações etc.
- **Recuperação de senha real** (hoje só link WhatsApp, ver A do Hub) — exigirá Supabase Auth ou serviço de email com token

## ===========================================================
## FLUXOS COMPLETOS — REFERÊNCIA RÁPIDA
## ===========================================================

### Fluxo Médico (Primeiro Acesso)
1. Click "Sou Médico" na landing
2. Triagem (CPF, sexo, DN, gestante, bariátrica, Hb, VCM, RDW)
3. Click "Avaliar Triagem"
4. Popup azul ERITRON (modo médico) → click "OK, entendi"
5. Popup "Triagem salva" + (se bariátrica) "Doutor, paciente bariátrico..." → click "Continuar" (SEM SETA)
6. **Convite afiliado** com fairy-chat.png:
   - Botão "Cadastrar agora" → vai pra modo cadastro DIRETO (sem Hub) ⚠ ainda passa por Hub (A1)
   - Link "Já sou afiliado? Entrar" → vai pra modo login DIRETO
   - Checkbox "AGORA NÃO, OBRIGADO" → texto vermelho 3s → landing
7. **Cadastro:**
   - Sem dropdown Tipo de Conselho
   - Campos: Nome, CRM/UF (ex 6302/BA), Celular/WhatsApp, Email, Senha (com olho)
   - Box verde "Programa de Afiliados"
   - Checkbox aceito TC
   - Botão "Criar acesso →"
   - Botão "← Voltar" no rodapé
8. **Tela "Cadastro concluído!"** 🎉
   - "Você agora deve entrar como MÉDICO AFILIADO..."
   - Botão "Entrar →" (leva pro modo login com campo pré-preenchido — mas vem com bug A2)
9. **Login:**
   - Campos: CRM/UF, Senha
   - Botão "Entrar →"
   - Link "Esqueci a senha" → modal placeholder WhatsApp
   - Botão "← Voltar" no rodapé
10. **Modal showAfiliados** (Programa de Afiliados Patrocinado):
    - Imagem welcome.png no topo (cortada — A3)
    - Texto: "Para concluir a sua inscrição..."
    - Endereço completo
    - CEP
    - CPF
    - Chave Pix:
      - 3 checkboxes mutuamente exclusivos (Telefone/CPF/Email)
      - Subtexto vermelho "DIGITE ou marque um check-box acima"
      - Campo input "Chave aleatória ou outra chave PIX"
    - Subtexto vermelho "Entre seus dados tranquilamente..."
    - Botão "Confirmar dados →" (valida campos)
    - Botão "Preencher depois"
11. **Tela Felicitações** (após salvar afiliado): "Estamos felizes de ter você no PROGRAMA" + link "Conheça os benefícios" (placeholder em desenvolvimento)
12. **Click "Ir para o início"** → landing
13. **Login subsequente** (médico já cadastrado):
    - Click "Sou Médico" → entra DIRETO no Calculator (porque localStorage tem `medico_crm`)
    - Faz nova avaliação normalmente
    - **Pendência B:** ao digitar CPF, se já houver 2+ avaliações, mostrar gráfico de evolução

### Fluxo Paciente (testar próximo)
- Click "Sou Paciente" (ou "Paciente Cadastrado")
- Triagem → resultado → cadastro com CPF/dados
- AuthPage faz signUp + chama RPC consume_triagem_on_signup (que copia dados da triagem órfã pro profile)
- Vai pro PatientDashboard
- Histórico vazio mostra:
  - Bariátrica → botão "Iniciar Anamnese OBA"
  - Não-bariátrica → "Você já tem ferritina/sat?" Sim/Não

### Fluxo Médico Afiliado (botão "MÉDICO AFILIADO" da landing)
- Hoje leva pro mesmo lugar que "Sou Médico" (`onModoMedico` em ambos)
- **Decisão pendente:** o que esse botão deve fazer? Talvez: levar pra seção informativa "Programa de Afiliados" (já existe `showAfiliados` na LandingPage, página descritiva pra empresas/filantropos)

## ===========================================================
## WORKFLOW (lições)
## ===========================================================

- **Scripts Python** com backup `.bak_pre_<sufixo>` antes de modificar (já cobertos por `.gitignore` patrono `*.bak*`)
- **HMR pode mascarar mudanças** — sempre `Ctrl+Shift+R` no navegador depois de rodar script
- **localStorage acumula sujeira** entre testes — limpar com `localStorage.clear()` no console SEMPRE
- **Encoding** — Calculator.jsx é UTF-8. Scripts Python usar `encoding="utf-8"` em read/write
- **Quando script encadeado falha**, melhor entregar arquivo .jsx completo do que tentar 5 substituições
- **Não fazer scripts gigantes** — pequenos, testáveis um a um
- **Backups acumulam** — `*.bak*` no `.gitignore` resolve

## ===========================================================
## COMANDOS ÚTEIS
## ===========================================================

```bash
# verificar arquivo
findstr /n "padrao" src\components\Calculator.jsx

# ler trecho
powershell -Command "Get-Content src\components\Calculator.jsx | Select-Object -Skip 100 -First 50"

# build
npm run build

# dev
npm run dev

# git
git add -A
git status
git commit -m "feat: descricao curta"
git push
```

## ===========================================================
## COMO RETOMAR EM NOVO CHAT
## ===========================================================

Cole essa mensagem inicial no novo chat:

> Continuando RedFairy. HANDOFF.md está na raiz do projeto em `C:\Users\Estacio\Desktop\redfairy\HANDOFF.md`. 
> 
> Antes de começar, leia o handoff completo. Vou começar atacando o item **A1 (Hub não eliminado)** porque trava o fluxo do médico. Depois A2 (auto-preenchimento errado), A3 (imagem cortada), A4 (tela cadastro concluído sem visual), A5/A6 (acentos), e só então a feature B (histórico do paciente com gráfico).
> 
> Por favor, comece com `findstr /n "setShowAuthMedicoOverlay" src\components\Calculator.jsx` pra investigar A1 antes de codar.

---

**Última atualização:** 09/05/2026  
**Última sessão:** longa, várias correções no fluxo médico afiliado, bugs de Hub e auto-preenchimento ainda pendentes.  
**Branch:** main, atualizado no remoto.
