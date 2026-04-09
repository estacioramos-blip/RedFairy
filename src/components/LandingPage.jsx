import { useState, useEffect, useRef } from 'react'
import logo from '../assets/logo.png'
import filosofiaBg from '../../redfairy-filosofia-bg.png'
import fairy3 from '../../redfairy3.png'

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
  body { font-family: 'DM Sans', -apple-system, sans-serif; color: var(--text); background: var(--white); line-height: 1.65; overflow-x: hidden; -webkit-font-smoothing: antialiased; }

  nav { position: fixed; top: 0; width: 100%; z-index: 100; padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; }
  nav.scrolled { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); box-shadow: 0 1px 8px rgba(0,0,0,0.04); }
  .nav-brand { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; }
  .nav-brand span { font-family: 'DM Serif Display', serif; font-size: 1.4rem; color: var(--wine); }
  .nav-brand em { font-style: normal; color: var(--cherry); }
  .nav-links { display: flex; gap: 1.8rem; align-items: center; }
  .nav-links a { text-decoration: none; font-size: 0.87rem; font-weight: 500; color: var(--text-sec); transition: color 0.2s; }
  .nav-links a:hover { color: var(--text); }
  .btn-sm { padding: 0.5rem 1.2rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; text-decoration: none; transition: all 0.2s; display: inline-flex; align-items: center; cursor: pointer; border: none; font-family: inherit; }
  .btn-wine { background: var(--wine); color: var(--white) !important; }
  .btn-wine:hover { background: var(--cherry); }
  .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 4px; flex-direction: column; gap: 4px; }
  .hamburger span { display: block; width: 20px; height: 2px; background: var(--text); border-radius: 2px; }

  .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 2rem; border-radius: 10px; font-size: 0.95rem; font-weight: 600; text-decoration: none; border: none; cursor: pointer; transition: all 0.25s; font-family: inherit; }
  .btn-primary { background: var(--wine); color: var(--white); }
  .btn-primary:hover { background: var(--cherry); transform: translateY(-2px); }
  .btn-secondary { background: #9CA3AF; color: var(--white); border: 1.5px solid #9CA3AF; }
  .btn-secondary:hover { background: #374151; border-color: #374151; transform: translateY(-2px); }

  .hero { min-height: 100vh; display: flex; align-items: center; padding: 7rem 2rem 4rem; background: linear-gradient(170deg, var(--white) 0%, var(--gray-bg) 45%, var(--white) 100%); }
  .hero-wrap { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 4rem; align-items: center; }
  .hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; background: #374151; color: var(--white); padding: 0.6rem 1.5rem; border-radius: 10px; font-size: 0.82rem; font-weight: 700; margin-bottom: 1.2rem; letter-spacing: 0.5px; }
  .hero-badge .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--white); animation: pDot 2s ease-in-out infinite; }
  @keyframes pDot { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(1.5);} }
  .hero-badge-sub { font-size: 0.78rem; color: var(--text-sec); margin-bottom: 1.2rem; font-weight: 700; }
  .hero h1 { font-size: 3.2rem; line-height: 1.15; color: var(--text); margin-bottom: 1.2rem; font-weight: 800; }
  .hero h1 .red { color: var(--cherry); }
  .hero-philosophy { font-style: italic; font-size: 1.15rem; color: var(--wine); margin-bottom: 0.8rem; line-height: 1.6; }
  .hero-desc { font-size: 1.05rem; color: var(--text-sec); max-width: 500px; line-height: 1.75; margin-bottom: 2rem; }
  .hero-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .trust { margin-top: 2rem; display: flex; gap: 1.8rem; align-items: center; flex-wrap: wrap; }
  .trust-i { display: flex; align-items: center; gap: 0.35rem; }
  .trust-i svg { width: 15px; height: 15px; color: var(--cherry); }
  .trust-i span { font-size: 0.8rem; color: var(--text-light); }
  .hero-visual { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
  .fairy-showcase { width: 200px; height: 200px; }
  .fairy-showcase img { width: 100%; height: 100%; object-fit: contain; animation: floatFairy 4s ease-in-out infinite; }
  @keyframes floatFairy { 0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);} }
  .fairy-quote { background: rgba(123,30,30,0.06); border-left: 3px solid var(--wine); border-radius: 0 10px 10px 0; padding: 1rem 1.2rem; max-width: 300px; }
  .fairy-quote p { font-size: 0.88rem; color: var(--wine); line-height: 1.6; }
  .fairy-quote .question { font-weight: 700; margin-top: 0.5rem; }

  .oba-home-btn { background: linear-gradient(135deg, var(--oba-orange), var(--oba-blue-dark)); border-radius: 12px; padding: 1rem 1.5rem; text-decoration: none; display: flex; flex-direction: column; gap: 0.2rem; transition: transform 0.2s, box-shadow 0.2s; width: 100%; max-width: 300px; box-shadow: 0 6px 25px rgba(232,114,12,0.3); }
  .oba-home-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(232,114,12,0.4); }
  .oba-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: var(--oba-orange-light); font-weight: 700; }
  .oba-sub { font-size: 1rem; color: white; font-weight: 700; }
  .oba-link { font-size: 0.8rem; color: rgba(255,255,255,0.6); }

  .hero-textbox { background: white; border: 1px solid var(--border2); border-radius: 16px; padding: 1.8rem; box-shadow: var(--shadow); transition: border-color 0.3s; margin-bottom: 1.5rem; cursor: default; position: relative; overflow: hidden; }
  .hero-textbox.reveal-img { border-color: var(--cherry); }
  .htb-content { position: relative; z-index: 1; }

  .container { max-width: 1140px; margin: 0 auto; padding: 0 2rem; }
  section { padding: 5.5rem 2rem; }
  .center { text-align: center; }
  .tag { display: inline-block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: var(--wine); margin-bottom: 0.6rem; }
  .stitle { font-family: 'DM Serif Display', serif; font-size: 2.4rem; line-height: 1.25; color: var(--text); margin-bottom: 0.8rem; }
  .sdesc { font-size: 1rem; color: var(--text-sec); max-width: 580px; line-height: 1.75; }

  .filosofia { position: relative; overflow: hidden; cursor: default; background: linear-gradient(170deg, #FEF2F2 0%, #FFF 60%); transition: background 0.5s; }
  .filosofia.reveal-img { background: linear-gradient(170deg, rgba(123,30,30,0.08) 0%, rgba(220,38,38,0.04) 60%); }
  .filosofia .container { position: relative; z-index: 1; }
  .filosofia-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; margin-top: 2.5rem; align-items: start; }
  .filosofia-text p { font-size: 0.95rem; color: var(--text-sec); line-height: 1.85; margin-bottom: 1rem; }
  .highlight-box { background: var(--wine); border-radius: 12px; padding: 1.2rem 1.5rem; margin-top: 1.5rem; }
  .highlight-box p { color: white; font-weight: 700; font-size: 1rem; margin: 0; }
  .cycle-card { background: white; border-radius: 16px; padding: 1.8rem; box-shadow: var(--shadow); border: 1px solid var(--border); }
  .cycle-card h4 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-light); margin-bottom: 1.2rem; font-weight: 700; }
  .cycle-step { display: flex; gap: 0.8rem; align-items: flex-start; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
  .cycle-step:last-child { border-bottom: none; }
  .cycle-step .icon { font-size: 1.2rem; min-width: 40px; text-align: center; display: flex; align-items: center; justify-content: center; }
  .cycle-step .desc { font-size: 0.85rem; color: var(--text-sec); line-height: 1.6; padding-top: 0.1rem; }
  .fairy-mini { width: 36px; height: 36px; object-fit: contain; }

  .indicacoes-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 2rem; }
  .ind { background: white; border: 1px solid var(--border2); border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.85rem; color: var(--text-sec); font-weight: 500; transition: all 0.2s; }
  .ind:hover { border-color: var(--cherry); color: var(--cherry); background: var(--cherry-bg); }

  .terapeutica { background: var(--gray-bg); }
  .terap-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.2rem; margin-top: 2.5rem; }
  .terap-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.8rem; transition: all 0.2s; }
  .terap-card:hover { box-shadow: var(--shadow); }
  .terap-card .tc-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 0.8rem; background: var(--cherry-bg); }
  .terap-card h4 { font-size: 0.95rem; margin-bottom: 0.3rem; }
  .terap-card p { font-size: 0.83rem; color: var(--text-sec); }

  .como { background: var(--gray-bg); }
  .como-tabs-wrap { display: flex; justify-content: center; margin-top: 2rem; margin-bottom: 2.5rem; }
  .como-tabs { display: inline-flex; gap: 0.5rem; background: var(--border2); border-radius: 10px; padding: 4px; }
  .como-tab { padding: 0.65rem 2.5rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; border: none; cursor: pointer; background: none; color: var(--text-sec); transition: all 0.2s; font-family: inherit; }
  .como-tab.active { background: white; color: var(--text); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
  .flow-step { text-align: center; }
  .flow-num { width: 40px; height: 40px; border-radius: 50%; background: var(--wine); color: white; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.8rem; }
  .flow-step h4 { font-size: 0.92rem; margin-bottom: 0.4rem; }
  .flow-step p { font-size: 0.82rem; color: var(--text-sec); line-height: 1.6; }

  .reward-banner { background: linear-gradient(135deg, #1a3a1a, #22863A); border-radius: 14px; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; }
  .reward-text h4 { color: white; font-size: 1rem; margin-bottom: 0.3rem; }
  .reward-text p { color: rgba(255,255,255,0.7); font-size: 0.85rem; line-height: 1.6; }
  .reward-text strong { color: #86EFAC; }
  .reward-klipbit { display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 8px; padding: 0.3rem 0.8rem; margin-top: 0.6rem; }
  .reward-klipbit span { color: white; font-size: 0.8rem; font-weight: 700; }
  .reward-amount { font-size: 2.2rem; font-weight: 800; color: #86EFAC; white-space: nowrap; }

  .patient-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .pf-card { background: white; border-radius: 12px; padding: 1.2rem; text-align: center; border: 1px solid var(--border); }
  .pf-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
  .pf-card h4 { font-size: 0.9rem; margin-bottom: 0.3rem; }
  .pf-card p { font-size: 0.8rem; color: var(--text-sec); }
  .pricing-box { background: white; border: 1px solid var(--border2); border-radius: 14px; padding: 1.5rem; text-align: center; }
  .price { font-size: 2.5rem; font-weight: 800; color: var(--wine); }
  .price-sub { font-size: 0.9rem; color: var(--text-sec); margin-bottom: 1rem; }
  .pix-methods { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
  .pix-tag { background: var(--gray-bg); border: 1px solid var(--border2); border-radius: 8px; padding: 0.4rem 0.8rem; font-size: 0.8rem; color: var(--text-sec); }

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
  .btn-oba-main:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(232,114,12,0.4); }

  .cta-final { background: var(--gray-bg); }
  .cta-final .tag { color: var(--cherry); }
  .cta-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 2.5rem; }
  .cta-c { border-radius: 16px; padding: 1.8rem; transition: transform 0.25s; }
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
  .btn-cta { width: 100%; display: flex; align-items: center; justify-content: center; padding: 0.85rem 2rem; border-radius: 10px; font-size: 0.95rem; font-weight: 600; border: none; cursor: pointer; font-family: inherit; transition: all 0.25s; }
  .btn-cta-doc { background: var(--wine); color: var(--white); }
  .btn-cta-doc:hover { background: var(--cherry); transform: translateY(-2px); }
  .btn-cta-pat { background: rgba(255,255,255,0.15); color: var(--white); border: 1.5px solid rgba(255,255,255,0.3) !important; }
  .btn-cta-pat:hover { background: rgba(255,255,255,0.25); transform: translateY(-2px); }

  footer { padding: 2.5rem 2rem; text-align: center; border-top: 1px solid var(--border); }
  .foot-brand { display: inline-flex; align-items: center; gap: 0.4rem; }
  .foot-brand img { height: 28px; }
  .foot-brand span { font-family: 'DM Serif Display', serif; font-size: 1.15rem; color: var(--wine); }
  .foot-brand em { font-style: normal; color: var(--cherry); }
  footer .foot-tag { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: var(--text-light); margin-top: 0.15rem; font-weight: 700; }
  footer .credits { font-size: 0.77rem; color: var(--text-light); margin-top: 1rem; line-height: 1.6; }
  footer a { color: var(--text-sec); text-decoration: none; }
  footer a:hover { color: var(--wine); }

  .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.65s ease, transform 0.65s ease; }
  .reveal.show { opacity: 1; transform: translateY(0); }

  @media (max-width: 900px) {
    .hero-wrap { grid-template-columns: 1fr; text-align: center; }
    .hero h1 { font-size: 2.5rem; }
    .hero-desc { margin: 0 auto 2rem; }
    .hero-actions { justify-content: center; }
    .trust { justify-content: center; }
    .fairy-showcase { width: 140px; height: 140px; }
    .filosofia-grid, .oba-grid, .cta-cards { grid-template-columns: 1fr; }
    .stitle { font-size: 1.85rem; }
    .nav-links { display: none; }
    .hamburger { display: flex; }
    .nav-links.open { display: flex; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: var(--white); padding: 1rem 2rem; border-bottom: 1px solid var(--border); box-shadow: var(--shadow); }
    .flow { grid-template-columns: 1fr 1fr; }
    .patient-features { grid-template-columns: 1fr; }
    .reward-banner { flex-direction: column; text-align: center; }
  }
`

function rfInRange(v, r) { return v >= r.min && v <= r.max }
function rfMatch(matrix, inp) {
  return matrix.find(id => {
    const c = id.conditions
    if (!rfInRange(inp.ferritina,   c.ferritina))   return false
    if (!rfInRange(inp.hemoglobina, c.hemoglobina)) return false
    if (!rfInRange(inp.vcm,         c.vcm))         return false
    if (!rfInRange(inp.rdw,         c.rdw))         return false
    if (!rfInRange(inp.satTransf,   c.satTransf))   return false
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
  { id:82, label:'ANEMIA MACROCÍTICA — PROVÁVEL DÉFICIT DE FOLATOS', color:'orange',
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

export default function LandingPage({ onModoMedico, onModoPaciente }) {
  const [navScrolled, setNavScrolled] = useState(false)
  const [navOpen,     setNavOpen]     = useState(false)
  const [activeTab,   setActiveTab]   = useState('medico')
  const [showFilImg,  setShowFilImg]  = useState(false)
  const [showHtbImg,  setShowHtbImg] = useState(false)
  const [rfSexo,      setRfSexo]     = useState('F')
  const [rfResultado, setRfResultado] = useState(null)
  const [rfErro,      setRfErro]     = useState('')
  const [rfForm,      setRfForm]     = useState({
    idade:'', hb:'', ferritina:'', vcm:'', rdw:'', sat:'',
    bariatrica:false, vegetariano:false, perda:false,
    alcoolista:false, transfundido:false,
    aspirina:false, b12:false, ferroMed:false,
    hiper:false, gestante:false,
  })
  const filTimer = useRef(null)
  const htbTimer = useRef(null)

  useEffect(() => {
    if (!document.getElementById('landing-css')) {
      const style = document.createElement('style')
      style.id = 'landing-css'
      style.textContent = LANDING_CSS
      document.head.appendChild(style)
    }
    if (!document.getElementById('landing-fonts')) {
      const link = document.createElement('link')
      link.id  = 'landing-fonts'
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

  // Hover: aparece nítido instantaneamente, some suavemente após 2s
  function showFil() {
    if (filTimer.current) clearTimeout(filTimer.current)
    setShowFilImg(true)
    filTimer.current = setTimeout(() => setShowFilImg(false), 2000)
  }
  function showHtb() {
    if (htbTimer.current) clearTimeout(htbTimer.current)
    setShowHtbImg(true)
    htbTimer.current = setTimeout(() => setShowHtbImg(false), 2000)
  }

  function handleFormChange(field, value) {
    setRfForm(prev => ({ ...prev, [field]: value }))
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
    <div style={{ fontFamily:"'DM Sans', sans-serif" }}>

      {/* NAV */}
      <nav id="nav" className={navScrolled ? 'scrolled' : ''}>
        <a href="#" className="nav-brand">
          <img src={logo} alt="RedFairy" style={{ height:36 }} />
          <span>Red<em>Fairy</em></span>
        </a>
        <div className={`nav-links${navOpen ? ' open' : ''}`}>
          <a href="#filosofia">Filosofia</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#indicacoes">Indicações</a>
          <a href="#avaliar">Avaliar</a>
          <a href="#oba">Projeto OBA</a>
          <button className="btn-sm btn-wine" onClick={onModoMedico}>Acessar</button>
        </div>
        <button className="hamburger" onClick={() => setNavOpen(!navOpen)}>
          <span /><span /><span />
        </button>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-wrap">
          <div className="reveal">
            <div className="hero-badge"><div className="dot" />Doutor, avalie o seu paciente</div>
            <p className="hero-badge-sub">Você vai precisar de algumas informações do eritrograma:<br />Hemoglobina · VCM · RDW + Ferritina e Saturação da Transferrina</p>

            {/* hero-textbox: hover mostra redfairy-filosofia-bg */}
            <div className={`hero-textbox${showHtbImg ? ' reveal-img' : ''}`} onMouseEnter={showHtb} onTouchStart={showHtb}>
              <img src={filosofiaBg} alt="" aria-hidden="true" style={{
                position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', borderRadius:14,
                opacity: showHtbImg ? 0.18 : 0,
                transition: showHtbImg ? 'opacity 0.05s ease' : 'opacity 1.8s ease',
                pointerEvents:'none',
              }} />
              <div className="htb-content">
                <h1>Eu sou a sua fada vermelha, a sua <span className="red">Hemoglobina</span></h1>
                <p className="hero-philosophy">Eu uso a poeira das estrelas para te entregar o ar.<br />Quanto tempo você vive sem ar?</p>
              </div>
            </div>

            <p className="hero-desc">Avalie o eritron e o metabolismo do ferro com precisão clínica. Monitore a evolução da sua hemoglobina e receba orientações terapêuticas ajustadas às suas necessidades.</p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={onModoMedico}>Sou Médico</button>
              <button className="btn btn-secondary" onClick={onModoPaciente}>Sou Paciente</button>
            </div>
            <div className="trust">
              <div className="trust-i">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>17 variáveis clínicas</span>
              </div>
              <div className="trust-i">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Resultado imediato</span>
              </div>
              <div className="trust-i">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Médico ganha 10 USDC por paciente</span>
              </div>
            </div>
          </div>

          <div className="hero-visual reveal" style={{ transitionDelay:'0.15s' }}>
            <div className="fairy-showcase">
              <img src={logo} alt="RedFairy — A Fada Vermelha" />
            </div>
            <div className="fairy-quote">
              <p>O Ferro em você veio das estrelas, é dele o vermelho do seu sangue — a sua potência.</p>
              <p className="question">Cuide da sua Hemoglobina, ela é a sua vida.</p>
            </div>
            <a href="#oba" className="oba-home-btn">
              <span className="oba-title">Projeto OBA</span>
              <span className="oba-sub">Otimizar o Bariátrico</span>
              <span className="oba-link">Saiba mais →</span>
            </a>
          </div>
        </div>
      </section>

      {/* FILOSOFIA: hover mostra redfairy3 */}
      <section className={`filosofia${showFilImg ? ' reveal-img' : ''}`} id="filosofia" onMouseEnter={showFil} onTouchStart={showFil}>
        <img src={fairy3} alt="" aria-hidden="true" style={{
          position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
          opacity: showFilImg ? 0.12 : 0,
          transition: showFilImg ? 'opacity 0.05s ease' : 'opacity 1.8s ease',
          pointerEvents:'none',
        }} />
        <div className="container">
          <div className="reveal">
            <span className="tag">Filosofia</span>
            <h2 className="stitle">Vida é ventilação e perfusão</h2>
          </div>
          <div className="filosofia-grid">
            <div className="filosofia-text reveal">
              <p>O Ferro em você veio das estrelas, e dele o vermelho do seu sangue — a sua potência. Com Ferro, a Natureza faz a Hemoglobina, a proteína vermelha e mais importante da sua vida.</p>
              <p>Ela sustenta a ventilação e realiza a perfusão: capta o oxigênio do ar que ventila os pulmões e o entrega a todas as suas células — vinte vezes por minuto.</p>
              <p>Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento em suas células, e o leva aos seus pulmões para que você o expire no ar do mundo.</p>
              <p>No ambiente, uma proteína verde — a clorofila, mãe da Hemoglobina — usa a luz do sol para fazer açúcar, devolvendo o oxigênio ao ar do planeta, em um ciclo virtuoso perfeito.</p>
              <div className="highlight-box"><p>Cuide da sua Hemoglobina. Nós ajudamos.</p></div>
            </div>
            <div className="filosofia-visual reveal" style={{ transitionDelay:'0.1s' }}>
              <div className="cycle-card">
                <h4>O ciclo da vida</h4>
                <div className="cycle-step"><div className="icon">⭐</div><div className="desc">Ferro — é poeira das estrelas, dá poder ao seu sangue.</div></div>
                <div className="cycle-step">
                  <div className="icon"><img src={logo} className="fairy-mini" alt="Fadinha" /></div>
                  <div className="desc">Hemoglobina — A fada vermelha, que com o ferro faz você respirar.</div>
                </div>
                <div className="cycle-step"><div className="icon">🫁</div><div className="desc">Ventilação — Ela capta o oxigênio do ar, 20x por minuto.</div></div>
                <div className="cycle-step"><div className="icon" style={{ color:'#DC2626' }}>❤️</div><div className="desc">Perfusão — Ela entrega oxigênio a cada célula do corpo e capta o gás carbônico.</div></div>
                <div className="cycle-step"><div className="icon">🌿</div><div className="desc">Clorofila — No meio ambiente, a mãe verde recicla o gás carbônico em oxigênio.</div></div>
                <div className="cycle-step"><div className="icon">♻️</div><div className="desc">Ciclo perfeito — O vermelho e o verde sustentam a vida no planeta azul.</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INDICAÇÕES */}
      <section id="indicacoes">
        <div className="container">
          <div className="reveal">
            <span className="tag">Indicações</span>
            <h2 className="stitle">Para quem é o RedFairy?</h2>
            <p className="sdesc">Avaliação e acompanhamento de condições clínicas relacionadas ao eritron e metabolismo do ferro.</p>
          </div>
          <div className="indicacoes-grid reveal">
            {['Anemias','Sangramentos Crônicos','Bariátricos','Vegetarianos','Gestantes','Celíacos','Deficiência de Ferro','Doadores de Sangue','Ferritina Alta','Uso de Testosterona','Endometriose | Mioma','Menstruação Excessiva','Hemoglobina Alta','Alcoolistas','Regime de Sangrias'].map(i => (
              <div key={i} className="ind">{i}</div>
            ))}
          </div>
        </div>
      </section>

      {/* TERAPÊUTICA */}
      <section className="terapeutica">
        <div className="container">
          <div className="reveal">
            <span className="tag">Orientações Terapêuticas</span>
            <h2 className="stitle">Muito além do diagnóstico</h2>
            <p className="sdesc">O RedFairy é um algoritmo médico, que não apenas avalia: ele orienta. Gera recomendações personalizadas com base no perfil completo do paciente.</p>
          </div>
          <div className="terap-grid reveal">
            <div className="terap-card"><div className="tc-icon">💉</div><h4>Cálculo de dose para infusão de ferro</h4><p>Dose ideal de ferro endovenoso baseada no déficit estimado e peso do paciente.</p></div>
            <div className="terap-card"><div className="tc-icon">🩸</div><h4>Sangrias terapêuticas</h4><p>Número de sessões, volume e intervalo entre sangrias para siderose e poliglobulia.</p></div>
            <div className="terap-card"><div className="tc-icon">💊</div><h4>Reposição de ferro oral</h4><p>Dose, tipo de sal de ferro, horário e duração do tratamento via oral.</p></div>
            <div className="terap-card"><div className="tc-icon">📈</div><h4>Gráfico multiparamétrico</h4><p>Acompanhamento evolutivo do eritron ao longo do tempo para cada paciente.</p></div>
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
              <button className={`como-tab${activeTab==='medico'?' active':''}`} onClick={() => setActiveTab('medico')}>Para Médicos</button>
              <button className={`como-tab${activeTab==='paciente'?' active':''}`} onClick={() => setActiveTab('paciente')}>Para Pacientes</button>
            </div>
          </div>

          {activeTab === 'medico' && (
            <div>
              <div className="flow reveal">
                <div className="flow-step"><div className="flow-num">1</div><h4>Acesse o Modo Médico</h4><p>Gratuito, sem cadastro. Use o seu CRM para acesso imediato à calculadora clínica.</p></div>
                <div className="flow-step"><div className="flow-num">2</div><h4>Insira o CPF do paciente</h4><p>Única informação de identificação. Vincula os dados ao paciente automaticamente.</p></div>
                <div className="flow-step"><div className="flow-num">3</div><h4>Preencha os parâmetros</h4><p>Apenas cinco parâmetros laboratoriais e algumas caixinhas com dados clínicos.</p></div>
                <div className="flow-step"><div className="flow-num">4</div><h4>Avalie e oriente</h4><p>Diagnóstico, orientações terapêuticas e dosagens em segundos.</p></div>
              </div>
              <div className="reward-banner reveal">
                <div className="reward-text">
                  <h4>Ganhe por cada paciente que se cadastrar</h4>
                  <p>Quando o paciente que você avaliou se cadastra, você recebe <strong>DEZ DÓLARES DIGITAIS</strong> na sua wallet.</p>
                  <div className="reward-klipbit"><span>⚡ KlipBit Wallet</span></div>
                </div>
                <div className="reward-amount">10 USDC</div>
              </div>
            </div>
          )}

          {activeTab === 'paciente' && (
            <div>
              <div className="flow reveal">
                <div className="flow-step"><div className="flow-num">1</div><h4>Informe seu CPF</h4><p>Se seu médico já fez a primeira avaliação, seus dados já estarão aqui.</p></div>
                <div className="flow-step"><div className="flow-num">2</div><h4>Complete o cadastro</h4><p>Cadastro simples com e-mail, senha e celular. Rápido e seguro.</p></div>
                <div className="flow-step"><div className="flow-num">3</div><h4>Assine via PIX</h4><p>R$ 149,90/ano via QR Code, Chave PIX ou Copie e Cole.</p></div>
                <div className="flow-step"><div className="flow-num">4</div><h4>Acompanhe seu eritron</h4><p>Novas avaliações geram o gráfico multiparamétrico da sua saúde eritrocitária.</p></div>
              </div>
              <div className="patient-features reveal">
                <div className="pf-card"><div className="pf-icon">📊</div><h4>Gráfico evolutivo</h4><p>Acompanhe a evolução dos parâmetros ao longo do tempo.</p></div>
                <div className="pf-card"><div className="pf-icon">💡</div><h4>Orientações claras</h4><p>Resultados em linguagem acessível, com recomendações práticas.</p></div>
                <div className="pf-card"><div className="pf-icon">🩺</div><h4>Conectado ao seu médico</h4><p>A avaliação do médico já está no seu perfil quando você se cadastrar.</p></div>
              </div>
              <div className="pricing-box reveal">
                <div className="price">R$ 149,90</div>
                <div className="price-sub" style={{ fontWeight:700, color:'var(--wine)' }}>por ano — acesso completo à plataforma</div>
                <div className="pix-methods">
                  <div className="pix-tag">📱 QR Code PIX</div>
                  <div className="pix-tag">🔑 Chave PIX</div>
                  <div className="pix-tag">📋 Copie e Cole</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* EXPERIMENTE AGORA */}
      <section id="avaliar" style={{ background:'var(--dark-bg)', padding:'5.5rem 2rem' }}>
        <div className="container">
          <div className="center reveal" style={{ marginBottom:'2.5rem' }}>
            <span className="tag" style={{ color:'var(--cherry-light)' }}>Experimente Agora</span>
            <h2 className="stitle" style={{ color:'white' }}>Faça uma avaliação gratuita</h2>
            <p className="sdesc" style={{ color:'rgba(255,255,255,0.55)', margin:'0 auto' }}>Insira os dados laboratoriais e obtenha o diagnóstico. Sem cadastro.</p>
          </div>
          <div style={{ maxWidth:720, margin:'0 auto' }}>
            <div style={{ background:'var(--dark-card)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'2rem', marginBottom:'1.5rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
                <div><label style={labelStyle}>Sexo</label>
                  <select value={rfSexo} onChange={e => setRfSexo(e.target.value)} style={inputStyle}>
                    <option value="F">Feminino</option><option value="M">Masculino</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Idade</label>
                  <input type="number" min="12" max="100" placeholder="Ex: 35" value={rfForm.idade} onChange={e => handleFormChange('idade', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
                <div><label style={labelStyle}>Hemoglobina (g/dL)</label>
                  <input type="number" step="0.1" placeholder="Ex: 12.5" value={rfForm.hb} onChange={e => handleFormChange('hb', e.target.value)} style={inputStyle} />
                </div>
                <div><label style={labelStyle}>Ferritina (ng/mL)</label>
                  <input type="number" step="0.1" placeholder="Ex: 15" value={rfForm.ferritina} onChange={e => handleFormChange('ferritina', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>
                <div><label style={labelStyle}>VCM (fL)</label>
                  <input type="number" step="0.1" placeholder="Ex: 82" value={rfForm.vcm} onChange={e => handleFormChange('vcm', e.target.value)} style={inputStyle} />
                </div>
                <div><label style={labelStyle}>RDW (%)</label>
                  <input type="number" step="0.1" placeholder="Ex: 13.5" value={rfForm.rdw} onChange={e => handleFormChange('rdw', e.target.value)} style={inputStyle} />
                </div>
                <div><label style={labelStyle}>Sat. Transf. (%)</label>
                  <input type="number" step="0.1" placeholder="Ex: 25" value={rfForm.sat} onChange={e => handleFormChange('sat', e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom:'1rem' }}>
                <label style={labelStyle}>Contexto clínico</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:'0.5rem' }}>
                  {[['bariatrica','Bariátrica'],['vegetariano','Vegetariano/Vegano'],['perda','Hemorragia'],['alcoolista','Alcoolista'],['transfundido','Transfundido'],
                    ...(rfSexo==='F' ? [['hiper','Hipermenorreia'],['gestante','Gestante']] : [])
                  ].map(([field, lbl]) => (
                    <label key={field} style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.6rem 0.8rem',
                      background: rfForm[field] ? 'rgba(220,38,38,0.1)' : '#1F2937',
                      border: `1px solid ${rfForm[field] ? 'var(--cherry)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius:8, cursor:'pointer', fontSize:'0.83rem',
                      color: rfForm[field] ? 'white' : 'rgba(255,255,255,0.7)', transition:'all 0.2s' }}>
                      <input type="checkbox" checked={!!rfForm[field]} onChange={e => handleFormChange(field, e.target.checked)} style={{ width:14, height:14 }} />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:'1.5rem' }}>
                <label style={labelStyle}>Medicamentos / Suplementos</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:'0.5rem' }}>
                  {[['aspirina','Aspirina','Uso contínuo'],['b12','Vitamina B12','Últimos 3 meses'],['ferroMed','Ferro Oral/EV','Últimos 2 anos']].map(([field, lbl, sub]) => (
                    <label key={field} style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.6rem 0.8rem',
                      background: rfForm[field] ? 'rgba(220,38,38,0.1)' : '#1F2937',
                      border: `1px solid ${rfForm[field] ? 'var(--cherry)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius:8, cursor:'pointer', fontSize:'0.83rem',
                      color: rfForm[field] ? 'white' : 'rgba(255,255,255,0.7)', transition:'all 0.2s' }}>
                      <input type="checkbox" checked={!!rfForm[field]} onChange={e => handleFormChange(field, e.target.checked)} style={{ width:14, height:14 }} />
                      <span>{lbl}<br /><small style={{ opacity:0.5, fontSize:'0.72rem' }}>{sub}</small></span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={rfAvaliar} style={{ width:'100%', background:'var(--wine)', color:'white', border:'none', borderRadius:10, padding:'1rem', fontSize:'1rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                🔬 Avaliar Eritron
              </button>
              {rfErro && <p style={{ color:'#F87171', fontSize:'0.85rem', marginTop:'0.75rem', textAlign:'center' }}>{rfErro}</p>}
            </div>

            {rfResultado && (() => {
              const c = colorMap[rfResultado.color] || colorMap.yellow
              return (
                <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:16, overflow:'hidden' }}>
                  <div style={{ background:c.badge, padding:'1rem 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <p style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:2, color:'rgba(255,255,255,0.7)', marginBottom:'0.2rem' }}>Diagnóstico</p>
                      <h3 style={{ color:'white', fontSize:'1.1rem', fontWeight:800, margin:0 }}>{rfResultado.label}</h3>
                    </div>
                    <span style={{ fontSize:'0.75rem', background:'rgba(255,255,255,0.2)', color:'white', padding:'0.3rem 0.7rem', borderRadius:6, fontWeight:700 }}>ID {rfResultado.id}</span>
                  </div>
                  <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
                    <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:10, padding:'1rem' }}>
                      <p style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px', color:c.text, marginBottom:'0.5rem', fontWeight:700 }}>🧝 Diagnóstico</p>
                      <p style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.88rem', lineHeight:1.7, margin:0 }}>{rfResultado.diag}</p>
                    </div>
                    <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:10, padding:'1rem' }}>
                      <p style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px', color:c.text, marginBottom:'0.5rem', fontWeight:700 }}>📋 Recomendação</p>
                      <p style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.88rem', lineHeight:1.7, margin:0 }}>{rfResultado.rec}</p>
                    </div>
                    <div style={{ background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:10, padding:'1rem', textAlign:'center' }}>
                      <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.8rem', marginBottom:'0.75rem' }}>Para orientações terapêuticas completas com dosagens e acompanhamento:</p>
                      <button onClick={onModoMedico} style={{ background:'var(--wine)', color:'white', border:'none', padding:'0.75rem 1.8rem', borderRadius:8, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:'inherit' }}>
                        Acessar RedFairy completo →
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
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
              <div className="oba-metaphor">
                <p>A cirurgia bariátrica corta as asas da sua fada vermelha.<br />Ela continua com seus superpoderes, mas para voar precisa da ajuda do RedFairy.</p>
              </div>
              <p>O bypass gástrico e a gastrectomia causam uma <strong>síndrome disabsortiva</strong> que prejudica a absorção de ferro, vitamina B12 e outros elementos essenciais.</p>
              <p>O Projeto OBA oferece um <strong>tratamento de manutenção indefinido</strong>: monitoramento contínuo, cálculo de reposição personalizado e orientações específicas.</p>
              <div className="oba-cta-row">
                <button className="btn btn-oba-main" onClick={onModoPaciente}>Sou Bariátrico — Começar</button>
                <a href="#como-funciona" className="btn btn-secondary">Como funciona</a>
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
            <h2 className="stitle">Cuide da sua Hemoglobina, ela é a sua vida.</h2>
          </div>
          <div className="cta-cards reveal">
            <div className="cta-c cta-doc">
              <div className="ci">🩺</div>
              <h3>Modo Médico</h3>
              <p>Avaliação rápida sem cadastro. Insira o CPF e os dados do paciente e obtenha diagnóstico com orientações terapêuticas.</p>
              <ul>
                <li>Acesso 100% gratuito</li>
                <li>Sem cadastro necessário</li>
                <li>Orientações terapêuticas com dosagens</li>
                <li>Ganhe 10 USDC por paciente cadastrado</li>
              </ul>
              <button className="btn-cta btn-cta-doc" onClick={onModoMedico}>Acessar como Médico</button>
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
              <button className="btn-cta btn-cta-pat" onClick={onModoPaciente}>Acessar como Paciente</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="foot-brand">
          <img src={logo} alt="RedFairy" style={{ height:28 }} />
          <span>Red<em>Fairy</em></span>
        </div>
        <p className="foot-tag">Cuidar do Seu Eritron</p>
        <p className="credits">
          by <a href="https://cytomica.com">cytomica.com</a> | © 2026<br />
          E.F. Ramos, M.D. CRM 6302 BA | RQE 5830 · 5643 · 27847<br />
          <a href="https://drestacioramos.com.br">drestacioramos.com.br</a>
        </p>
      </footer>

    </div>
  )
}
