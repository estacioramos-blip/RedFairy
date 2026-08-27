// Build do blog estático do Projeto OBA® (bariatrico.net/blog/).
//
// Uso:  node site-bariatrico/blog/build.js   (ou: npm run blog:build)
//
// Lê os artigos em posts/*.md (frontmatter + Markdown), e gera:
//   blog/<slug>.html      — uma página por artigo
//   blog/index.html       — índice, mais recentes primeiro
//   blog/autor.html       — qualificação do autor (YMYL)
//   ../sitemap.xml        — raiz do site (landing + blog)
//   ../robots.txt         — raiz do site
//
// Os HTML gerados são commitados (o site não tem passo de build no deploy).
// NÃO editar os HTML gerados à mão — editar o .md ou este script e rodar de novo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(DIR, 'posts');
const SITE_DIR = path.join(DIR, '..');

const config = JSON.parse(fs.readFileSync(path.join(DIR, 'blog.config.json'), 'utf8'));
const { siteUrl, blogTitle, blogDescription, ogImage, autor } = config;

// ---------------------------------------------------------------- utilidades

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// "</script>" dentro de um campo fecharia a tag do JSON-LD no meio — escapar o "<".
function jsonLdSeguro(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function dataValida(iso) {
  // Date.parse é elástico ("2026-02-30" vira 2 de março sem erro) — por isso a
  // conferência de ida e volta: a data só vale se o Date reconstruído bater.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const d = new Date(`${iso}T12:00:00`);
  return d.getFullYear() === +m[1] && d.getMonth() + 1 === +m[2] && d.getDate() === +m[3];
}

function dataExtenso(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

// Frontmatter simples (chave: valor, uma por linha, entre duas linhas "---").
function parseFrontmatter(raw, arquivo) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${arquivo}: frontmatter ausente (bloco entre linhas "---")`);
  const meta = {};
  for (const linha of m[1].split(/\r?\n/)) {
    if (!linha.trim()) continue;
    const kv = linha.match(/^(\w+)\s*:\s*(.*)$/);
    if (!kv) throw new Error(`${arquivo}: linha de frontmatter inválida: "${linha}"`);
    meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, corpo: m[2] };
}

function validarPost(meta, arquivo) {
  for (const campo of ['titulo', 'descricao', 'data', 'slug', 'categoria']) {
    if (!meta[campo]) throw new Error(`${arquivo}: frontmatter sem "${campo}"`);
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(meta.slug)) {
    throw new Error(`${arquivo}: slug "${meta.slug}" inválido (usar só a-z, 0-9 e hífen)`);
  }
  if (!dataValida(meta.data)) throw new Error(`${arquivo}: data "${meta.data}" inválida (AAAA-MM-DD)`);
  if (meta.atualizado && !dataValida(meta.atualizado)) {
    throw new Error(`${arquivo}: atualizado "${meta.atualizado}" inválido (AAAA-MM-DD)`);
  }
  if (meta.descricao.length > 170) {
    console.warn(`  aviso: ${arquivo}: descrição com ${meta.descricao.length} caracteres — o Google corta por volta de 160.`);
  }
}

// ------------------------------------------------------------------ template

// Identidade visual da landing (index.html): fundo #14100E, texto #F7F1E7,
// dourado #E3AE37, títulos Cormorant Garamond, corpo Archivo.
const CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { background: #14100E; color: #F7F1E7; font-family: 'Archivo', sans-serif;
         font-size: 17px; line-height: 1.75; -webkit-font-smoothing: antialiased; }
  a { color: #E3AE37; }
  a:hover { text-decoration-color: rgba(227,174,55,0.5); }
  .container { max-width: 68ch; margin: 0 auto; padding: 0 22px; }
  .site-header { padding: 26px 0 22px; border-bottom: 1px solid rgba(227,174,55,0.22); }
  .site-header .container { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
  .marca { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600;
           letter-spacing: 0.04em; color: #F7F1E7; text-decoration: none; }
  .marca sup { font-size: 12px; color: #E3AE37; }
  .voltar { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 600;
            color: rgba(247,241,231,0.9); text-decoration: none; }
  .voltar:hover { color: #E3AE37; }
  main { padding: 44px 0 30px; }
  h1, h2, h3 { font-family: 'Cormorant Garamond', serif; font-weight: 600;
               line-height: 1.12; color: #FBF6EC; letter-spacing: -0.01em; }
  article h1 { font-size: clamp(34px, 6vw, 52px); margin: 10px 0 14px; }
  article h2 { font-size: clamp(25px, 4vw, 33px); margin: 40px 0 12px; }
  article h3 { font-size: clamp(20px, 3vw, 25px); margin: 30px 0 10px; }
  article p, article li { color: rgba(247,241,231,0.92); }
  article ul, article ol { padding-left: 1.3em; }
  article li { margin: 6px 0; }
  article img { max-width: 100%; height: auto; border-radius: 8px; }
  article blockquote { margin: 24px 0; padding: 4px 0 4px 20px; border-left: 2px solid #E3AE37;
                       font-family: 'Cormorant Garamond', serif; font-style: italic;
                       font-size: 1.18em; color: rgba(247,241,231,0.85); }
  article hr { border: none; border-top: 1px solid rgba(227,174,55,0.22); margin: 36px 0; }
  article strong { color: #FBF6EC; }
  .olho { font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; font-weight: 600; color: #E3AE37; }
  .datas { font-size: 13px; color: rgba(247,241,231,0.6); margin: 0 0 6px; }
  .assinatura { display: flex; flex-direction: column; gap: 2px; margin: 18px 0 34px;
                padding-bottom: 22px; border-bottom: 1px solid rgba(227,174,55,0.22); }
  .assinatura a { font-weight: 600; text-decoration: none; }
  .assinatura .creds { font-size: 13px; color: rgba(247,241,231,0.66); }
  .aviso { margin: 44px 0 0; padding: 18px 20px; border: 1px solid rgba(227,174,55,0.3);
           border-radius: 10px; font-size: 14px; line-height: 1.65; color: rgba(247,241,231,0.75);
           background: rgba(227,174,55,0.05); }
  .autor-box { margin-top: 26px; padding: 20px; border-radius: 10px; background: rgba(247,241,231,0.045);
               font-size: 14.5px; line-height: 1.65; color: rgba(247,241,231,0.8); }
  .autor-box .nome { font-family: 'Cormorant Garamond', serif; font-size: 21px; color: #FBF6EC; margin: 0 0 2px; }
  .lista-post { padding: 26px 0; border-bottom: 1px solid rgba(227,174,55,0.18); }
  .lista-post h2 { font-size: clamp(26px, 4.4vw, 36px); margin: 8px 0 8px; }
  .lista-post h2 a { color: #FBF6EC; text-decoration: none; }
  .lista-post h2 a:hover { color: #E3AE37; }
  .lista-post p { margin: 0 0 12px; color: rgba(247,241,231,0.78); }
  .ler { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600; text-decoration: none; }
  .site-footer { margin-top: 60px; padding: 30px 0 40px; border-top: 1px solid rgba(227,174,55,0.22);
                 font-size: 13px; color: rgba(247,241,231,0.55); }
  .site-footer .container { display: flex; flex-wrap: wrap; gap: 8px 26px; align-items: baseline; }
  .site-footer a { color: rgba(247,241,231,0.75); text-decoration: none; }
  .site-footer a:hover { color: #E3AE37; }
`;

function pagina({ titulo, descricao, canonical, jsonLd, corpo, ogType = 'website' }) {
  return `<!DOCTYPE html>
<!-- GERADO por blog/build.js — não editar à mão. Edite o .md ou o script e rode: npm run blog:build -->
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titulo)}</title>
<meta name="description" content="${escapeHtml(descricao)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="icon" href="../images/oba-logo.png">
<meta property="og:site_name" content="Projeto OBA®">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${escapeHtml(titulo)}">
<meta property="og:description" content="${escapeHtml(descricao)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(titulo)}">
<meta name="twitter:description" content="${escapeHtml(descricao)}">
<meta name="twitter:image" content="${escapeHtml(ogImage)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Archivo:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
</head>
<body>
<header class="site-header">
  <div class="container">
    <a class="marca" href="/">OBA<sup>®</sup></a>
    <a class="voltar" href="/">← Voltar ao site</a>
  </div>
</header>
<main>
  <div class="container">
${corpo}
  </div>
</main>
<footer class="site-footer">
  <div class="container">
    <a href="/">Projeto OBA® — início</a>
    <a href="/blog/">Blog</a>
    <a href="/blog/autor.html">Sobre o autor</a>
    <span>© Projeto OBA®</span>
  </div>
</footer>
</body>
</html>
`;
}

const AVISO_HTML = `<div class="aviso"><strong>Aviso:</strong> este conteúdo tem caráter exclusivamente
informativo e educacional. Ele não substitui consulta, diagnóstico ou tratamento realizados por
um médico. Em caso de dúvida sobre a sua saúde, procure o seu médico.</div>`;

function credenciais() {
  const partes = [autor.crm];
  for (const e of autor.especialidades || []) {
    partes.push(e.rqe ? `${e.nome} (RQE ${e.rqe})` : e.nome);
  }
  return partes.join(' · ');
}

function jsonLdArtigo(post) {
  const canonical = `${siteUrl}/blog/${post.slug}.html`;
  return jsonLdSeguro({
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    headline: post.titulo,
    description: post.descricao,
    url: canonical,
    mainEntityOfPage: canonical,
    inLanguage: 'pt-BR',
    datePublished: post.data,
    dateModified: post.atualizado,
    audience: { '@type': 'MedicalAudience', audienceType: 'Patient' },
    author: {
      '@type': 'Person',
      name: autor.nome,
      url: `${siteUrl}/blog/autor.html`,
      jobTitle: 'Médico',
      identifier: credenciais(),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Projeto OBA®',
      url: siteUrl,
      logo: { '@type': 'ImageObject', url: ogImage },
    },
  });
}

// ---------------------------------------------------------------------- build

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`Sem diretório de posts: ${POSTS_DIR}`);
  process.exit(1);
}
if (!(autor.especialidades || []).some((e) => e.rqe)) {
  console.warn('  aviso: nenhum RQE em autor.especialidades no blog.config.json — a assinatura' +
    ' sai sem RQE. Preencher antes de divulgar (conteúdo de saúde precisa da qualificação completa).');
}

const posts = [];
for (const arquivo of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md')).sort()) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, arquivo), 'utf8');
  const { meta, corpo } = parseFrontmatter(raw, arquivo);
  validarPost(meta, arquivo);
  posts.push({ ...meta, atualizado: meta.atualizado || meta.data, html: marked.parse(corpo) });
}
const slugsVistos = new Set();
for (const p of posts) {
  if (slugsVistos.has(p.slug)) throw new Error(`slug duplicado: "${p.slug}"`);
  slugsVistos.add(p.slug);
}
// Mais recentes primeiro (desempate por slug, para o build ser determinístico).
posts.sort((a, b) => (b.data.localeCompare(a.data)) || a.slug.localeCompare(b.slug));

// Uma página por artigo
for (const post of posts) {
  const canonical = `${siteUrl}/blog/${post.slug}.html`;
  const datas = post.atualizado !== post.data
    ? `Publicado em ${dataExtenso(post.data)} · Atualizado em ${dataExtenso(post.atualizado)}`
    : `Publicado em ${dataExtenso(post.data)}`;
  const corpo = `<article>
    <span class="olho">${escapeHtml(post.categoria)}</span>
    <h1>${escapeHtml(post.titulo)}</h1>
    <p class="datas">${datas}</p>
    <div class="assinatura">
      <a href="autor.html">${escapeHtml(autor.nome)}</a>
      <span class="creds">${escapeHtml(credenciais())}</span>
    </div>
${post.html}
${AVISO_HTML}
    <div class="autor-box">
      <p class="nome">${escapeHtml(autor.nome)}</p>
      <p style="margin:0 0 10px; font-size:13px; color:rgba(247,241,231,0.6);">${escapeHtml(credenciais())}</p>
      <p style="margin:0;">${escapeHtml(autor.bio[0])} <a href="autor.html">Sobre o autor →</a></p>
    </div>
  </article>`;
  fs.writeFileSync(path.join(DIR, `${post.slug}.html`), pagina({
    titulo: `${post.titulo} — ${blogTitle}`,
    descricao: post.descricao,
    canonical,
    jsonLd: jsonLdArtigo(post),
    corpo,
    ogType: 'article',
  }));
  console.log(`  blog/${post.slug}.html`);
}

// Índice
const itens = posts.map((p) => `  <div class="lista-post">
    <span class="olho">${escapeHtml(p.categoria)} · ${dataExtenso(p.data)}</span>
    <h2><a href="${p.slug}.html">${escapeHtml(p.titulo)}</a></h2>
    <p>${escapeHtml(p.descricao)}</p>
    <a class="ler" href="${p.slug}.html">Ler artigo →</a>
  </div>`).join('\n');
fs.writeFileSync(path.join(DIR, 'index.html'), pagina({
  titulo: blogTitle,
  descricao: blogDescription,
  canonical: `${siteUrl}/blog/`,
  jsonLd: jsonLdSeguro({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: blogTitle,
    description: blogDescription,
    url: `${siteUrl}/blog/`,
    inLanguage: 'pt-BR',
    author: { '@type': 'Person', name: autor.nome, url: `${siteUrl}/blog/autor.html` },
  }),
  corpo: `<span class="olho">Projeto OBA®</span>
  <h1 style="font-family:'Cormorant Garamond',serif; font-size:clamp(38px,6.5vw,58px); margin:10px 0 8px;">Blog</h1>
  <p style="color:rgba(247,241,231,0.75); margin:0 0 10px;">${escapeHtml(blogDescription)}</p>
${itens}`,
}));
console.log('  blog/index.html');

// Página do autor (YMYL: qualificação completa)
const bioHtml = autor.bio.map((p) => `  <p>${escapeHtml(p)}</p>`).join('\n');
fs.writeFileSync(path.join(DIR, 'autor.html'), pagina({
  titulo: `${autor.nome} — ${blogTitle}`,
  descricao: `Quem escreve no blog do Projeto OBA®: ${autor.nome}, ${credenciais()}.`,
  canonical: `${siteUrl}/blog/autor.html`,
  jsonLd: jsonLdSeguro({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: `${siteUrl}/blog/autor.html`,
    inLanguage: 'pt-BR',
    mainEntity: {
      '@type': 'Person',
      name: autor.nome,
      jobTitle: 'Médico',
      identifier: credenciais(),
      url: `${siteUrl}/blog/autor.html`,
      worksFor: { '@type': 'Organization', name: 'Projeto OBA®', url: siteUrl },
    },
  }),
  corpo: `<article>
    <span class="olho">Sobre o autor</span>
    <h1>${escapeHtml(autor.nome)}</h1>
    <p class="datas">${escapeHtml(credenciais())}</p>
${bioHtml}
    <p>Todo o conteúdo publicado neste blog é escrito e revisado pelo autor.</p>
${AVISO_HTML}
  </article>`,
}));
console.log('  blog/autor.html');

// sitemap.xml na raiz do site (landing + blog)
const urls = [
  { loc: `${siteUrl}/` },
  { loc: `${siteUrl}/blog/`, lastmod: posts[0]?.atualizado },
  { loc: `${siteUrl}/blog/autor.html` },
  ...posts.map((p) => ({ loc: `${siteUrl}/blog/${p.slug}.html`, lastmod: p.atualizado })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(SITE_DIR, 'sitemap.xml'), sitemap);
console.log('  sitemap.xml');

// robots.txt na raiz do site. Bloqueia os .md crus (conteúdo duplicado) e o backup.
fs.writeFileSync(path.join(SITE_DIR, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /blog/posts/
Disallow: /index.html.bak

Sitemap: ${siteUrl}/sitemap.xml
`);
console.log('  robots.txt');

console.log(`\nBuild ok: ${posts.length} artigo(s).`);
