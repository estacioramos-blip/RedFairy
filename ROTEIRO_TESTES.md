# ROTEIRO DE TESTES — 3 FLUXOS + INTEGRAÇÕES (02/07/2026)

> Cobre tudo que mudou hoje: fix do AVALIAR do médico, `?ind=` do indicador,
> reserva 3 meses, ícones PWA por papel, hemograma do OBA → avaliações,
> comissão 1x na vida, mensagem honesta, e o CAIXA.
>
> **Regra de ouro dos testes:** antes de CADA cadastro com CPF novo no mesmo
> aparelho, abra `redfairy.bio/?reset=1` (limpa credenciais/rascunhos do navegador).
> Tenha à mão 3 CPFs de teste válidos (gerador 4devs) — chame de **CPF-A**,
> **CPF-B**, **CPF-C** — e anote quem é quem.

---

## FASE 0 — PREPARAÇÃO (desktop)

1. **Limpar o banco de teste:** Supabase Dashboard → SQL Editor → rodar o bloco do
   `migrate_limpar_teste.sql` (preserva o admin 6302/BA com 4DOC).
2. **Conferir a cotação do dólar:** entrar no ADMIN → Configurações → `cotacao_dolar`
   preenchida (ex.: 5.50). *As baixas do CAIXA recusam sem cotação.*
3. **Conferir valores:** `comissao_usd_por_conversao` = 10 · `comissao_usd_nao_afiliado` = 15
   · `valor_anuidade` = 149.90.
4. No celular Android, abrir `redfairy.bio/?reset=1` também (limpa o aparelho de teste).

---

## FASE 1 — FLUXO DO MÉDICO (desktop)

5. `redfairy.bio/?modo=medico` → deve abrir o **card de login** do médico (não a landing).
6. Logar com **CRM 6302/BA** → deve cair na **bifurcação**: AVALIAR · ENCAMINHAR · VER CRÉDITOS.
7. **[FIX B1 — o crítico]** Ir ao formulário de avaliação manual (Calculator), preencher
   um hemograma SEM CPF, clicar no botão azul que **libera Ferritina/Sat. Transferrina**,
   preencher as duas e clicar **AVALIAR PACIENTE** → deve calcular e mostrar o
   **ResultCard normalmente** (antes: tela morta/travada). ✅ = fix funcionou.
8. **ENCAMINHAR:** abrir o QR → o link copiado deve ser `redfairy.bio/?ref=6302/BA`.
   Guardar esse link (vai ser usado na Fase 4).
9. **RECOMENDAR pelo CPF:** digitar o **CPF-B** → mensagem deve dizer
   **"Encaminhamento registrado por 3 meses! ... Registrar de novo renova o prazo."**
   (menção aos 3 meses = regra nova no ar).

---

## FASE 2 — FLUXO DO PACIENTE BARIÁTRICO (celular, ou desktop em aba anônima)

10. Abrir **bariatrico.net** → conferir o popup "Como Funciona → Sou Médico": o texto
    deve falar das **duas formas de ganho (15 avaliação / 10 cadastro sob CRM)**.
11. Clicar **"VAMOS!..."** (Sou Bariátrico) → deve cair na entrada do OBA
    (`?oba=1`), **não** na landing do RedFairy.
12. Cadastrar com **CPF-A** + senha → completar perfil (nome, nascimento, sexo, e-mail
    opcional) → seguir o fluxo: pagamento PIX (marcar **JÁ PAGUEI**) → triagem
    (digitar um hemograma) → **OBA Modal**: anamnese → exames → **relatório BASELINE**
    aparece com Estado Geral Clínico.
13. Concluir o OBA → sair/fechar.
14. **Reentrada pelo fluxo do já-conhecido:** abrir `redfairy.bio/?oba=1` →
    deve **pular o cadastro** e cair na bifurcação **ENTRAR / INDICAR / VER** com
    NOME·CPF do CPF-A no rodapé.
15. **[FIX A1]** Tocar **ENTRAR** → o OBA abre pedindo o **novo hemograma** na etapa
    de exames. Digitar valores DIFERENTES da triagem (ex.: Hb 11,0) com data de hoje
    → concluir até o relatório.
16. **[VERIFICAÇÃO A1]** No desktop, logar como médico → **AVALIAR** → digitar o
    **CPF-A** → o OBA do médico deve abrir **já com o hemograma novo do passo 15**
    (não pede pra digitar de novo). ✅ = hemograma do OBA virou avaliação.
17. **[VERIFICAÇÃO A1-b]** (opcional) Como paciente, abrir o gráfico/histórico →
    o hemograma do passo 15 deve aparecer como um ponto novo.

---

## FASE 3 — FLUXO DO INDICADOR (desktop, aba anônima)

18. `redfairy.bio/?modo=indicador` → cadastrar um **indicador puro** (CPF-C + senha
    + PIX) → painel abre com INDICAR / VER MEUS CRÉDITOS.
19. **[FIX B2]** Abrir INDICAR → o link mostrado deve ser
    **`redfairy.bio/?oba=1&ind=INDxxxxxx`** (novo formato: `?ind=`, não mais `?ref=`).
    **Copiar e guardar** (Fase 4).
20. **RESERVAR um CPF:** digitar o **CPF-B** → mensagem
    **"CPF reservado por 3 meses!..."**.
21. **VER MEUS CRÉDITOS** → painel deve abrir normalmente (logado) e a comissão
    exibida deve ser **US$ 10** (não 15 — era o bug de exibição).
22. **[FIX A4 — mensagem honesta]** No celular (onde o CPF-A é paciente): abrir o
    app do paciente → **INDICAR** (isso torna o CPF-A um paciente-indicador). Depois,
    em aba anônima do desktop, ir a `?modo=indicador` e tentar **entrar com o CPF-A**
    → a mensagem deve ser **"Você já indica pelo seu app de PACIENTE..."**
    (antes: o falso "CPF não encontrado").

---

## FASE 4 — INTEGRAÇÕES DE CRÉDITO (o coração 💰)

23. **Link do indicador com rótulo certo:** em aba anônima, abrir o link `?oba=1&ind=...`
    guardado no passo 19 → deve cair na **entrada do bariátrico**. Cadastrar com o
    **CPF-B** → no completar perfil, deve aparecer a escolha **"VOCÊ FOI INDICADO POR"**
    com **DOIS candidatos**: o médico 6302/BA (RECOMENDAR do passo 9) **e** o
    **indicador (CPF-C)** — **rotulado como indicador, não como "médico"**.
    *(Isso testa: last-touch acabou → o paciente escolhe.)*
24. Escolher o **INDICADOR** → concluir o pagamento (JÁ PAGUEI) → **Telegram do ADM**
    deve receber **"💸 Nova indicação paga (INDICADOR)!"** com o nome/PIX do CPF-C.
25. **Crédito no lugar certo:** `?modo=indicador` → logar com CPF-C → VER MEUS
    CRÉDITOS → deve listar 1 crédito (…3 últimos dígitos do CPF-B) como **pago**.
26. **[A3 — comissão 1x na vida]** (verificação técnica, opcional) No SQL Editor:
    `SELECT * FROM creditos_indicador; SELECT * FROM creditos_medico;` → o CPF-B
    deve estar em **UMA tabela só** (indicador), nunca nas duas.

---

## FASE 5 — CAIXA (desktop)

27. `redfairy.bio/?modo=caixa` → tela de senha própria (fundo escuro, dourado).
28. Entrar com **`oba2026`** → **TROCAR SENHA** no topo (usar uma sua) → sair e
    entrar de novo com a senha nova. ✅ = auth funcionando.
29. **📥 Entradas:** deve listar a(s) anuidade(s) paga(s) (CPF-A, CPF-B) com nome,
    CPF completo e valor. Carimbar **NF** numa delas (digitar um nº) → vira "NF ✓ nº …".
30. **📤 A Pagar:** o indicador CPF-C deve aparecer com 1 crédito = US$ 10 ≈ R$ (cotação).
    Clicar **MARCAR PAGO** → confirmar → toast com o valor **congelado** e a cotação.
    Recarregar a aba → CPF-C sumiu da lista de devidos.
31. **🤝 Encontro de Contas:** fazer o CPF-A (paciente-indicador) ter um crédito:
    repetir o ciclo — INDICAR do CPF-A gera link `?ind=`, cadastrar um 4º CPF por ele
    e pagar. Voltar ao CAIXA → o CPF-A aparece com saldo (1 crédito ≈ R$ 55).
    - Testar **ABATER ANUIDADE** → deve estar **desabilitado** (saldo < R$ 149,90). ✅
    - **ABATER DOCUMENTO** → digitar R$ 20 → saldo cai R$ 20.
    - **PAGAR EXCEDENTE** → aceitar o valor sugerido → saldo zera.
32. **🧾 Extratos:** gerar o extrato do **CPF-C** (indicador) → texto deve mostrar
    a indicação, o valor pago congelado e os totais → **COPIAR** e conferir que o
    texto está WhatsApp-apresentável. Gerar também o do **CPF-A** (paciente) →
    deve listar créditos + abatimentos + saldo.
33. **🗂️ Notas Fiscais:** o painel deve mostrar 1 recebimento COM NF (passo 29)
    e os demais como PENDENTES; e o pagamento do passo 30 como NF pendente.

---

## FASE 6 — ÍCONES PWA (Android)

34. **[FIX do sequestro]** Tocar o ícone **"OBA i"** → deve abrir o **painel do
    indicador pedindo CPF/senha** — NÃO mais a tela do paciente com AVALIAR. ✅
35. Ícone **"OBA m"** → card de login do médico.
36. Ícone **"OBA p"** (ou o da fada) → reentrada passwordless do paciente (CPF-A),
    caindo na bifurcação ENTRAR/INDICAR/VER.
37. **Bounce:** com o app do paciente aberto, dar F5 / reabrir `redfairy.bio` sem
    parâmetro → deve voltar pro **bariatrico.net** (nunca a landing do RedFairy).

---

## EXTRAS RÁPIDOS (se der tempo)

38. **Link antigo de indicador** (`redfairy.bio/?ref=INDxxxxxx` com o código do CPF-C):
    deve continuar funcionando (o app reconhece o formato e roteia certo).
39. **Ref lixo** (`redfairy.bio/?ref=ABC123`): cadastro deve seguir normal e NENHUM
    crédito/encaminhador fantasma deve aparecer (lixo é descartado).
40. **?reset=1** entre testes: depois dele, nenhum resíduo (encaminhador, rascunho,
    sessão do caixa) deve sobrar.

---

### O que anotar quando algo falhar
- O **número do passo**, o que apareceu na tela (print ajuda) e o CPF usado.
- Se envolver crédito: o que o **Telegram do ADM** recebeu (ou não recebeu).
