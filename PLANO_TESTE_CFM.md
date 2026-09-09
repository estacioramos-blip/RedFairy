# Plano de teste — reforma ético-regulatória do programa de indicação

Data: 09/09/2026 · Motivo: CFM 2.336/2023 e CFM 2.170/2017 (captação de clientela).
Contexto: sistema ainda não lançado, banco sem dados reais.

## Ordem de execução (não pular)

1. **Deploy do front** (`git push` → Vercel).
2. **Rodar as 4 migrations no Supabase Dashboard → SQL Editor, nesta ordem:**
   `migrate_cfm_r1_valor_avaliacao.sql` → `migrate_cfm_r2_remove_comissao_indicacao.sql`
   → `migrate_cfm_r3_credito_so_abate.sql` → `migrate_cfm_r4_desconto_boas_vindas.sql`
3. **Admin → Configurações:** definir `Desconto de boas-vindas (R$)` e
   `Crédito por indicação (R$)`. Nascem em **0**, e com 0 o desconto simplesmente
   não é oferecido (melhor do que prometer um número que ninguém definiu).
4. Rodar os cenários abaixo.

> Por que o front primeiro: as migrations apagam funções que o app publicado ainda
> chama (`caixa_pagar_indicador`, `paciente_salvar_pix`, `salvar_pix_indicador`).
> Sem usuários isso não causa dano, mas quebraria o seu próprio teste.

---

## R1 — Médico recebe por AVALIAR (deve continuar funcionando)

**Cenário.** Entrar como médico (CRM 6302/BA) → AVALIAR → CPF de um paciente já
cadastrado → concluir a avaliação.

| verificar | esperado |
|---|---|
| Telegram da ADM | chega "🩺 Nova AVALIAÇÃO médica!" com o valor em US$ |
| VER MEUS CRÉDITOS | 3 contadores: AVALIAÇÕES / RECEBIDAS / A RECEBER. **Não** deve haver "CADASTRADOS" nem "AGUARDANDO" |
| Texto do modal | "Cada paciente que você **avalia**… vale US$ X" — valor vindo do banco |
| Caixa → A Pagar | o médico aparece com "N avaliação(ões)"; **nenhuma** menção a encaminhamento |
| SQL | `SELECT count(*) FROM creditos_avaliacao WHERE medico_crm='6302/BA';` → 1 |

**Falha se:** o crédito exigir que o paciente assine (não deve — é trabalho prestado),
ou se o valor sair diferente de `config.valor_usd_avaliacao`.

---

## R2 — Médico NÃO recebe por indicar (mas mantém o vínculo)

**Cenário A — encaminhar.** Médico → ENCAMINHAR → copiar o link `?ref=CRM`.
Abrir o link em aba anônima, cadastrar um CPF novo, pagar a anuidade (JÁ PAGUEI).

| verificar | esperado |
|---|---|
| Telegram | **NÃO** chega nenhuma mensagem de comissão/encaminhamento |
| SQL | `SELECT to_regclass('public.creditos_medico');` → **NULL** (tabela não existe) |
| Caixa → A Pagar | o médico **não** ganhou linha nova |
| Texto do QR | "Quem escanear entra no sistema já vinculado a você" — sem promessa de crédito |

**Cenário B — o vínculo tem de sobreviver (o teste mais importante).**
Com o mesmo par médico/paciente do cenário A:

```sql
SELECT public.medico_tem_vinculo('<cpf_do_paciente>', '6302/BA');   -- espera: true
```

Repetir para as outras origens de vínculo, uma a uma: paciente que o médico só
**triou**, paciente que ele só **avaliou**, e paciente cujo CPF ele **RECOMENDOU**
(`medico_encaminhar_cpf`). Todas devem devolver `true`.

**Falha se:** qualquer uma devolver `false` — significa médico sem acesso ao
prontuário do próprio paciente. É o risco nº 1 desta reforma.

---

## R3 — Crédito do paciente só abate, nunca sai

**Cenário.** Paciente A (cadastrado e pago) → INDICAR → copiar o link `?ind=`.
Paciente B entra pelo link, cadastra e paga. Depois, paciente A vai renovar.

| verificar | esperado |
|---|---|
| Telegram | "🤝 Nova indicação confirmada (paciente-indicador)" com o valor **em R$** e a frase "NÃO é pagamento em dinheiro" |
| Dashboard do A | card "🤝 Indique e ganhe descontos", saldo em R$, texto "abate da sua anuidade e dos seus documentos" |
| VER MEUS CRÉDITOS do A | contadores RESERVADOS / A USAR / JÁ USADOS + o aviso "não são sacados nem depositados em conta" |
| Tela de pagamento do A | linha "− seus créditos R$ X"; PIX gerado pelo valor líquido |
| **Não deve existir** | qualquer campo de chave PIX, titular, CNPJ ou "trocar minha chave" no fluxo de indicação do paciente |
| Caixa → A Pagar | seção INDICADORES **não existe mais** |
| Caixa → Encontro de Contas | botões ABATER ANUIDADE e ABATER DOCUMENTO. **PAGAR EXCEDENTE não existe** |

**Prova direta pelo banco:**

```sql
SELECT public.caixa_abater('<token_caixa>', '<cpf>', 'pix', 10, NULL);
-- espera: ok=false, "Tipo invalido. O credito de indicacao so abate ANUIDADE ou DOCUMENTO…"
```

---

## R4 — Leigo indica, o INDICADO ganha

**Cenário.** Abrir `app.bariatrico.net/?modo=indicador` numa aba anônima.

| verificar | esperado |
|---|---|
| Tela de entrada | pede **primeiro nome** e **celular (opcional)**. **Não pede CPF nem senha** |
| Após "GERAR MEU LINK" | aparece QR + link + "reservar CPF"; **não há** painel de créditos nem chave PIX |
| SQL | `SELECT cpf, nome, tipo FROM indicadores WHERE codigo='<IND…>';` → **cpf NULL**, tipo `leigo`, nome só o primeiro |
| Indicado entra pelo link | modal "VOCÊ FOI INDICADO POR: Maria" + "🎁 Você ganhou R$ X de desconto na sua primeira anuidade" |
| Tela de pagamento do indicado | linha "− boas-vindas R$ X"; PIX pelo valor líquido |
| Depois de o indicado pagar | **nenhum** crédito para o leigo: `SELECT count(*) FROM creditos_indicador WHERE indicador_codigo='<IND…>';` → **0** |
| Telegram | **nenhuma** mensagem de comissão |

**Segunda anuidade do mesmo indicado:** o desconto **não** se repete
(`desconto_boas_vindas` devolve `tem=false` quando já existe assinatura para o CPF).

**Com `desconto_boas_vindas_brl = 0`:** nenhuma tela deve prometer desconto.

---

## Teste de fechamento — NENHUM caminho gera saque, para nenhum público

Este é o teste que sustenta a reforma inteira. Rodar **depois** das 4 migrations.

```sql
-- 1. Nenhuma função paga indicador, nem menciona carteira digital
SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND (p.proname ILIKE '%pagar_indicador%' OR p.prosrc ILIKE '%usdc%');
-- espera: 0 linhas

-- 2. A tabela do crédito por conversão do médico não existe
SELECT to_regclass('public.creditos_medico');            -- espera: NULL

-- 3. As chaves de comissão por paciente trazido não existem
SELECT chave FROM public.config
 WHERE chave IN ('comissao_usd_por_conversao','comissao_usd_nao_afiliado');
-- espera: 0 linhas

-- 4. Indicador não tem mais para onde receber
SELECT column_name FROM information_schema.columns
 WHERE table_schema='public' AND table_name='indicadores' ORDER BY ordinal_position;
-- espera: id, codigo, cpf, nome, celular, tipo, ativo, created_at
-- (sem pix_chave, usdc_wallet, pix_titular, pix_titular_pj, pix_cnpj,
--  senha_klipbit, session_token_hash, session_token_exp, email)

-- 5. O único abatimento possível é uso da plataforma
SELECT DISTINCT tipo FROM public.abatimentos_paciente;   -- só 'anuidade' e 'documento'

-- 6. As funções que restaram e movem dinheiro são só do médico
SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'caixa_pagar%';
-- espera: apenas caixa_pagar_medico
```

**No front**, a mesma varredura:

```bash
grep -rniE "comiss[ãa]o|saque|sacar|excedente|dep[óo]sito|usdc" src/ site-bariatrico/index.html \
  | grep -viE "senha_klipbit|sacarato|não são sacados|nunca vira|NÃO há pagamento"
# espera: só comentários explicando o que foi removido
```

---

## Regressões a conferir (áreas vizinhas que a reforma tocou)

- **Login do médico e do paciente** continuam funcionando (mexemos em `indicadores`, não em `medicos`/`profiles` — mas `senha_klipbit` tem nome parecido; confirmar que ninguém confundiu).
- **Caixa → Extratos**: papel `medico` gera extrato só com avaliações; papel `indicador` e `paciente` abrem sem erro.
- **Caixa → Estorno**: só aceita papel `medico`. Papel `indicador` deve recusar com mensagem clara.
- **Admin → Configurações**: salvar a tela inteira e reabrir; os 4 valores devem persistir.
- **Termos de uso** (médico e paciente): ler os itens 3.1 e 5 na tela.
