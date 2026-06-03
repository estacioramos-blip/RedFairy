---
title: RLS Gateway — Plano de Segurança de Dados
type: security-plan
status: draft (etapa 1 — mapeamento)
version: "0.1"
updated: "2026-06-03"
---

# RLS Gateway — Plano (DEC-008, passo final)

> **Objetivo:** ligar o RLS no Supabase e parar de expor os dados das tabelas
> sensíveis à *anon key* (LGPD: dados de saúde + CPF; chave Pix). Hoje o RLS
> está **desligado** (DEC-002) e o app faz **74 acessos diretos** a tabelas
> com a anon key, lendo/escrevendo tudo.

## Modelo escolhido: **gateway por RPC**

A auth do RedFairy é **RPC + `localStorage`** (não Supabase Auth), então **não
existe `auth.uid()`**. Logo, as políticas de RLS não conseguem dizer "este
usuário só vê o dele". O modelo viável é:

1. **Ligar RLS** e **negar `anon`/`authenticated`** nas tabelas sensíveis.
2. Todo acesso passa a ser via funções **`SECURITY DEFINER`** (que rodam com
   privilégio elevado e furam o RLS de forma controlada).
3. Cada função faz a sua própria checagem com a credencial recebida.

## ⚠️ A falha estrutural que o mapeamento revelou

Sem token de sessão, **as leituras de dados por CPF/CRM são falsificáveis**:
hoje o PatientDashboard lê `avaliacoes`/`triagens`/`profiles` **por CPF**, sem
re-verificar a senha. Se isso virar uma RPC `get_avaliacoes(cpf)`, **qualquer
um** pode chamar com qualquer CPF e ler o histórico de saúde de outro.

> **O RLS sozinho NÃO resolve isso.** Para isolamento real por paciente é
> preciso uma **credencial nas leituras** — ex.: o `login_paciente` passa a
> devolver um **token** (string aleatória guardada no profile), e cada RPC de
> leitura exige `(cpf + token)`. É a decisão que destrava a Fase 2.

Para o **médico/admin** o mesmo vale: leituras precisam exigir senha/token, não
só o CRM.

---

## Mapa por tabela (74 acessos)

| Tabela | Sensibilidade | O que tem | Acessos diretos hoje | Proteção proposta |
|---|---|---|---|---|
| **profiles** | 🔴 Alta | CPF, **hash de senha**, nome, sexo, nascimento, gestante | SELECT/INSERT/UPDATE em AuthPage, PatientDashboard, ResultCard, TriagemModal, TriagemResultadoModal, CompletarPerfilModal, LandingPage, BoasVindasModal | RLS deny; RPCs com token. `SELECT *` (PatientDashboard:120) **vaza o hash** — cortar colunas. |
| **avaliacoes** | 🔴 Alta (LGPD) | diagnóstico, hemograma, CPF | INSERT/SELECT em Calculator, AdminPage, AuthPage, PatientDashboard, ResultCard, TriagemResultadoModal | RLS deny; `insert_avaliacao` (RPC) + `get_avaliacoes(cpf, token)` |
| **triagens** | 🔴 Alta (LGPD) | hemograma, CPF | INSERT/SELECT em PatientDashboard, ResultCard, TriagemModal, TriagemResultadoModal | RLS deny; RPC com token |
| **oba_anamnese** | 🔴 Alta (LGPD) | anamnese bariátrica completa | INSERT/SELECT/UPDATE em Calculator, AdminPage, OBAModal | RLS deny; RPC com token |
| **medicos** | 🔴 Alta | hash senha, **CPF, Pix**, email | SELECT/UPDATE em Calculator, LandingPage | RLS deny; `get_medico`/`update_medico` (RPC, sem expor senha/cpf/pix a terceiros) |
| **config** | 🟠 Média-Alta | **chave Pix**, preços | SELECT/UPSERT em AdminPage, Calculator, ResultCard | RLS deny escrita p/ não-admin; leitura do Pix via RPC mínima (o Pix é mostrado p/ pagar, mas escrita é só admin) |
| **assinaturas** | 🟠 Média | dados de assinatura/pagamento | INSERT/SELECT em AuthPage, PatientDashboard, PagamentoCadastroModal | RLS deny; RPC com token |
| **pedidos_documento** | 🟠 Média | pedidos de documento médico | INSERT em BoasVindasModal, PatientDashboard, ResultCard | RLS deny; `criar_pedido` (RPC) |
| **leads_comerciais** | 🟠 Média | contato de leads | INSERT em ResultCard | RLS: permitir só INSERT anon (sem SELECT) |
| **medicamentos** | 🟢 Baixa | catálogo de drogas (público) | SELECT em ResultCard/AdminPage; UPDATE em AdminPage | RLS: **SELECT liberado p/ anon**; escrita só admin (RPC) |

**RPCs já existentes (parte do gateway):** `login_medico`, `register_medico`,
`complete_medico`, `login_paciente`, `register_paciente`, `lookup_cpf_triagem`,
`consume_triagem_on_signup`.

---

## Plano em fases (cada fase testável, sem derrubar produção)

**Fase 0 — Token (pré-requisito): ✅ FEITO (2026-06-03)**
`migrate_token_sessao.sql`: colunas `session_token_hash`/`session_token_exp` em
`profiles`/`medicos`; `login_*`/`register_*` emitem token (hash sha256, 30 dias);
funções-crachá `token_medico_ok`/`token_admin_ok`/`token_paciente_ok` para as
RPCs das próximas fases. Cliente guarda `medico_token`/`paciente_token` no
localStorage (login/cadastro) e limpa no logout. Não-destrutivo.

**Fase 1 — Tabelas fáceis (baixo risco):**
- `medicamentos`: ligar RLS, liberar SELECT anon, escrita via RPC admin.
- `leads_comerciais`: RLS com só INSERT anon.
- `config`: escrita só admin; revisar a leitura do Pix.

**Fase 2 — Dados de saúde (o núcleo, alto valor):** converter `avaliacoes`,
`triagens`, `oba_anamnese`, `profiles` para RPCs com token; depois ligar RLS
deny. **Fazer em staging**, uma tabela por vez, com o app ainda funcionando.

**Fase 3 — Médico/admin:** `medicos` e escrita de `config` via RPC; gate de
admin server-side (hoje é client-side via `medico_is_admin`).

**Regra de ouro:** **converter o código para RPC ANTES de ligar o RLS** de cada
tabela. Se ligar antes, o app quebra naquele fluxo.

---

## Decisão (2026-06-03): **(A) Token de sessão simples** ✅

Escolhido o **token/crachá**: o login (`login_paciente`/`login_medico`) passa a
gerar um token aleatório, guardado no `profiles`/`medicos` (hash do token) e
devolvido ao cliente (localStorage). Cada RPC de leitura/escrita sensível exige
`(cpf/crm + token)` e valida antes de responder. Para o admin, soma-se a
checagem `is_admin`.

**Implicação de sequência:** a escrita de `medicamentos`/`config` no admin
**também** depende do token (o gateway não distingue admin sem credencial).
Logo, o **token é a peça-chave** — é o primeiro a construir, antes mesmo da
Fase 1, porque as Fases 1 (escrita admin) e 2 (leituras de paciente) dependem
dele.

**Ordem de execução acordada:** construir o **token** → Fase 1 (tabelas fáceis)
→ Fase 2 (dados de saúde) → Fase 3 (médico/admin). Tudo em staging, uma tabela
por vez, código→RPC **antes** de ligar o RLS.

**Descartado:** (B) Supabase Auth (reescrita grande, ver DEC-008); (C) gateway
sem token (não isola paciente-a-paciente) — talvez só para tabelas não-críticas.
