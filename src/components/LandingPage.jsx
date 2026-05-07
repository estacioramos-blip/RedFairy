import { useState, useEffect, useRef } from 'react'
import logo from '../assets/logo.png'
import filosofiaBg from '../../redfairy-filosofia-bg.png'
import fairy3 from '../../redfairy3.png'
import OBAModal from './OBAModal'

const LANDING_CSS = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --wine: #7B1E1E; --wine-dark: #5C1515;
    --cherry: #DC2626; --cherry-light: #EF4444; --cherry-bg: #FEF2F2;
    --dark-bg: #0F1219; --dark-card: #181D27;
    --oba-orange: #E8720C; --oba-orange-light: #FB923C;
    --oba-blue: #64748B; --oba-blue-dark: #475569;
    --gray-bg: #F0F0F3; --text: #1F2937; --text-sec: #6B7280;
    --text-light: #9CA3AF; --bg: #FAFAFA; --white: #FFFFFF;
    --border: #F3F4F6; --border2: #E5E7EB; --radius: 14px;
    --shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  html { scroll-behavior: smooth; }
  body { font-family: 'DM Sans', -apple-system, sans-serif; color: var(--text); background: var(--white); line-height: 1.65; overflow-x: hidden; -webkit-font-smoothing: antialiased; scrollbar-gutter: stable; }

  /* NAV */
  #landing-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 0.75rem 2rem; display: grid !important; grid-template-columns: 1fr 2fr 1fr !important; align-items: center; transition: all 0.3s; box-sizing: border-box; }
  #landing-nav.scrolled { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); box-shadow: 0 1px 8px rgba(0,0,0,0.04); }


  .nav-brand { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; justify-self: start; }
  .nav-brand span { font-family: 'DM Serif Display', serif; font-size: 1.4rem; color: var(--wine); }
  .nav-brand em { font-style: normal; color: var(--cherry); }
  .nav-links { display: flex; gap: 1.8rem; align-items: center; justify-content: center; justify-self: center; }
  .nav-links a { text-decoration: none; font-size: 0.95rem; font-weight: 600; color: var(--wine); transition: color 0.2s; }
  .nav-links a:hover { color: var(--cherry); }
  .btn-sm { padding: 0.5rem 1.2rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; text-decoration: none; transition: all 0.2s; display: inline-flex; align-items: center; cursor: pointer; border: none; font-family: inherit; }
  .btn-wine { background: var(--wine); color: var(--white) !important; }
  .btn-wine:hover { background: var(--cherry); }
  .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 4px; flex-direction: column; gap: 4px; }
  .hamburger span { display: block; width: 20px; height: 2px; background: var(--text); border-radius: 2px; }

  /* BUTTONS */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.85rem 2rem; border-radius: 10px; font-size: 0.95rem; font-weight: 600; text-decoration: none; border: none; cursor: pointer; transition: all 0.25s; font-family: inherit; min-width: 180px; height: 60px; }
  .btn-primary { background: var(--wine); color: var(--white); }
  .btn-primary:hover { background: var(--cherry); transform: translateY(-2px); }
  .btn-secondary { background: #9CA3AF; color: var(--white); border: 1.5px solid #9CA3AF; }
  .btn-secondary:hover { background: #374151; border-color: #374151; transform: translateY(-2px); }

  /* WHATSAPP */
  .whatsapp-btn { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 999; width: 56px; height: 56px; border-radius: 50%; background: #25D366; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(37,211,102,0.4); transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; }
  .whatsapp-btn:hover { transform: translateY(-3px) scale(1.05); box-shadow: 0 8px 25px rgba(37,211,102,0.5); }
  .whatsapp-btn svg { width: 30px; height: 30px; fill: white; }

  /* HERO */
  .hero { min-height: auto; display: flex; align-items: center; padding: 4rem 2rem 1rem; background: var(--white); position: relative; overflow: hidden; }
  .hero-wrap { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; z-index: 2; }
  .hero-badge { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; background: #374151; color: var(--white); padding: 0.7rem 2.5rem; border-radius: 10px; font-size: 0.92rem; font-weight: 700; margin-bottom: 1.2rem; letter-spacing: 0.3px; text-align: center; width: 100%; max-width: 480px; box-sizing: border-box; }
  .hero-badge .dot { width: 12px; height: 12px; border-radius: 50%; background: #22C55E; animation: pDot 2s ease-in-out infinite; flex-shrink: 0; }
  .hero-badge .badge-main { display: flex; align-items: center; gap: 0.5rem; }
  .hero-badge .badge-sub { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.55); padding-left: 1.3rem; cursor: pointer; text-align: center; width: 100%; }
  .hero-badge .badge-sub:hover { color: rgba(255,255,255,0.85); }

  /* MOBILE — margens uniformes */
  @media (max-width: 768px) {
    /* Layout geral - sem overflow horizontal */
    html, body { overflow-x: hidden; max-width: 100vw; }
    * { box-sizing: border-box; }
    section { padding: 2.5rem 0.6rem; }
    .container { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }

    /* Nav */
    #landing-nav { display: flex !important; justify-content: space-between !important; }
    .nav-links { display: none; }
    .hamburger { display: flex; }
    .nav-links.open { display: flex; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: var(--white); padding: 1rem 0.6rem; border-bottom: 1px solid var(--border); box-shadow: var(--shadow); z-index: 200; }

    /* Hero — padding zero, hero-wrap ocupa 100% com padding interno */
    .hero { padding: 5rem 0 3rem; }
    .hero-wrap { grid-template-columns: 1fr !important; gap: 2rem; text-align: center; max-width: 100% !important; padding: 0 0.6rem; }
    .hero h1 { font-size: 2.6rem; white-space: normal !important; }
    .hero-desc { margin: 0 auto 1.5rem; }
    .hero-actions { justify-content: center; }
    .trust { justify-content: center; flex-wrap: wrap; gap: 1rem; }
    .hero-visual { display: none; }
    /* hero-textbox sem padding extra para ter mesma largura das demais seções */
    .hero-textbox { padding: 1.2rem; margin-left: 0; margin-right: 0; }
    .hero-textbox h1 { font-size: 2rem !important; white-space: normal !important; }
    /* Fonte menor na frase filosofia, sem corte */
    .hero-philosophy { font-size: 1.15rem !important; white-space: normal !important; }
    .hero-quote-box { text-align: center; }

    /* Filosofia - coluna única, texto justificado */
    .filosofia-grid { grid-template-columns: 1fr !important; gap: 1.5rem; }
    .fil-img-box { width: 100%; }
    .fil-img-box h2 { white-space: normal !important; font-size: 1.5rem !important; }
    .fil-content p { text-align: justify; font-size: 0.9rem !important; }
    .cycle-card { width: 100%; }

    /* Títulos */
    .stitle { font-size: 1.6rem; }

    /* Indicações */
    .indicacoes-grid { grid-template-columns: repeat(2, 1fr) !important; }

    /* Como funciona */
    .como-tab { padding: 0.7rem 1.2rem; font-size: 0.85rem; }
    .flow { grid-template-columns: 1fr 1fr !important; gap: 0.8rem; }
    .flow-step { padding: 1rem 0.6rem; }
    .patient-features { grid-template-columns: 1fr !important; }
    .reward-banner { flex-direction: column; text-align: center; }

    /* OBA */
    .oba-grid { grid-template-columns: 1fr !important; }

    /* CTA */
    .cta-cards { grid-template-columns: 1fr !important; }
  }
  @keyframes pDot { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(1.5);} }
  @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(220,38,38,0.8), 0 0 0 0 rgba(220,38,38,0.4);}70%{box-shadow:0 0 0 12px rgba(220,38,38,0), 0 0 0 24px rgba(220,38,38,0);}100%{box-shadow:0 0 0 0 rgba(220,38,38,0), 0 0 0 0 rgba(220,38,38,0);} }
  .hero-badge-sub { font-size: 0.78rem; color: var(--text-sec); margin-top: -0.4rem; margin-bottom: 0.8rem; font-weight: 700; }

  /* HERO TEXTBOX — coluna esquerda, hover mostra imagem E esconde texto */
  .hero-textbox {
    background: var(--white); border: 1px solid var(--border); border-radius: 16px;
    padding: 2rem 2.5rem; box-shadow: var(--shadow);
    position: relative; overflow: hidden; cursor: pointer; margin-bottom: 0.8rem;
    width: 100%; max-width: 700px; text-align: center;
  }
  .hero-textbox-bg {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background-size: cover; background-position: center;
    filter: blur(12px); opacity: 0.18;
    transition: filter 0.6s ease, opacity 0.6s ease;
    z-index: 0;
  }
  .hero-textbox.reveal-img .hero-textbox-bg { filter: blur(0px); opacity: 0.9; }
  .hero-textbox .htb-content { position: relative; z-index: 1; transition: opacity 0.6s ease; }
  .hero-textbox.reveal-img .htb-content { opacity: 0; }
  .hero h1 { font-size: 3.6rem; line-height: 1.12; color: var(--text); margin-bottom: 1.2rem; font-weight: 800; }
  .hero h1 .red { color: var(--cherry); }
  .hero-philosophy { font-style: normal; font-size: 1.15rem; color: var(--wine); margin-bottom: 0; line-height: 1.65; font-weight: 700; }
  .hero-desc { font-size: 1.02rem; color: var(--text-sec); max-width: 100%; line-height: 1.7; margin-bottom: 1.2rem; font-weight: 700; text-align: center; }
  .hero-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: center; justify-content: center; }
  .trust { margin-top: 2rem; display: flex; gap: 1.8rem; align-items: center; flex-wrap: wrap; justify-content: center; }
  .trust-i { display: flex; align-items: center; gap: 0.35rem; }
  .trust-i svg { width: 15px; height: 15px; color: var(--cherry); }
  .trust-i span { font-size: 0.8rem; color: var(--text-light); }

  /* HERO VISUAL — coluna direita */
  .hero-visual { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .fairy-showcase { width: 208px; height: 208px; }
  .fairy-showcase img { width: 100%; height: 100%; object-fit: contain; animation: floatFairy 4s ease-in-out infinite; }
  @keyframes floatFairy { 0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);} }

  /* fairy-quote — retângulo branco direito com texto */
  .fairy-quote { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 1.8rem 2rem; box-shadow: var(--shadow); text-align: center; max-width: 380px; width: 100%; }
  .fairy-quote p { font-size: 1.45rem; color: var(--text); line-height: 1.5; font-weight: 800; font-family: 'DM Sans', sans-serif; }
  .fairy-quote .question { color: var(--wine); font-weight: 700; margin-top: 1rem; font-size: 1.2rem; font-family: 'DM Sans', sans-serif; font-style: normal; }

  /* OBA HOME BTN */
  .oba-home-btn { display: flex; flex-direction: column; align-items: center; text-decoration: none; background: linear-gradient(135deg, var(--oba-orange), var(--oba-blue)); border-radius: 16px; padding: 1.2rem 2rem; transition: all 0.3s; box-shadow: 0 4px 20px rgba(232,114,12,0.2); width: 100%; max-width: 380px; }
  .oba-home-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(232,114,12,0.3); }
  .oba-home-btn .oba-title { font-size: 1.1rem; font-weight: 800; color: var(--white); letter-spacing: 1px; }
  .oba-home-btn .oba-sub { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.9); margin-top: 0.15rem; font-weight: 700; }
  .oba-home-btn .oba-link { font-size: 0.78rem; color: rgba(255,255,255,0.85); margin-top: 0.5rem; text-decoration: underline; }

  /* CONTAINER / SECTIONS */
  .container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
  section { padding: 3rem 2rem; scroll-margin-top: 80px; }
  .center { text-align: center; }
  .tag { display: inline-block; font-size: 0.73rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: var(--cherry); margin-bottom: 0.6rem; }
  .stitle { font-size: 2.3rem; color: var(--text); margin-bottom: 0.7rem; font-weight: 800; }
  .sdesc { font-size: 1.02rem; color: var(--text-sec); max-width: 580px; line-height: 1.7; font-weight: 600; }
  .sdesc-bold { font-size: 1rem; font-weight: 700; color: var(--text); max-width: 580px; line-height: 1.75; }

  /* FILOSOFIA — novo layout: texto esquerda, retângulo imagem direita */
  .filosofia { background: var(--gray-bg); color: var(--text); position: relative; margin-top: 5rem; padding-top: 1.5rem; padding-bottom: 1.5rem; }
  .filosofia .tag { color: var(--cherry); margin-bottom: 0.3rem; }
  .filosofia-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; margin-top: 1.5rem; }
  .fil-img-box .fil-content p { font-size: 0.95rem; color: var(--text-sec); line-height: 1.85; margin-bottom: 1rem; font-weight: 600; }
  .fil-img-box .fil-content .highlight-box p { color: var(--white); font-size: 1rem; margin: 0; font-weight: 600; }
  .highlight-box { background: var(--wine); border: 2px solid var(--wine-dark); border-radius: 12px; padding: 1.2rem 1.5rem; margin-top: 1.5rem; }
  .highlight-box p { color: var(--white); font-weight: 600; font-size: 1rem; margin: 0; text-align: center; }
  /* Retângulo da imagem filosofia */
  .fil-img-box {
    background: white; border-radius: 16px; box-shadow: var(--shadow);
    border: 1px solid var(--border2);
    position: relative; overflow: hidden; cursor: default;
    aspect-ratio: 3/4; width: 100%;
  }
  @media (max-width: 768px) {
    .fil-img-box { aspect-ratio: auto !important; min-height: auto !important; }
    .fil-img-box-bg { background-position: center top !important; }
  }
  .fil-img-box-bg {
    position: absolute; inset: 0; width: 100%; height: 100%;
    background-size: cover; background-position: center 15%;
    filter: blur(12px); opacity: 0.18;
    transition: filter 0.6s ease, opacity 0.6s ease;
    z-index: 0;
  }
  .fil-img-box.reveal-img .fil-img-box-bg { filter: blur(0px); opacity: 0.9; }
  .fil-img-box .fil-content { position: relative; z-index: 1; transition: opacity 0.6s ease; padding: 1.5rem; }
  .fil-img-box.reveal-img .fil-content { opacity: 0; }

  .cycle-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; width: 100%; box-shadow: var(--shadow); }
  .cycle-card h4 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--cherry); margin-bottom: 1.2rem; font-weight: 800; }
  .cycle-step { display: flex; align-items: center; gap: 0.8rem; padding: 0.35rem 0; border-bottom: 1px solid var(--border); }
  .cycle-step:last-child { border: none; }
  .cycle-step .icon { font-size: 1.3rem; width: 42px; min-width: 42px; text-align: center; display: flex; align-items: center; justify-content: center; }
  .cycle-step .desc { font-size: 0.95rem; color: var(--text-sec); font-weight: 700; }
  .fairy-mini { height: 38px; width: 38px; object-fit: contain; opacity: 0.85; }

  /* INDICAÇÕES — bolinhas vermelhas, grid 5 colunas */
  .indicacoes-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.6rem; margin-top: 2rem; align-items: start; }
  .ind { background: white; border: 1px solid var(--border2); border-radius: 8px; padding: 0.6rem 1rem; font-size: 0.85rem; color: var(--text-sec); font-weight: 500; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; }
  .ind.auto-dot::before { content: ''; width: 8px; height: 8px; min-width: 8px; border-radius: 50%; background: var(--cherry); display: block; flex-shrink: 0; margin-top: 3px; }
  .ind:hover { border-color: var(--border2); }

  /* TERAPÊUTICA */
  .terapeutica { background: var(--gray-bg); }
  .terap-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
  .terap-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.2rem; transition: all 0.2s; }
  .terap-card:hover { box-shadow: var(--shadow); }
  .terap-card .tc-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 0.8rem; background: var(--cherry-bg); }
  .terap-card h4 { font-size: 0.95rem; margin-bottom: 0.3rem; }
  .terap-card p { font-size: 0.83rem; color: var(--text-sec); }

  /* COMO FUNCIONA */
  .como { background: var(--white); }
  .como-tabs-wrap { display: flex; justify-content: center; margin-top: 2rem; margin-bottom: 2.5rem; }
  .como-tabs { display: inline-flex; gap: 0.5rem; }
  .como-tab { padding: 0.85rem 0; border-radius: 10px; font-size: 0.95rem; font-weight: 600; border: none; cursor: pointer; background: #9CA3AF; color: white; transition: all 0.25s; font-family: inherit; width: 200px; text-align: center; }
  .como-tab:hover { background: #374151; }
  .como-tab.active { background: var(--wine); color: white; box-shadow: 0 4px 14px rgba(123,30,30,0.25); }
  .como-tab.active:hover { background: var(--cherry); }
  .como-content { min-height: 300px; }
  .flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
  .flow-step { text-align: center; background: white; border: 1px solid var(--border2); border-radius: 14px; padding: 1.5rem 1rem; }
  .flow-num { width: 44px; height: 44px; border-radius: 50%; background: var(--wine); color: white; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.8rem; }
  .flow-step h4 { font-size: 0.92rem; margin-bottom: 0.4rem; font-weight: 700; }
  .flow-step p { font-size: 0.82rem; color: var(--text-sec); line-height: 1.6; }
  /* Reward banner com logo K */
  .reward-banner { background: #22863A; border-radius: 14px; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; }
  .reward-text h4 { color: white; font-size: 1rem; margin-bottom: 0.3rem; font-weight: 700; }
  .reward-text p { color: rgba(255,255,255,0.9); font-size: 0.85rem; line-height: 1.6; }
  .reward-text strong { color: white; }
  .reward-right { display: flex; align-items: center; gap: 0.5rem; }
  .reward-amount { font-size: 2rem; font-weight: 800; color: white; white-space: nowrap; }
  .klipbit-k { width: 36px; height: 36px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 900; color: var(--wine); font-family: serif; }
  /* Patient features com ícones SVG */
  .patient-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .pf-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid var(--border2); }
  .pf-icon { width: 36px; height: 36px; margin-bottom: 0.8rem; color: var(--wine); }
  .pf-card h4 { font-size: 0.9rem; margin-bottom: 0.3rem; font-weight: 700; }
  .pf-card p { font-size: 0.82rem; color: var(--text-sec); line-height: 1.6; }
  /* Pricing box rosa */
  .pricing-box { background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 14px; padding: 2.5rem 2rem; text-align: center; margin-top: 1.5rem; }
  .price { font-size: 3.5rem; font-weight: 800; color: var(--wine); }
  .price-sub { font-size: 0.95rem; color: var(--wine); margin-bottom: 1.2rem; font-weight: 400; }
  .pix-methods { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 1rem; }
  .pix-tag { background: white; border: 1px solid #FECDD3; border-radius: 8px; padding: 0.4rem 0.9rem; font-size: 0.82rem; color: var(--wine); font-weight: 500; display: flex; align-items: center; gap: 0.4rem; }

  /* PROJETO OBA */
  .oba { background: linear-gradient(170deg, var(--oba-blue-dark) 0%, #334155 60%, #1E293B 100%); color: var(--white); position: relative; overflow: hidden; }
  .oba::before { content: ''; position: absolute; top: -30%; right: -15%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(232,114,12,0.12), transparent 70%); border-radius: 50%; }
  .oba .container { position: relative; z-index: 2; }
  .oba .tag { color: var(--oba-orange-light); }
  .oba .stitle { color: var(--white); }
  .oba-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; align-items: start; margin-top: 2.5rem; }
  .oba-narrative p { color: rgba(255,255,255,0.7); font-size: 0.93rem; line-height: 1.8; margin-bottom: 1rem; }
  .oba-narrative strong { color: var(--oba-orange-light); }
  .oba-metaphor { background: linear-gradient(135deg, var(--oba-orange), var(--oba-blue)); border-radius: 12px; padding: 1.3rem 1.5rem; margin: 1.5rem 0; }
  .oba-metaphor p { font-size: 1rem; font-weight: 600; color: var(--white); text-align: center; margin: 0; line-height: 1.5; }
  .oba-features { display: flex; flex-direction: column; gap: 1rem; }
  .oba-feat { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1.3rem; display: flex; gap: 0.8rem; align-items: flex-start; transition: all 0.2s; }
  .oba-feat:hover { border-color: rgba(232,114,12,0.3); background: rgba(232,114,12,0.05); }
  .oba-feat .of-icon { width: 38px; height: 38px; min-width: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; background: rgba(232,114,12,0.15); }
  .oba-feat h4 { font-size: 0.9rem; color: var(--white); margin-bottom: 0.2rem; }
  .oba-feat p { font-size: 0.82rem; color: rgba(255,255,255,0.55); margin: 0; }
  .oba-cta-row { margin-top: 2.5rem; display: flex; gap: 1rem; flex-wrap: wrap; }
  .btn-oba-main { background: linear-gradient(135deg, var(--oba-orange), var(--oba-blue-dark)); color: var(--white); box-shadow: 0 6px 25px rgba(232,114,12,0.3); }
  .btn-oba-main:hover { transform: translateY(-2px); }

  /* CTA FINAL */
  .cta-final { background: var(--gray-bg); }
  .cta-final .tag { color: var(--cherry); }
  .cta-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }
  .cta-c { border-radius: 16px; padding: 0.8rem 1.2rem; transition: transform 0.25s; display: flex; flex-direction: column; justify-content: space-between; }
  .cta-c:hover { transform: translateY(-4px); }
  .cta-doc { background: #D1D5DB; border: 1px solid #9CA3AF; box-shadow: var(--shadow); }
  .cta-pat { background: var(--wine); border: 1px solid var(--wine-dark); box-shadow: 0 8px 30px rgba(123,30,30,0.2); }
  .cta-c .ci { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 0.8rem; }
  .cta-doc .ci { background: var(--cherry-bg); }
  .cta-pat .ci { background: rgba(255,255,255,0.18); }
  .cta-doc h3 { color: var(--text); font-size: 1.25rem; margin-bottom: 0.4rem; }
  .cta-pat h3 { color: var(--white); font-size: 1.25rem; margin-bottom: 0.4rem; }
  .cta-doc p { color: var(--text-sec); font-size: 0.88rem; margin-bottom: 1.2rem; line-height: 1.6; }
  .cta-pat p { color: rgba(255,255,255,0.8); font-size: 0.88rem; margin-bottom: 1.2rem; line-height: 1.6; }
  .cta-c ul { list-style: none; margin-bottom: 1.5rem; padding: 0; }
  .cta-doc li { font-size: 0.84rem; color: var(--text-sec); padding: 0.3rem 0; display: flex; align-items: center; gap: 0.4rem; }
  .cta-doc li::before { content: '✓'; color: var(--cherry); font-weight: 700; }
  .cta-pat li { font-size: 0.84rem; color: rgba(255,255,255,0.9); padding: 0.3rem 0; display: flex; align-items: center; gap: 0.4rem; }
  .cta-pat li::before { content: '✓'; color: rgba(255,255,255,0.6); font-weight: 700; }
  .btn-cta-doc { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.85rem 2rem; border-radius: 10px; font-size: 0.95rem; font-weight: 600; border: none; cursor: pointer; font-family: inherit; transition: all 0.25s; background: var(--wine); color: var(--white); height: 60px; }
  .btn-cta-doc:hover { background: var(--cherry); transform: translateY(-2px); }
  .btn-cta-pat { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.85rem 2rem; border-radius: 10px; font-size: 0.95rem; font-weight: 600; border: 1.5px solid #9CA3AF; cursor: pointer; font-family: inherit; transition: all 0.25s; background: #9CA3AF; color: var(--white); height: 60px; }
  .btn-cta-pat:hover { background: #374151; border-color: #374151; transform: translateY(-2px); }

  /* FOOTER */
  footer { text-align: center; }
  .foot-brand { display: inline-flex; align-items: center; gap: 0.4rem; }
  .foot-brand img { height: 28px; }
  .foot-brand span { font-family: 'DM Serif Display', serif; font-size: 1.15rem; color: var(--wine); }
  .foot-brand em { font-style: normal; color: var(--cherry); }
  footer .foot-tag { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: var(--text-light); margin-top: 0.15rem; font-weight: 700; }
  footer .credits { font-size: 0.77rem; color: var(--text-light); margin-top: 1rem; line-height: 1.6; }
  footer a { color: var(--text-sec); text-decoration: none; }
  footer a:hover { color: var(--wine); }

  /* REVEAL */
  .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.65s ease, transform 0.65s ease; }
  .reveal.show { opacity: 1; transform: translateY(0); }

  /* fim CSS */
`

function rfInRange(v, r) { return v >= r.min && v <= r.max }
function rfMatch(matrix, inp) {
  return matrix.find(id => {
    const c = id.conditions
    if (!rfInRange(inp.ferritina,    c.ferritina))   return false
    if (!rfInRange(inp.hemoglobina,  c.hemoglobina)) return false
    if (!rfInRange(inp.vcm,          c.vcm))         return false
    if (!rfInRange(inp.rdw,          c.rdw))         return false
    if (!rfInRange(inp.satTransf,    c.satTransf))   return false
    if ((c.bariatrica  ?? false) !== (inp.bariatrica  ?? false)) return false
    if ((c.vegetariano ?? false) !== (inp.vegetariano ?? false)) return false
    if ((c.perda       ?? false) !== (inp.perda       ?? false)) return false
    if ((c.alcoolista  ?? false) !== (inp.alcoolista  ?? false)) return false
    if ((c.transfundido?? false) !== (inp.transfundido?? false)) return false
    return true
  })
}

const rfMatrix = [
  { id:3,  label:'SAUDÁVEL', color:'green',
    conditions:{ ferritina:{min:25,max:150}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:75,max:100}, rdw:{min:11.5,max:15.5}, satTransf:{min:20,max:50}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:'Produção normal de hemoglobina e células vermelhas, com boa reserva de ferro. Sem indicação de anemia ou siderose.',
    rec:'Avaliação médica preventiva semestral. Se a ferritina for ≥ 100 ng/mL, você pode ser candidato a doações de sangue.' },
  { id:10, label:'SIDEROPENIA INCIPIENTE SEM ANEMIA', color:'yellow',
    conditions:{ ferritina:{min:0,max:24}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:75,max:100}, rdw:{min:15.1,max:999}, satTransf:{min:0,max:50}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:'Hemoglobina normal, mas com sinais de depleção incipiente de ferro — anisocitose e hipoferritinemia.',
    rec:'Procure orientação de hematologista. Investigue a causa da sideropenia. Não doe sangue enquanto não esclarecer.' },
  { id:11, label:'ANEMIA FERROPRIVA MODERADA', color:'orange',
    conditions:{ ferritina:{min:0,max:24}, hemoglobina:{min:10.0,max:11.9}, vcm:{min:0,max:79}, rdw:{min:15.1,max:999}, satTransf:{min:0,max:50}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:'Deficiência de ferro com impacto sobre a produção de hemoglobina e hemácias, produzindo anemia moderada.',
    rec:'Avaliação com hematologista assim que possível. Reposição de ferro oral ou intravenosa conforme avaliação médica.' },
  { id:12, label:'ANEMIA FERROPRIVA IMPORTANTE', color:'red',
    conditions:{ ferritina:{min:0,max:24}, hemoglobina:{min:7.0,max:9.9}, vcm:{min:0,max:79}, rdw:{min:15.1,max:999}, satTransf:{min:0,max:19}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:'Anemia ferropriva importante. Exige intervenção médica imediata.',
    rec:'Avaliação urgente com hematologista. Pode ser necessária hospitalização. Ferro endovenoso indicado.' },
  { id:5,  label:'PROCESSO INFLAMATÓRIO OU DOENÇA CRÔNICA', color:'yellow',
    conditions:{ ferritina:{min:151,max:400}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:80,max:100}, rdw:{min:11.5,max:16}, satTransf:{min:20,max:50}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:'Ferritina elevada com saturação normal. Processos inflamatórios, neoplasias ou doenças degenerativas.',
    rec:'Procure orientação de hematologista. Não doe sangue enquanto não esclarecer a origem da ferritina elevada.' },
  { id:7,  label:'EXCESSO DE FERRO / SIDEROSE', color:'orange',
    conditions:{ ferritina:{min:401,max:900}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:80,max:100}, rdw:{min:11.5,max:15}, satTransf:{min:51,max:999}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:'Ferritina e saturação da transferrina elevadas, traduzindo siderose significativa.',
    rec:'Procure orientação de hematologista. Sangrias terapêuticas podem ser indicadas.' },
  { id:8,  label:'COMPATÍVEL COM HEMOCROMATOSE', color:'red',
    conditions:{ ferritina:{min:801,max:9999}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:80,max:100}, rdw:{min:11.5,max:15}, satTransf:{min:51,max:999}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:'Siderose maior — ferritina e saturação muito elevadas. Possível hemocromatose hereditária (gene HFE).',
    rec:'Avaliação urgente com hematologista. Sangrias terapêuticas deverão ser indicadas.' },
  { id:80, label:'ERITROCITOSE — HEMOGLOBINA ACIMA DO NORMAL', color:'red',
    conditions:{ ferritina:{min:24,max:9999}, hemoglobina:{min:15.6,max:999}, vcm:{min:0,max:9999}, rdw:{min:0,max:999}, satTransf:{min:0,max:999}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:'Hemoglobina acima do normal. Pode corresponder a uso de testosterona, eritropoetina, ou doenças hematológicas.',
    rec:'Repita o hemograma. Se confirmada, avalie com hematologista assim que possível.' },
  { id:14, label:'VEGETARIANO/A COMPENSADO/A', color:'green',
    conditions:{ ferritina:{min:25,max:150}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:75,max:100}, rdw:{min:11.5,max:16}, satTransf:{min:0,max:50}, bariatrica:false, vegetariano:true, perda:false, alcoolista:false, transfundido:false },
    diag:'Normal quanto à produção de hemoglobina. A suplementação de ferro e vitamina B12 parece adequada.',
    rec:'Procure orientação de hematologista antes de doar sangue.' },
  { id:17, label:'VEGETARIANO/A COM ANEMIA FERROPRIVA', color:'orange',
    conditions:{ ferritina:{min:0,max:24}, hemoglobina:{min:10.0,max:11.9}, vcm:{min:0,max:79}, rdw:{min:15.1,max:999}, satTransf:{min:0,max:19}, bariatrica:false, vegetariano:true, perda:false, alcoolista:false, transfundido:false },
    diag:'Anemia moderada por deficiência de ferro, provavelmente secundária a dieta insuficiente.',
    rec:'Avaliação com hematologista assim que possível. Suplementação de ferro e B12 necessária.' },
  { id:25, label:'BARIÁTRICO/A COM SUPORTE ADEQUADO', color:'green',
    conditions:{ ferritina:{min:25,max:150}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:75,max:100}, rdw:{min:11.5,max:16}, satTransf:{min:0,max:50}, bariatrica:true, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:'Normal quanto à produção de hemoglobina apesar do déficit absortivo da bariátrica.',
    rec:'Avaliação com hematologista. Deve ser avaliado por médico antes de doar sangue.' },
  { id:35, label:'ANEMIA IMPORTANTE COM HEMORRAGIA E SIDEROPENIA', color:'red',
    conditions:{ ferritina:{min:0,max:24}, hemoglobina:{min:7.0,max:9.9}, vcm:{min:0,max:79}, rdw:{min:15.1,max:999}, satTransf:{min:0,max:19}, bariatrica:false, vegetariano:false, perda:true, alcoolista:false, transfundido:false },
    diag:'Anemia importante por deficiência de ferro possivelmente causada pela hemorragia, com sideropenia grave.',
    rec:'Avaliação urgente com hematologista. Ferro endovenoso indicado. Investigar causa do sangramento.' },
  { id:82, label:'ANEMIA MACROCÍTICA — DÉFICIT DE FOLATOS', color:'orange',
    conditions:{ ferritina:{min:25,max:150}, hemoglobina:{min:8.0,max:11.9}, vcm:{min:101,max:999}, rdw:{min:15.1,max:999}, satTransf:{min:20,max:50}, bariatrica:false, vegetariano:false, perda:false, alcoolista:true, transfundido:false },
    diag:'Anemia macrocítica em alcoolista — padrão compatível com deficiência de ácido fólico.',
    rec:'Avaliação com hematologista. Suplementação de ácido fólico essencial. Suspender o álcool.' },
]

const colorMap = {
  green:  { bg:'rgba(34,197,94,0.1)',  border:'rgba(34,197,94,0.3)',  badge:'#16A34A', text:'#BBF7D0' },
  yellow: { bg:'rgba(234,179,8,0.1)',  border:'rgba(234,179,8,0.3)',  badge:'#CA8A04', text:'#FEF08A' },
  orange: { bg:'rgba(249,115,22,0.1)', border:'rgba(249,115,22,0.3)', badge:'#EA580C', text:'#FED7AA' },
  red:    { bg:'rgba(220,38,38,0.1)',  border:'rgba(220,38,38,0.35)', badge:'#DC2626', text:'#FECACA' },
}

export default function LandingPage({ onModoMedico, onModoPaciente, onIrLogin }) {
  const [navScrolled, setNavScrolled] = useState(false)
  const [navOpen,     setNavOpen]     = useState(false)
  const [showFilosofia, setShowFilosofia] = useState(false)
  const [showSobre, setShowSobre] = useState(false)
  const [showAfiliados, setShowAfiliados] = useState(false)
  const [showContato, setShowContato] = useState(false)
  const [activeTab,   setActiveTab]   = useState('medico')
  const [showHtb,     setShowHtb]     = useState(false)
  const [showFil,     setShowFil]     = useState(false)
  const [showOBA,     setShowOBA]     = useState(false)
  const [sexoOBA,     setSexoOBA]     = useState('M')
  const [idadeOBA,    setIdadeOBA]    = useState(0)
  const [rfSexo,      setRfSexo]      = useState('F')
  const [rfResultado, setRfResultado] = useState(null)
  const [rfErro,      setRfErro]      = useState('')
  const [rfForm,      setRfForm]      = useState({
    idade:'', hb:'', ferritina:'', vcm:'', rdw:'', sat:'',
    bariatrica:false, vegetariano:false, perda:false,
    alcoolista:false, transfundido:false,
    aspirina:false, b12:false, ferroMed:false,
    hiper:false, gestante:false,
  })
  const htbTimer = useRef(null)
  const [fadaClicks, setFadaClicks] = useState(0)
  const fadaTimer = useRef(null)
  const filTimer = useRef(null)

  useEffect(() => {
    if (!document.getElementById('landing-css')) {
      const style = document.createElement('style')
      style.id = 'landing-css'
      style.textContent = LANDING_CSS
      document.head.appendChild(style)
    }
    if (!document.getElementById('landing-fonts')) {
      const link = document.createElement('link')
      link.id   = 'landing-fonts'
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display:ital@0;1&display=swap'
      link.rel  = 'stylesheet'
      document.head.appendChild(link)
    }
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('show') }),
      { threshold: 0.07 }
    )
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
    const handleScroll = () => setNavScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => {
      document.getElementById('landing-css')?.remove()
      document.getElementById('landing-fonts')?.remove()
      window.removeEventListener('scroll', handleScroll)
      obs.disconnect()
    }
  }, [])

  // ESC fecha modal de Contato
  useEffect(() => {
    if (!showContato) return
    const onKey = (e) => { if (e.key === 'Escape') setShowContato(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showContato])

  // Hero textbox hover: mostra imagem E esconde texto por 2s
  function handleFadaClick() {
    const next = fadaClicks + 1
    setFadaClicks(next)
    if (fadaTimer.current) clearTimeout(fadaTimer.current)
    if (next >= 5) {
      setFadaClicks(0)
      // Entra direto na calculadora em modo demo
      localStorage.setItem('medico_crm', 'DEMO/BA')
      localStorage.setItem('medico_nome', 'Dr. Demo RedFairy')
      onModoMedico()
      return
    }
    fadaTimer.current = setTimeout(() => setFadaClicks(0), 2000)
  }

  function onHtbEnter() {
    if (htbTimer.current) clearTimeout(htbTimer.current)
    setShowHtb(true)
    htbTimer.current = setTimeout(() => setShowHtb(false), 1000)
  }

  // Filosofia hover: mostra imagem E esconde container por 2s
  function onFilEnter() {
    if (filTimer.current) clearTimeout(filTimer.current)
    setShowFil(true)
    filTimer.current = setTimeout(() => setShowFil(false), 1000)
  }

  function handleFormChange(field, value) {
    setRfForm(prev => ({ ...prev, [field]: value }))
  }

  const rfMatrix2 = [
    { id:3,  label:'Eritron Saudável',           color:'#16A34A', diag:'Produção normal de hemoglobina e células vermelhas, com boa reserva de ferro.',           rec:'Avaliação médica preventiva semestral.',                                       c:{ f:{a:25,b:150},   h:{a:12,b:17.5}, v:{a:75,b:100}, r:{a:11.5,b:15.5}, s:{a:20,b:50}  } },
    { id:10, label:'Sideropenia sem Anemia',     color:'#CA8A04', diag:'Hemoglobina normal, mas com depleção incipiente de ferro.',                              rec:'Procure hematologista. Investigue a causa.',                                   c:{ f:{a:0,b:24},     h:{a:12,b:17.5}, v:{a:75,b:100}, r:{a:15.1,b:999}, s:{a:0,b:50}   } },
    { id:11, label:'Anemia Ferropriva Moderada', color:'#EA580C', diag:'Deficiência de ferro com impacto sobre a produção de hemoglobina — anemia moderada.',    rec:'Avaliação com hematologista. Reposição de ferro conforme avaliação.',          c:{ f:{a:0,b:24},     h:{a:10,b:11.9}, v:{a:0,b:79},   r:{a:15.1,b:999}, s:{a:0,b:50}   } },
    { id:12, label:'Anemia Ferropriva Importante',color:'#DC2626', diag:'Anemia ferropriva importante. Exige intervenção médica imediata.',                       rec:'Avaliação urgente. Ferro endovenoso indicado.',                               c:{ f:{a:0,b:24},     h:{a:7,b:9.9},   v:{a:0,b:79},   r:{a:15.1,b:999}, s:{a:0,b:19}   } },
    { id:5,  label:'Processo Inflamatório',      color:'#CA8A04', diag:'Ferritina elevada com saturação normal. Processos inflamatórios ou doenças crônicas.',   rec:'Procure hematologista. Investigar a ferritina elevada.',                       c:{ f:{a:151,b:400},  h:{a:12,b:17.5}, v:{a:80,b:100}, r:{a:11.5,b:16},  s:{a:20,b:50}  } },
    { id:7,  label:'Excesso de Ferro / Siderose',color:'#EA580C', diag:'Ferritina e saturação da transferrina elevadas — siderose significativa.',                rec:'Sangrias terapêuticas podem ser indicadas.',                                   c:{ f:{a:401,b:900},  h:{a:12,b:17.5}, v:{a:80,b:100}, r:{a:11.5,b:15},  s:{a:51,b:999} } },
    { id:8,  label:'Compatível com Hemocromatose',color:'#DC2626',diag:'Ferritina e saturação muito elevadas. Possível hemocromatose hereditária.',              rec:'Avaliação urgente. Sangrias indicadas.',                                       c:{ f:{a:801,b:9999}, h:{a:12,b:17.5}, v:{a:80,b:100}, r:{a:11.5,b:15},  s:{a:51,b:999} } },
  ]

  function rfAvaliar2() {
    const hb   = parseFloat(document.getElementById('rf-hb2')?.value)
    const ferr = parseFloat(document.getElementById('rf-ferr2')?.value)
    const vcm  = parseFloat(document.getElementById('rf-vcm2')?.value)
    const rdw  = parseFloat(document.getElementById('rf-rdw2')?.value)
    const sat  = parseFloat(document.getElementById('rf-sat2')?.value)
    const erro = document.getElementById('rf-erro2')
    if ([hb,ferr,vcm,rdw,sat].some(isNaN)) {
      if (erro) { erro.textContent='Preencha todos os campos laboratoriais.'; erro.style.display='block' }
      return
    }
    if (erro) erro.style.display='none'
    const iR = (v,r) => v>=r.a && v<=r.b
    const res = rfMatrix2.find(m => iR(hb,m.c.h)&&iR(ferr,m.c.f)&&iR(vcm,m.c.v)&&iR(rdw,m.c.r)&&iR(sat,m.c.s))
    const form = document.getElementById('rf-view-form')
    const result = document.getElementById('rf-view-result')
    const screen = document.getElementById('rf-screen')
    if (form) form.style.display='none'
    if (result) result.style.display='block'
    if (screen) screen.scrollTop=0
    if (res) {
      const h = document.getElementById('rf-result-header')
      if (h) h.style.background=res.color
      const l = document.getElementById('rf-result-label')
      if (l) l.textContent=res.label
      const d = document.getElementById('rf-result-diag')
      if (d) d.textContent=res.diag
      const r = document.getElementById('rf-result-rec')
      if (r) r.textContent=res.rec
    } else {
      const h = document.getElementById('rf-result-header')
      if (h) h.style.background='#6B7280'
      const l = document.getElementById('rf-result-label')
      if (l) l.textContent='Combinação não encontrada'
      const d = document.getElementById('rf-result-diag')
      if (d) d.textContent='Acesse o RedFairy completo para avaliação detalhada.'
      const r = document.getElementById('rf-result-rec')
      if (r) r.textContent=''
    }
  }

  function rfReset2() {
    const form = document.getElementById('rf-view-form')
    const result = document.getElementById('rf-view-result')
    const screen = document.getElementById('rf-screen')
    if (form) form.style.display='block'
    if (result) result.style.display='none'
    if (screen) screen.scrollTop=0
  }

  function rfAvaliar() {
    setRfErro('')
    setRfResultado(null)
    const hb    = parseFloat(rfForm.hb)
    const ferr  = parseFloat(rfForm.ferritina)
    const vcm   = parseFloat(rfForm.vcm)
    const rdw   = parseFloat(rfForm.rdw)
    const sat   = parseFloat(rfForm.sat)
    const idade = parseInt(rfForm.idade)
    if ([hb, ferr, vcm, rdw, sat].some(isNaN)) { setRfErro('Preencha todos os campos laboratoriais.'); return }
    if (!idade || idade < 12 || idade > 100) { setRfErro('Informe uma idade válida (12–100 anos).'); return }
    const inp = { hemoglobina:hb, ferritina:ferr, vcm, rdw, satTransf:sat,
      bariatrica:rfForm.bariatrica, vegetariano:rfForm.vegetariano,
      perda:rfForm.perda, alcoolista:rfForm.alcoolista, transfundido:rfForm.transfundido }
    const res = rfMatch(rfMatrix, inp)
    if (res) setRfResultado(res)
    else setRfErro('Combinação não encontrada na versão simplificada. Acesse o RedFairy completo.')
  }

  const inputStyle = {
    width:'100%', background:'#1F2937', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:8, padding:'0.65rem 0.8rem', color:'white', fontSize:'0.92rem', fontFamily:'inherit', outline:'none',
  }
  const labelStyle = {
    display:'block', fontSize:'0.78rem', fontWeight:700,
    color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:1, marginBottom:'0.4rem',
  }

  return (
    <div style={{ fontFamily:"'DM Sans', sans-serif", overflowX:'hidden', maxWidth:'100vw', position:'relative' }}>

      {/* MODAL OBA */}
      {showOBA && (
        <OBAModal
          sexo={sexoOBA}
          idade={idadeOBA}
          cpf={null}
          onConcluir={() => { setShowOBA(false); onModoPaciente() }}
          onFechar={() => setShowOBA(false)}
        />
      )}

      {/* MODAL CONTATO */}
      {showContato && (
        <div
          onClick={() => setShowContato(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(15,18,25,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, maxWidth: 560, width: '100%',
              maxHeight: '90vh', overflowY: 'auto', position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              padding: '2.5rem 2rem 2rem',
            }}
          >
            {/* Cabeçalho */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span className="tag" style={{ color: 'var(--cherry)' }}>Contato</span>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--wine)', fontWeight: 800, marginTop: '0.4rem' }}>
                Fale com a gente
              </h2>
            </div>

            {/* ===================================================================== */}
            {/* CONTEÚDO DO MODAL CONTATO */}
            {/* ===================================================================== */}

            {/* Contato direto (sem cabecalho Equipe, ja que e 1 pessoa) */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.6, fontWeight: 700, margin: 0 }}>
                <strong style={{ color: 'var(--wine)' }}>Laíse Silva Dantas</strong>
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-sec)', fontWeight: 500, margin: '0.2rem 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                COO
              </p>
            </div>

            {/* Endereco */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.8rem' }}>
                Endereço para Correspondência
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
                Rua Barro Vermelho, 386/42<br/>
                Rio Vermelho · CEP 41940-340<br/>
                Salvador — Bahia | Brasil
              </p>
            </div>

            {/* Empresa (rodape institucional) */}
            <div style={{ marginBottom: '1.5rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 500, margin: 0, textAlign: 'center' }}>
                <strong style={{ color: 'var(--wine)', fontWeight: 700, letterSpacing: '0.5px' }}>CYTOMICA<sup style={{ fontSize: '0.6em', fontWeight: 500 }}>®</sup></strong><br/>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-sec)' }}>CNPJ 57.561.446/0001-02</span>
              </p>
            </div>

            {/* ===================================================================== */}

            {/* Botão WhatsApp grande */}
            <a
              href="https://wa.me/5571997110804"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                width: '100%', background: '#25D366', color: 'white',
                padding: '0.9rem 1.2rem', borderRadius: 10,
                fontSize: '1rem', fontWeight: 700, textDecoration: 'none',
                transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
                marginBottom: '1rem',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,211,102,0.4)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,211,102,0.3)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Conversar no WhatsApp
            </a>

            {/* Botão X fechar na base do modal */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <button
                onClick={() => setShowContato(false)}
                aria-label="Fechar Contato"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--wine)', color: 'white',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP */}
      <a href="https://wa.me/5571997110804" target="_blank" rel="noopener noreferrer" className="whatsapp-btn" aria-label="WhatsApp">
        <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>

      {/* NAV */}
      <nav id="landing-nav" className={navScrolled ? 'scrolled' : ''} style={{ position:'fixed', top:0, left:0, right:0, boxSizing:'border-box', zIndex:1000, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 2rem' }}>
        <a
          href="#home"
          className="nav-brand"
          onClick={(e) => {
            e.preventDefault()
            setShowFilosofia(false)
            setShowSobre(false)
            setShowAfiliados(false)
            setNavOpen(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          style={{ cursor: 'pointer' }}
        >
          <img src={logo} alt="RedFairy" style={{ height:36 }} />
          <span>Red<em>Fairy</em></span>
        </a>
        <div className={`nav-links${navOpen ? ' open' : ''}`}>
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault()
              setShowFilosofia(false)
              setShowSobre(false)
              setShowAfiliados(false)
              setNavOpen(false)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >Home</a>
          <a href="#filosofia" onClick={() => { setShowFilosofia(true); setNavOpen(false) }}>Filosofia</a>
          <a href="#afiliados" onClick={() => { setShowAfiliados(true); setNavOpen(false) }}>Afiliados</a>
          <a href="#como-funciona" onClick={() => setNavOpen(false)}>Como funciona</a>
          <a href="#indicacoes" onClick={() => setNavOpen(false)}>Indicações</a>
          <a href="#avaliar" onClick={() => setNavOpen(false)}>Avaliar</a>
          <a href="#oba" onClick={() => setNavOpen(false)}>Projeto OBA</a>
          <a href="#sobre" onClick={() => { setShowSobre(true); setNavOpen(false) }}>Sobre</a>
          <a href="#contato" onClick={(e) => { e.preventDefault(); setShowContato(true); setNavOpen(false) }}>Contato</a>
        </div>
        {/* 3ª coluna vazia para simetria do grid (mantém menu centralizado) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="hamburger" onClick={() => setNavOpen(!navOpen)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-wrap">

          {/* COLUNA ESQUERDA */}
          <div className="reveal">


            {/* Hero textbox: hover revela imagem E esconde texto (fiel ao Cowork) */}
            <div
              className={`hero-textbox${showHtb ? ' reveal-img' : ''}`}
              onMouseEnter={onHtbEnter}
              onTouchStart={onHtbEnter}
            >
              <div
                className="hero-textbox-bg"
                style={{ backgroundImage: `url(${filosofiaBg})` }}
              />
              <div className="htb-content">
                <h1>Eu sou a sua fada vermelha, a sua <span className="red">Hemoglobina</span></h1>
                <p className="hero-philosophy" style={{ fontStyle:'normal', fontWeight:800, textAlign:'center' }}>
                  Eu uso a poeira das estrelas para te entregar o ar.<br/>Quanto tempo você vive sem ar?
                </p>
              </div>
            </div>


            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.5rem', width:'100%', maxWidth:700 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                <button className="btn btn-primary" onClick={onModoMedico} style={{ flexDirection:"column", gap:"0.05rem", height:60, justifyContent:"center", alignItems:"center", display:"flex", width:'100%' }}>
                  <span>Sou Médico</span>
                  <span style={{ fontSize:"0.6rem", fontWeight:700, letterSpacing:"1.5px", opacity:0.7 }}>PROFISSIONAIS DE SAÚDE</span>
                </button>
                <p style={{ fontSize:'0.78rem', color:'#7B1E1E', lineHeight:1.6, fontWeight:700, margin:0, textAlign:'justify' }}>
                  Avalie o eritron e o metabolismo do ferro do seu paciente com precisão clínica com toques no seu celular, e o insira em um projeto de qualidade de vida.
                </p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                <button className="btn btn-secondary" onClick={onModoPaciente} style={{ height:60, justifyContent:"center", alignItems:"center", display:"flex", width:'100%' }}>Sou Paciente</button>
                <button onClick={onIrLogin} style={{ height:36, justifyContent:"center", alignItems:"center", display:"flex", width:'100%', background:'transparent', border:'none', color:'#6B7280', fontSize:'0.85rem', textDecoration:'underline', cursor:'pointer', padding:0, marginTop:'-0.2rem' }}>Já tenho conta — Entrar</button>
                <p style={{ fontSize:'0.78rem', color:'#1F2937', lineHeight:1.6, fontWeight:700, margin:0, textAlign:'justify' }}>
                  Com poucos exames e informações de vida, monitore a sua hemoglobina e receba orientações médicas ajustadas ao que você precisa. Viva mais e melhor!
                </p>
              </div>
            </div>
            {/* Dupla linha vermelha + texto afiliados */}
            <div style={{ margin:'0.5rem 0 0.8rem', textAlign:'center', width:'100%', maxWidth:700 }}>
              <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.5rem' }} />
              <p style={{ color:'#1F2937', fontSize:'0.88rem', fontWeight:600, margin:'0.3rem 0 0.1rem' }}>
                Avalie um paciente e torne-se membro do Programa de Afiliados patrocinado.
              </p>
              <p style={{ color:'#6B7280', fontSize:'0.78rem', fontWeight:500, margin:'0 0 0.2rem' }}>
                Ao beneficiar pacientes, você também passa a auferir benefícios.
              </p>
              <p style={{ color:'#9CA3AF', fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', margin:'0.2rem 0 0.3rem' }}>
                VÁLIDO PARA PROFISSIONAIS DE SAÚDE COM REGISTRO EM CONSELHO
              </p>
            </div>

            <div className="trust" style={{ justifyContent:'center' }}>
              <div className="trust-i">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>30 variáveis clínicas</span>
              </div>
              <div className="trust-i">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Resultado imediato</span>
              </div>

            </div>

          </div>

          {/* COLUNA DIREITA */}
          <div className="hero-visual reveal" style={{ transitionDelay:'0.15s' }}>



          </div>
        </div>
      </section>


      {/* FILOSOFIA */}
      <section className="filosofia" id="filosofia" style={{ display: showFilosofia ? 'block' : 'none', position: 'relative' }}>
        <div className="container">
          <div className="reveal">
            <span className="tag">Filosofia</span>
          </div>
          <div className="filosofia-grid">
            {/* Coluna esquerda: quadro com hover igual ao hero-textbox + texto abaixo */}
            <div className="reveal">
              {/* Quadro COM hover e imagem — igual ao hero-textbox */}
              <div
                className={`hero-textbox${showFil ? ' reveal-img' : ''}`}
                style={{ marginBottom:'1rem' }}
                onMouseEnter={onFilEnter}
                onTouchStart={onFilEnter}
              >
                <div
                  className="hero-textbox-bg"
                  style={{ backgroundImage: `url(${fairy3})` }}
                />
                <div className="htb-content">
                  <h1 style={{ fontSize:'2.2rem', lineHeight:1.2, marginBottom:'0.8rem', color:'#1F2937', fontWeight:800 }}>
                    Vida é ventilação e perfusão. É a sua <span style={{ color:'#DC2626' }}>Hemoglobina</span> que faz isso.
                  </h1>
                  <p style={{ fontStyle:'normal', fontWeight:700, fontSize:'0.9rem', color:'#7B1E1E', lineHeight:1.6 }}>
                    Cuide dela. Saiba mais:
                  </p>
                </div>
              </div>
              {/* Texto abaixo do quadro */}
              <div style={{ padding:'0.5rem 0' }}>
                <p style={{ fontSize:'0.9rem', color:'var(--text-sec)', lineHeight:1.8, marginBottom:'0.8rem', fontWeight:600 }}>Com Ferro, a Natureza faz a Hemoglobina, a proteína vermelha e mais importante da sua vida.</p>
                <p style={{ fontSize:'0.9rem', color:'var(--text-sec)', lineHeight:1.8, marginBottom:'0.8rem', fontWeight:600 }}>Ela sustenta a ventilação e realiza a perfusão: capta o oxigênio do ar que ventila os pulmões e o entrega a todas as suas células — vinte vezes por minuto.</p>
                <p style={{ fontSize:'0.9rem', color:'var(--text-sec)', lineHeight:1.8, marginBottom:'0.8rem', fontWeight:600 }}>Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento em suas células, e o leva aos seus pulmões para que você o expire no ar do mundo.</p>
                <p style={{ fontSize:'0.9rem', color:'var(--text-sec)', lineHeight:1.8, fontWeight:600 }}>No ambiente, uma proteína verde — a clorofila, mãe da Hemoglobina — usa a luz do sol para partir o CO2 e fazer açúcar a partir de carbono e água, devolvendo o oxigênio ao ar do planeta, em um ciclo virtuoso perfeito.</p>
              </div>
            </div>
            {/* Coluna direita: Ciclo da Vida em retângulo branco vertical */}
            <div className="reveal" style={{ transitionDelay:'0.1s' }}>
              <div className="cycle-card" style={{ height:'100%' }}>
                <h4>O ciclo da vida</h4>
                <div className="cycle-step">
                  <div className="icon">⭐</div>
                  <div className="desc">Ferro — é poeira das estrelas, dá poder ao seu sangue.</div>
                </div>
                <div className="cycle-step">
                  <div className="icon"><img src={logo} className="fairy-mini" alt="Fadinha" /></div>
                  <div className="desc">Hemoglobina — A fada vermelha, que com o ferro faz você respirar.</div>
                </div>
                <div className="cycle-step">
                  <div className="icon">🫁</div>
                  <div className="desc">Ventilação — Ela capta o oxigênio do ar, 20x por minuto.</div>
                </div>
                <div className="cycle-step">
                  <div className="icon" style={{ color:'#DC2626' }}>❤️</div>
                  <div className="desc">Perfusão — Ela entrega oxigênio a cada célula do corpo e capta o gás carbônico do metabolismo.</div>
                </div>
                <div className="cycle-step">
                  <div className="icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.8">
                      <path d="M17.8 2c-1.5 0-3 .5-4.3 1.4C12.5 2 11.5 1.5 10.3 1.5 7.5 1.5 5 4 5 7c0 .5.1 1 .2 1.5C3.2 10 2 12.5 2 15.5 2 20 5.5 22 9 22c1.5 0 3-.5 4-1.5 1 1 2.5 1.5 4 1.5 3.5 0 7-2 7-6.5 0-3-1.2-5.5-3.2-7"/>
                      <path d="M12 22V8" strokeWidth="1.5"/><path d="M12 12l4-3" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 15l-3-2.5" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="desc">Clorofila — No meio ambiente, a mãe verde recicla o gás carbônico em oxigênio.</div>
                </div>
                <div className="cycle-step">
                  <div className="icon" style={{ color:'#3B82F6' }}>♻️</div>
                  <div className="desc">Ciclo perfeito — O vermelho e o verde sustentam a vida no planeta azul.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Botão X fechar na base (segundo ponto de saída) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              onClick={() => { setShowFilosofia(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              aria-label="Fechar Filosofia"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--wine)', color: 'white',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              ✕
            </button>
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section className="filosofia" id="sobre" style={{ display: showSobre ? 'block' : 'none', position: 'relative' }}>
        <div className="container">
          <div className="reveal">
            <span className="tag">Sobre</span>
            <h2 className="stitle" style={{ fontSize: '1.6rem' }}>RedFairy | OBA</h2>
          </div>

          {/* ===================================================================== */}
          {/* CONTEÚDO DA PÁGINA "SOBRE" */}
          {/* ===================================================================== */}
          <div className="reveal" style={{ marginTop: '1.5rem', maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>RedFairy<sup style={{ fontSize: '0.65em', fontWeight: 500 }}>®</sup></strong> e o <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>Projeto OBA<sup style={{ fontSize: '0.65em', fontWeight: 500 }}>TM</sup> — Otimizar o Bariátrico</strong> representam uma iniciativa institucional de <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>Cytomica<sup style={{ fontSize: '0.65em', fontWeight: 500 }}>®</sup></strong>, com forte compromisso ético e social, voltada à melhoria da qualidade de vida de pacientes com doenças e condições crônicas ou agudas que afetam a produção de hemoglobina e de células vermelhas. Entre eles, destacam-se os pacientes bariátricos, que frequentemente demandam atenção clínica especializada.
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              A iniciativa oferece <strong>avaliações iniciais gratuitas</strong>, acionadas por profissionais de saúde com o apoio de um algoritmo médico avançado, seguidas, quando necessário, de acompanhamento acessível, com suporte de inteligência artificial e assistência médica por telemedicina.
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              Desenvolvido ao longo de anos sob a orientação do <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>Dr. Estácio Ferreira Ramos</strong>, hematologista e pesquisador, o projeto reúne rigor médico, inovação e propósito social.
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.8rem' }}>
              O empreendimento inclui ainda um <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>Programa de Afiliados Patrocinado</strong>, destinado a ampliar o alcance da iniciativa e favorecer o acesso de um número crescente de pacientes à avaliação e ao cuidado.
            </p>

            {/* Fecho institucional em negrito simples */}
            <p style={{ textAlign: 'center', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: '0.5rem 0 0', letterSpacing: '0.5px' }}>
              Explore. Entenda. Compartilhe.
            </p>

          </div>
          {/* ===================================================================== */}

          {/* Botão X fechar na base (segundo ponto de saída) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              onClick={() => { setShowSobre(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              aria-label="Fechar Sobre"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--wine)', color: 'white',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              ✕
            </button>
          </div>
        </div>
      </section>

      {/* AFILIADOS */}
      <section className="filosofia" id="afiliados" style={{ display: showAfiliados ? 'block' : 'none', position: 'relative' }}>
        <div className="container">
          <div className="reveal">
            <span className="tag">Afiliados</span>
            <h2 className="stitle" style={{ fontSize: '1.6rem' }}>Programa de Afiliados</h2>
          </div>

          {/* ========================================================================= */}
          {/* CONTEÚDO DA PÁGINA "AFILIADOS" */}
          {/* ========================================================================= */}
          <div className="reveal" style={{ marginTop: '1.5rem', maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              O <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>Programa de Afiliados RedFairy | OBA</strong> está aberto ao apoio de <strong>empresas, filantropos, organizações sociais e fundações</strong> comprometidos com a ampliação do acesso à iniciativa.
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              Seu objetivo é estimular e reconhecer <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>médicos e outros profissionais de saúde</strong> que contribuam para expandir seu alcance, seja por meio de avaliações, seja por ações, ideias e iniciativas de difusão. Ao realizar a primeira avaliação de um paciente, o médico ou profissional de saúde já pode optar por integrar o Programa.
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.8rem' }}>
              Apoiar o programa é fortalecer o acesso de pessoas com condições ligadas ao <strong>ferro e à hemoglobina</strong> a mais saúde, desempenho e qualidade de vida.
            </p>

            {/* Fecho com call-to-action — "Entre em contato" é link para o modal */}
            <p style={{ textAlign: 'center', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: '0.5rem 0 0', letterSpacing: '0.3px' }}>
              Quer participar?{' '}
              <a
                href="#contato"
                onClick={(e) => {
                  e.preventDefault()
                  setShowAfiliados(false)
                  setShowContato(true)
                }}
                style={{ color: 'var(--wine)', textDecoration: 'underline', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cherry)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--wine)' }}
              >
                Entre em contato
              </a>
              . Será um prazer acolher seu apoio.
            </p>

          </div>
          {/* ========================================================================= */}

          {/* Botão X fechar na base (segundo ponto de saída) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              onClick={() => { setShowAfiliados(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              aria-label="Fechar Afiliados"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--wine)', color: 'white',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              ✕
            </button>
          </div>
        </div>
      </section>

      {/* INDICAÇÕES */}
      <section id="indicacoes">
        <div className="container">
          <div className="reveal center">
            <span className="tag">Indicações</span>
            <h2 className="stitle">Para quem é o RedFairy?</h2>
            <p className="sdesc" style={{ margin:"0 auto" }}>Avaliação e acompanhamento de condições clínicas relacionadas ao eritron e metabolismo do ferro.</p>
          </div>
          <div className="indicacoes-grid reveal">
            {/* Bariátricos — bolinha amarela */}
            <div className="ind" style={{ alignItems:'flex-start' }}>
              <span style={{ width:8, height:8, minWidth:8, borderRadius:'50%', background:'#EAB308', display:'block', flexShrink:0, marginTop:8 }} />
              <div>
                <strong>Bariátricos</strong>
                <div style={{ fontSize:'0.7rem', textTransform:'uppercase', fontWeight:400, color:'var(--text-light)', marginTop:'0.2rem' }}>OBA — Otimizar o Bariátrico</div>
              </div>
            </div>
            {/* Anemias — subtexto */}
            <div className="ind auto-dot" style={{ alignItems:'flex-start' }}>
              <div>
                <strong>Anemias</strong>
                <div style={{ fontSize:'0.7rem', textTransform:'uppercase', fontWeight:400, color:'var(--text-light)', marginTop:'0.2rem' }}>Crônicas ou Agudas</div>
              </div>
            </div>
            {/* Deficiência de Ferro */}
            <div className="ind" style={{ alignItems:'flex-start' }}>
              <span style={{ width:8, height:8, minWidth:8, borderRadius:'50%', background:'var(--cherry)', display:'block', flexShrink:0, marginTop:3 }} />
              <div>
                <strong>Deficiência de Ferro</strong>
                <div style={{ fontSize:'0.7rem', textTransform:'uppercase', fontWeight:400, color:'var(--text-light)', marginTop:'0.2rem' }}>Ferritina Baixa</div>
              </div>
            </div>
            {/* Excesso de Ferro */}
            <div className="ind" style={{ alignItems:'flex-start' }}>
              <span style={{ width:8, height:8, minWidth:8, borderRadius:'50%', background:'var(--cherry)', display:'block', flexShrink:0, marginTop:3 }} />
              <div>
                <strong>Excesso de Ferro</strong>
                <div style={{ fontSize:'0.7rem', textTransform:'uppercase', fontWeight:400, color:'var(--text-light)', marginTop:'0.2rem' }}>Ferritina Alta</div>
              </div>
            </div>
            {/* Hemoglobina Alta + Regime de Sangrias */}
            <div className="ind auto-dot" style={{ alignItems:'flex-start' }}>
              <div>
                <strong>Hemoglobina Alta</strong>
                <div style={{ fontSize:'0.7rem', textTransform:'uppercase', fontWeight:400, color:'var(--text-light)', marginTop:'0.2rem' }}>Regime de Sangrias</div>
              </div>
            </div>
            {/* Demais em negrito */}
            {['Sangramentos Crônicos','Vegetarianos','Gestantes','Celíacos','Doadores de Sangue','Uso de Testosterona','Endometriose e Miomas','Menstruação Excessiva','Deficiência de G-6-PD','Alcoolistas'].map(i => (
              <div key={i} className="ind auto-dot"><strong>{i}</strong></div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'center', marginTop:'1.5rem' }}>
            <a href="#oba" className="oba-home-btn" style={{ padding:'0.7rem 1.5rem' }}>
              <span className="oba-title">Projeto OBA</span>
              <span className="oba-sub">Otimizar o Bariátrico</span>
              <span className="oba-link">Saiba mais →</span>
            </a>
          </div>
        </div>
      </section>

      {/* TERAPÊUTICA */}
      <section className="terapeutica">
        <div className="container">
          <div className="reveal center">
            <span className="tag">Orientações Terapêuticas</span>
            <h2 className="stitle">Muito além do diagnóstico</h2>
            <p className="sdesc-bold" style={{ margin:"0 auto" }}>
              O RedFairy é um algoritmo médico, que não apenas avalia: ele orienta.<br />
              Gera recomendações personalizadas com base no perfil completo do paciente.
            </p>
          </div>
          <div className="terap-grid reveal">
            <div className="terap-card"><div className="tc-icon">💉</div><h4>Cálculo de dose para infusão de ferro</h4><p>Dose ideal de ferro endovenoso baseada no déficit estimado e peso do paciente.</p></div>
            <div className="terap-card"><div className="tc-icon">🩸</div><h4>Sangrias terapêuticas</h4><p>Número de sessões, volume e intervalo entre sangrias para siderose e poliglobulia.</p></div>
            <div className="terap-card"><div className="tc-icon">💊</div><h4>Reposição de ferro oral</h4><p>Dose, tipo de sal de ferro, horário e duração do tratamento via oral.</p></div>
            <div className="terap-card"><div className="tc-icon">📈</div><h4>Gráfico multiparamétrico</h4><p>Acompanhamento evolutivo do eritron ao longo do tempo para cada paciente.</p></div>
          </div>
          <div style={{ marginTop:'2rem', padding:'0 0 0.5rem' }}>
            <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.8rem' }} />
            <p style={{ color:'#1F2937', fontSize:'0.92rem', fontWeight:600, textAlign:'center', margin:'0 0 0.3rem' }}>
              Para fazer uma avaliação você vai precisar de algumas informações do eritrograma:
            </p>
            <p style={{ color:'#6B7280', fontSize:'0.85rem', fontWeight:600, textAlign:'center', margin:0 }}>
              Hemoglobina · VCM · RDW + Ferritina e Saturação da Transferrina
            </p>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="como" id="como-funciona">
        <div className="container">
          <div className="center reveal">
            <span className="tag">Como Funciona</span>
            <h2 className="stitle">Simples para médicos e pacientes</h2>
          </div>
          <div className="como-tabs-wrap reveal">
            <div className="como-tabs">
              <button className={`como-tab${activeTab === 'medico' ? ' active' : ''}`} onClick={() => setActiveTab('medico')}><span>Para Médicos</span><span style={{ display:"block", fontSize:"0.6rem", fontWeight:700, letterSpacing:"1.5px", opacity:0.7, marginTop:"0.1rem" }}>PROFISSIONAIS DE SAÚDE</span></button>
              <button className={`como-tab${activeTab === 'paciente' ? ' active' : ''}`} onClick={() => setActiveTab('paciente')}>Para Pacientes</button>
            </div>
          </div>
          <div className="como-content">
            {activeTab === 'medico' && (
              <div>
                <div className="flow">
                  <div className="flow-step"><div className="flow-num">1</div><h4>Acesse o Modo Médico<br/><span style={{ fontSize:"0.6rem", fontWeight:700, letterSpacing:"1.5px", color:"var(--cherry)", textTransform:"uppercase" }}>Profissionais de Saúde</span></h4><p>Gratuito, sem cadastro. Use o seu CRM para acesso imediato à calculadora clínica.</p></div>
                  <div className="flow-step"><div className="flow-num">2</div><h4>Insira o CPF do paciente</h4><p>Única informação de identificação. Vincula os dados ao paciente automaticamente.</p></div>
                  <div className="flow-step"><div className="flow-num">3</div><h4>Preencha os parâmetros</h4><p>Apenas cinco parâmetros laboratoriais e algumas caixinhas com dados clínicos.</p></div>
                  <div className="flow-step"><div className="flow-num">4</div><h4>Avalie e oriente</h4><p>Diagnóstico, orientações terapêuticas e dosagens em segundos.</p></div>
                </div>
                <div style={{ margin:'1.5rem 0 0' }}>
                  <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.8rem' }} />
                  <p style={{ color:'#1F2937', fontSize:'0.95rem', fontWeight:600, textAlign:'center', margin:'0 0 0.2rem' }}>
                    O Programa de Afiliados RedFairy beneficia quem beneficia os seus pacientes.
                  </p>
                  <p style={{ color:'#6B7280', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', margin:'0.2rem 0 0', cursor:'pointer' }}
                     onClick={() => document.getElementById('acesso')?.scrollIntoView({ behavior:'smooth' })}>
                    CONHEÇA AS REGRAS
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'paciente' && (
              <div>
                <div className="flow">
                  <div className="flow-step"><div className="flow-num">1</div><h4>Informe seu CPF</h4><p>Se o seu médico já fez a primeira avaliação, seus dados já estarão aqui. Se ele não fez, você mesmo faz. Tenha em mãos o seu Hemograma, a Ferritina e a Saturação da Transferrina.</p></div>
                  <div className="flow-step"><div className="flow-num">2</div><h4>Complete ou Faça um Novo Cadastro</h4><p>Cadastro simples com e-mail, senha e celular. Rápido e seguro.</p></div>
                  <div className="flow-step"><div className="flow-num">3</div><h4>Assine via PIX</h4><p>R$ 149,90/ano via QR Code, Chave PIX ou Copie e Cole.</p></div>
                  <div className="flow-step"><div className="flow-num">4</div><h4>Acompanhe seu eritron</h4><p>Novas avaliações geram o gráfico multiparamétrico da sua saúde eritrocitária.</p></div>
                </div>
                <div className="patient-features">
                  <div className="pf-card">
                    {/* Gráfico evolutivo - ícone de linha de gráfico */}
                    <svg className="pf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <h4>Gráfico evolutivo</h4>
                    <p>Acompanhe a evolução dos parâmetros ao longo do tempo em um painel visual.</p>
                  </div>
                  <div className="pf-card">
                    {/* Orientações - ícone de documento com check */}
                    <svg className="pf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <polyline points="9 15 11 17 15 13"/>
                    </svg>
                    <h4>Orientações claras e Prescrições</h4>
                    <p>Resultados em linguagem acessível, com recomendações práticas, emissão de receitas médicas, e pedidos de exames.</p>
                    <p style={{marginTop:'0.6rem', display:'flex', alignItems:'flex-start', gap:'0.4rem'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" style={{flexShrink:0, marginTop:'2px'}}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#DC2626"/>
                        <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="12" y1="17" x2="12.01" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span style={{color:'#5C1515', fontSize:'0.78rem', fontWeight:600}}>ATENÇÃO: Haverá uma pequena taxa a pagar pela emissão de receitas médicas e pedidos de exames.</span>
                    </p>
                  </div>
                  <div className="pf-card">
                    {/* Conectado ao médico - ícone de coração + pulso */}
                    <svg className="pf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      <path d="M18.364 5.636a9 9 0 0 1 0 12.728" strokeDasharray="2 2"/>
                    </svg>
                    <h4>Conectado ao seu médico</h4>
                    <p>A avaliação do médico já está no seu perfil quando você se cadastrar.</p>
                  </div>
                </div>
                <div className="pricing-box">
                  <div className="price">R$ 149,90</div>
                  <div className="price-sub">Por um ano de avaliações na plataforma</div>
                  <div className="pix-methods">
                    <div className="pix-tag">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M17 14h3M14 17v3M17 20h3"/></svg>
                      QR Code PIX
                    </div>
                    <div className="pix-tag">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                      Chave PIX
                    </div>
                    <div className="pix-tag">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      Copie e Cole
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* EXPERIMENTE AGORA */}
      <section id="avaliar" style={{ background:'white', padding:'5.5rem 2rem' }}>
        <div className="container">
          <div className="center reveal" style={{ marginBottom:'2.5rem' }}>
            <span className="tag">Experimente Agora</span>
            <h2 className="stitle">Faça uma avaliação gratuita</h2>
            <p className="sdesc" style={{ margin:'0 auto' }}>Sem cadastro. Insira os dados e veja o diagnóstico.</p>
          </div>

          {/* Mockup celular */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ width:300, background:'#1A1A2E', borderRadius:40, border:'8px solid #2A2A3E', boxShadow:'0 0 0 2px #111, inset 0 0 0 1px rgba(255,255,255,0.05)', overflow:'hidden' }}>

              {/* Notch */}
              <div style={{ background:'#111', height:26, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:60, height:13, background:'#1A1A2E', borderRadius:'0 0 10px 10px' }} />
              </div>
              {/* Status bar */}
              <div style={{ background:'#0F0F1A', padding:'3px 16px', display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:9 }}>9:41</span>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:9 }}>▮▮▮ 🔋</span>
              </div>
              {/* Header com logo */}
              <div style={{ background:'linear-gradient(135deg,#7B1E1E,#DC2626)', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                <img src={logo} alt="RedFairy" style={{ height:24, objectFit:'contain', filter:'brightness(0) invert(1)' }} />
                <p style={{ color:'rgba(255,255,255,0.65)', fontSize:8, margin:0, letterSpacing:'0.5px' }}>Eritron e Metabolismo do Ferro</p>
              </div>

              {/* Tela */}
              <div id="rf-screen" style={{ background:'#0F0F1A', height:500, overflowY:'auto' }}>

                {/* Formulário */}
                <div id="rf-view-form" style={{ padding:11 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.75)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Sexo</label>
                      <select id="rf-sexo" style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'white', fontSize:11, outline:'none' }}>
                        <option value="F">Feminino</option><option value="M">Masculino</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.75)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Idade</label>
                      <input type="number" id="rf-idade" placeholder="35" style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'white', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.75)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Hb (g/dL)</label>
                      <input type="number" id="rf-hb2" step="0.1" placeholder="12.5" style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'white', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.75)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Ferritina (ng/mL)</label>
                      <input type="number" id="rf-ferr2" step="0.1" placeholder="15" style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'white', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.75)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>VCM (fL)</label>
                      <input type="number" id="rf-vcm2" step="0.1" placeholder="82" style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'white', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.75)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>RDW (%)</label>
                      <input type="number" id="rf-rdw2" step="0.1" placeholder="13.5" style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'white', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <label style={{ color:'rgba(255,255,255,0.75)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Sat. Transferrina (%)</label>
                    <input type="number" id="rf-sat2" step="0.1" placeholder="25" style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'white', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                  </div>

                  {/* Contexto Clínico */}
                  <div style={{ marginBottom:10 }}>
                    <p style={{ color:'rgba(255,255,255,0.65)', fontSize:8, textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px' }}>Contexto Clínico</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:6 }}>
                      {[['bariatrica','Bariátrica'],['vegetariano','Vegetariano'],['perda','Hemorragia'],['alcoolista','Alcoolista'],['transfundido','Transfundido'],['hemoAlta','Hb Alta']].map(([k,l]) => (
                        <label key={k} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.28)', borderRadius:6, padding:'5px 6px', cursor:'pointer', fontSize:9, color:'rgba(255,255,255,0.7)' }}>
                          <input type="checkbox" id={`rf2-${k}`} style={{ width:10, height:10, accentColor:'#DC2626', flexShrink:0 }} /> {l}
                        </label>
                      ))}
                    </div>
                    <p style={{ color:'rgba(255,255,255,0.65)', fontSize:8, textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px' }}>Medicamentos</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                      {[['aspirina','Aspirina'],['b12','Vitamina B12'],['ferroMed','Ferro Oral/EV']].map(([k,l]) => (
                        <label key={k} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.28)', borderRadius:6, padding:'5px 6px', cursor:'pointer', fontSize:9, color:'rgba(255,255,255,0.7)' }}>
                          <input type="checkbox" id={`rf2-${k}`} style={{ width:10, height:10, accentColor:'#DC2626', flexShrink:0 }} /> {l}
                        </label>
                      ))}
                    </div>
                  </div>

                  <p id="rf-erro2" style={{ color:'#F87171', fontSize:10, margin:'0 0 6px', display:'none' }} />
                  <button onClick={() => rfAvaliar2()} style={{ width:'100%', background:'#7B1E1E', color:'white', border:'none', borderRadius:9, padding:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    🔬 Avaliar Eritron
                  </button>
                  <p style={{ color:'rgba(255,255,255,0.2)', fontSize:8, textAlign:'center', margin:'8px 0 0', letterSpacing:'0.3px' }}>
                    RedFairy · Cuidar do Seu Eritron · by cytomica.com © 2026
                  </p>
                </div>

                {/* Resultado */}
                <div id="rf-view-result" style={{ display:'none', padding:11 }}>
                  <div id="rf-result-header" style={{ borderRadius:'10px 10px 0 0', padding:'10px 12px' }}>
                    <p style={{ fontSize:8, color:'rgba(255,255,255,0.6)', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:1 }}>Diagnóstico</p>
                    <p id="rf-result-label" style={{ fontSize:13, fontWeight:700, color:'white', margin:0 }} />
                  </div>
                  <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'0 0 10px 10px', padding:'10px 12px', marginBottom:8 }}>
                    <p style={{ fontSize:8, color:'rgba(255,255,255,0.45)', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:1 }}>Diagnóstico</p>
                    <p id="rf-result-diag" style={{ fontSize:10, color:'white', margin:'0 0 10px', lineHeight:1.6 }} />
                    <p style={{ fontSize:8, color:'rgba(255,255,255,0.45)', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:1 }}>Recomendação</p>
                    <p id="rf-result-rec" style={{ fontSize:10, color:'white', margin:0, lineHeight:1.6 }} />
                  </div>
                  <div style={{ background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'10px 12px', textAlign:'center', marginBottom:8 }}>
                    <p style={{ color:'rgba(255,255,255,0.55)', fontSize:9, margin:'0 0 6px' }}>Para orientações completas com dosagens:</p>
                    <button onClick={() => {
                        const hb   = document.getElementById('rf-hb2')?.value
                        const ferr = document.getElementById('rf-ferr2')?.value
                        const vcm  = document.getElementById('rf-vcm2')?.value
                        const rdw  = document.getElementById('rf-rdw2')?.value
                        const sat  = document.getElementById('rf-sat2')?.value
                        const sexo = document.getElementById('rf-sexo')?.value
                        const idade= document.getElementById('rf-idade')?.value
                        const bari = document.getElementById('rf2-bariatrica')?.checked
                        const dados = { hb, ferr, vcm, rdw, sat, sexo, idade, bariatrica: bari }
                        localStorage.setItem('rf_demo_dados', JSON.stringify(dados))
                        if (bari) localStorage.setItem('rf_flag', 'bariatrica')
                        onModoMedico()
                      }} style={{ background:'#7B1E1E', color:'white', border:'none', borderRadius:7, padding:'7px 12px', fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                        Acessar RedFairy completo →
                      </button>
                  </div>
                  <button onClick={() => rfReset2()} style={{ width:'100%', background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.6)', border:'none', borderRadius:8, padding:8, fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                    ← Nova avaliação
                  </button>
                </div>
              </div>

              {/* Home bar */}
              <div style={{ background:'#0F0F1A', padding:7, display:'flex', justifyContent:'center' }}>
                <div style={{ width:70, height:3, background:'rgba(255,255,255,0.2)', borderRadius:2 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROJETO OBA */}
      <section className="oba" id="oba">
        <div className="container">
          <div className="reveal">
            <span className="tag">Projeto OBA</span>
            <h2 className="stitle">Otimizar o Bariátrico</h2>
            <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'1rem', maxWidth:580, lineHeight:1.7, fontWeight:700 }}>Milhares de bariátricos vivem desassistidos. O Projeto OBA é um sub-algoritmo especializado dentro do RedFairy que cuida especificamente de quem fez cirurgia bariátrica.</p>
          </div>
          <div className="oba-grid">
            <div className="oba-narrative reveal">
              <div className="oba-metaphor"><p>A cirurgia bariátrica corta as asas da sua fada vermelha.<br />Ela continua com seus superpoderes, mas para voar precisa da ajuda do RedFairy.</p></div>
              <p>O bypass gástrico e a gastrectomia causam uma <strong>síndrome disabsortiva</strong> que prejudica a absorção de ferro, vitamina B12 e outros elementos essenciais.</p>
              <p>O Projeto OBA oferece um <strong>tratamento de manutenção indefinido</strong>: monitoramento contínuo, cálculo de reposição personalizado e orientações específicas.</p>
              <div className="oba-cta-row">
                <button className="btn btn-oba-main" onClick={() => {
                        localStorage.setItem('rf_flag', 'bariatrica')
                        onModoPaciente && onModoPaciente()
                      }} style={{ flexDirection:'column', gap:'0.2rem', alignItems:'center', animation:'pulse 1.5s ease-out infinite', margin:'0 auto', display:'flex', border:'2px solid rgba(220,38,38,0.8)' }}>
                  <span>Sou Bariátrico — Começar</span>
                  <span style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'1px', opacity:0.8, fontWeight:700 }}>Siga as Instruções</span>
                </button>
              </div>
            </div>
            <div className="oba-features reveal" style={{ transitionDelay:'0.1s' }}>
              <div className="oba-feat"><div className="of-icon">🔬</div><div><h4>Mini-anamnese especializada</h4><p>Informações adicionais para que o algoritmo cuide de você especificamente.</p></div></div>
              <div className="oba-feat"><div className="of-icon">💊</div><div><h4>Reposição personalizada</h4><p>Cálculo de ferro, B12 e outros elementos prejudicados pela síndrome disabsortiva.</p></div></div>
              <div className="oba-feat"><div className="of-icon">📈</div><div><h4>Monitoramento contínuo</h4><p>Evolução dos parâmetros com gráficos e alertas personalizados.</p></div></div>
              <div className="oba-feat"><div className="of-icon">💰</div><div><h4>Muito mais acessível</h4><p>Custa uma fração do acompanhamento médico tradicional recorrente.</p></div></div>
              <div className="oba-feat"><div className="of-icon">🔗</div><div><h4>Manutenção indefinida</h4><p>O bariátrico precisa de cuidado contínuo. O RedFairy está sempre ao seu lado.</p></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-final" id="acesso">
        <div className="container">
          <div className="center reveal" style={{ marginBottom:'2.5rem' }}>
            <span className="tag">Comece Agora</span>
            <h2 style={{ fontSize:'1.6rem', fontWeight:800, color:'var(--wine)', marginBottom:'0.8rem' }}>Cuide da sua Hemoglobina, ela é a sua vida.</h2>
          </div>
          <div className="cta-cards reveal">
            <div className="cta-c cta-doc">
              <div className="ci">🩺</div>
              <h3>Modo Médico<br/><span style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"1.5px", opacity:0.7 }}>PROFISSIONAIS DE SAÚDE</span></h3>
              <p>Avaliação rápida sem cadastro. Insira o CPF e os dados do paciente e obtenha diagnóstico com orientações terapêuticas.</p>
              <ul>
                <li>Acesso 100% gratuito</li>
                <li>Sem cadastro necessário</li>
                <li>Orientações terapêuticas com dosagens</li>
                <li>Ganhe 10 USDC por paciente cadastrado</li>
              </ul>
              <button className="btn-cta-doc" onClick={onModoMedico} style={{ flexDirection:"column", gap:"0.1rem" }}>Acessar como Médico<span style={{ fontSize:"0.6rem", fontWeight:700, letterSpacing:"1.5px", opacity:0.7 }}>PROFISSIONAIS DE SAÚDE</span></button>
            </div>
            <div className="cta-c cta-pat">
              <div className="ci">❤️</div>
              <h3>Modo Paciente</h3>
              <p>Cadastre-se e acompanhe a evolução do seu eritron ao longo do tempo.</p>
              <ul>
                <li>Primeira avaliação já disponível</li>
                <li>Gráfico evolutivo multiparamétrico</li>
                <li>Orientações em linguagem acessível</li>
                <li>R$ 149,90/ano via PIX</li>
              </ul>
              <button className="btn-cta-pat" onClick={onModoPaciente}>Acessar como Paciente</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding:'0.8rem 1rem', borderTop:'1px solid var(--border)', textAlign:'center' }}>
        <p style={{ fontSize:'0.65rem', color:'var(--text-light)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', margin:'0 0 0.3rem', letterSpacing:'-0.01em' }}>
          <img src={logo} alt="" style={{ height:14, verticalAlign:'middle', marginRight:4 }} />
          <span style={{ fontFamily:"'DM Serif Display',serif", color:'var(--wine)' }}>Red<em style={{color:'var(--cherry)',fontStyle:'normal'}}>Fairy</em></span>
          {' · '}Cuidar do Seu Eritron{' · '}by <a href="https://cytomica.com" style={{color:'var(--text-sec)'}}>cytomica.com</a> © 2026{' · '}E.F. Ramos, M.D. CRM 6302 BA{' · '}<a href="https://drestacioramos.com.br" style={{color:'var(--text-sec)'}}>drestacioramos.com.br</a>
        </p>
        <p style={{ fontSize:'0.62rem', color:'var(--text-light)', margin:0 }}>
          <span style={{ color:'var(--cherry)', fontWeight:700 }}>*</span>{' '}Válido para todos os profissionais de saúde com registro profissional em Conselho Regional/Federal.
        </p>
      </footer>

    </div>
  )
}
