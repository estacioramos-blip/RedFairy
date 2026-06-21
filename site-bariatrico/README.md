# Projeto OBA® — site (versão fonte)

Versão separada e editável da home do **bariatrico.net**.

## Conteúdo da pasta
```
index.html        → a página (toda a marcação + estilos + lógica)
support.js        → runtime necessário (NÃO remover; index.html depende dele)
images/           → as 4 imagens usadas
  oba-leap.png        (hero + popup "Como Funciona")
  oba-bariatrico.png  (seção 01 — Sou Bariátrico)
  oba-medico.png      (seção 02 — Sou Médico)
  oba-conheco.png     (seção 03 — Conheço um Bariátrico)
```

## Como publicar
É um site estático. Suba a pasta inteira (mantendo a estrutura) para a hospedagem do `bariatrico.net`. `index.html` deve ficar na raiz, com `support.js` e a pasta `images/` ao lado.

> Servir por HTTP (qualquer host estático). Para testar localmente use um servidor simples — ex.: `npx serve` ou `python -m http.server` — em vez de abrir o arquivo direto, para o `support.js` carregar corretamente.

As fontes (Cormorant Garamond + Archivo) vêm do Google Fonts via CDN — precisa de internet. Se quiser 100% offline, baixe as fontes e troque os `<link>` no `<head>`.

## O que falta conectar (placeholders)
Os botões de ação ainda apontam para `href="#"`. Ligar quando a plataforma estiver pronta:
- **Seção 01** — "Quero começar →"
- **Seção 02** — "Encaminhar paciente →"
- **Seção 03** — "Indicar alguém →"
- No popup "Como Funciona", os três caminhos já mostram os textos certos; os CTAs finais (assinatura, cadastro médico, indicação) ainda não existem.

## Estrutura interna (para edição)
`index.html` usa um pequeno framework de template (tag `<x-dc>` + classe `Component` no `<script>` ao final):
- **Hero**: imagem de fundo (`#obaHeroImg`), título "Projeto OBA®", 3 cards. No mobile (`@media max-width:760px`) a imagem vira `contain` para não cortar as laterais.
- **Seções 01/02/03**: painéis `position:fixed` que deslizam (`transform: translateX`) ao clicar nos cards; estado controlado por `view` ('home' | 'bariatrico' | 'medico' | 'conheco').
- **Popup "Como Funciona"**: estado `comoPhase` ('image' → 'menu' após 3s → 'msg'); textos no objeto `COMO` dentro de `renderVals()`.
- **Cores**: fundo `#14100E`, marfim `#F7F1E7`/`#FBF6EC`, dourado `#E3AE37`, vinho (hover) `#6E1A1C`.
- **Animação**: `@keyframes obaKen` (hero) e `obaPan` (seções/popup) — zoom lento.

Edite textos e estilos direto no `index.html`. Se for migrar para React/Vue/etc., trate este arquivo como **referência de design** (look & comportamento), recriando no padrão do seu projeto.
