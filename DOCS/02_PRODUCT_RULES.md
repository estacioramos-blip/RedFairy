---
title: Product Rules
type: rules
status: active
version: "1.0"
updated: "2026-05-31"
---

# RedFairy — Product Rules (V1.0 LOCKED)

Definem comportamento **não-negociável** de produto, técnica e design.
Um pedido que conflite com estas regras → propor mudança no doc PRIMEIRO, não apenas construir.

---

## Rule 1 — Tech Stack (LOCKED)

- **Framework:** React 19 + Vite 8
- **Hospedagem:** Vercel (push em `main` → auto-deploy → **redfairy.bio**)
- **Estilo:** Tailwind CSS 3.4
- **Banco / Auth:** Supabase (Postgres) — projeto `pfzghybajniyesoiwrcp`
- **Gráficos:** recharts · **QR Code:** qrcode.react
- **Linguagem:** **JSX / JavaScript puro** (NÃO TypeScript). Não introduzir TS sem decisão registrada.
- **Gerenciador de pacotes:** npm (`package-lock.json` é o lockfile).

Sem novas dependências ou mudança de stack sem entrada em `90_DECISION_LOG.md`.

**Build/validação local antes de propor commit:**
- Projeto inteiro: `npm run build` (vite, ~647 módulos, ~6–8s)
- JSX isolado: `npx esbuild --loader:.jsx=jsx --bundle=false ARQUIVO --outfile=/tmp/out.js`
- JS puro: `node --check ARQUIVO`

---

## Rule 2 — Segurança (NON-NEGOTIABLE)

- **Nunca commitar segredos.** `.env*` fica gitignored. Chaves em env vars / secret store, nunca no código.
- **Sem fallback de segredo:** nunca `process.env.SECRET || "fallback"` — falhar se faltar.
- **Chaves de API são backend-only** — nunca no bundle do browser/cliente.
- Toda mutação de API: rate limiting → auth check → validação de input, nessa ordem.
- Comparar segredos com comparação time-safe, nunca `===`.

> ⚠️ **DÍVIDA DE SEGURANÇA CONHECIDA (estado real, não aspiracional):**
> **O RLS (Row-Level Security) está DESABILITADO** nas tabelas principais do Supabase
> (`profiles, medicos, triagens, avaliacoes, assinaturas, pedidos_documento, oba_anamnese, config`).
> O padrão de mercado é RLS ligado + ≥1 policy por tabela. Isso está em aberto **propositalmente
> por ora** e registrado em `90_DECISION_LOG.md`. Antes de qualquer endpoint público novo que
> toque essas tabelas, reavaliar. **Não documentar como se estivesse ligado.**

---

## Rule 3 — Design / UX Standards

- **Identidade:** marca **RedFairy®** sempre com o ®. Paleta vinho/*wine* + *cherry* como acento.
- **Mobile-first.** Detecção de mobile: `window.matchMedia('(hover: none), (pointer: coarse)').matches`.
- Estados de carregamento e erro em toda tela. Sem becos sem saída.
- UI consistente; ao construir/redesenhar interface, usar a skill **frontend-design**.
- Acessibilidade: labels, contraste, foco.
- Warnings cosméticos conhecidos (não são bug): Recharts "width(-1)/height(-1)".

---

## Rule 4 — Práticas de Engenharia ("Parceria Tango")

1. **Inspecionar antes de mudar.** Ler o trecho relevante antes de editar.
2. **Perguntar antes de adivinhar** em caso de ambiguidade real.
3. **Uma coisa de cada vez.** Mudanças incrementais e revisáveis; evitar refatoração grande não solicitada.
4. **Validar antes de entregar** (rodar build/check apropriado — ver Rule 1).
5. **Mostrar o diff e pedir confirmação antes de commitar.** Não commitar automaticamente.
6. **Commits descritivos** ("o quê" e "porquê").
7. **Preservar compatibilidade.** Campos/arrays usados em vários lugares (ex.: `proximosExames`) não saem sem checar todos os usos.
8. Production-ready — nada de `TODO` sem implementação. Um logical change → um commit.

---

## Rule 5 — Idioma

- Produto **100% em Português (PT-BR)**. Sem camada de i18n por enquanto — strings no código mesmo.
- Não introduzir framework de i18n sem decisão registrada.

---

## Rule 6 — Exames de IMAGEM (escopo fechado)

- Regex de detecção (case-insensitive): `ULTRASSON|COLONOSCOP|ENDOSCOP|RESSON|RNM|DENSITOMETR`
- Lista oficial — **não adicionar outros sem pedir:**
  1. ULTRASSONOGRAFIA DE ABDÔMEN TOTAL
  2. ULTRASSONOGRAFIA PÉLVICA
  3. ULTRASSONOGRAFIA DE RINS E VIAS URINÁRIAS
  4. COLONOSCOPIA
  5. ENDOSCOPIA DIGESTIVA ALTA
  6. RESSONÂNCIA NUCLEAR MAGNÉTICA COM PROTOCOLO DE FERRO
  7. DENSITOMETRIA ÓSSEA
- `formatarParaCopiar` ainda usa o `proximosExames` original — não quebrar isso.

---

## Change Control

Qualquer mudança neste documento exige:
1. Editar este arquivo + bump de `version` no frontmatter
2. Entrada em `90_DECISION_LOG.md` explicando o PORQUÊ
3. SÓ ENTÃO a mudança de código (nunca antes)

> **Este documento está LOCKED para V1.0.**
