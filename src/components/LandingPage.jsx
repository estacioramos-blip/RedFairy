import { useState, useEffect, useRef } from 'react'
import logo from '../assets/logo.png'
import redcell1 from '../assets/redcell1.png'
import filosofiaBg from '../../redfairy-filosofia-bg.png'
import fairy3 from '../../redfairy3.png'
import OBAModal from './OBAModal'
import TermosModal from './TermosModal'
import { supabase } from '../lib/supabase'

const LANDING_CSS = `
  .rf-cx-input::placeholder { color:#9ca3af; opacity:1; font-weight:600; letter-spacing:0.5px; }

  .rf-fadewrap { transition: opacity 0.25s ease; }
  .rf-fadewrap.out { opacity: 0; }
  .rf-fadewrap.in { opacity: 1; }

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
  #landing-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 0.75rem 2rem; align-items: center; transition: all 0.3s; box-sizing: border-box; }
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
  .whatsapp-btn { position: fixed; bottom: 3.5rem; right: 1.5rem; z-index: 999; width: 38px; height: 38px; border-radius: 50%; background: #25D366; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(37,211,102,0.4); transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; }
  .whatsapp-btn:hover { transform: translateY(-3px) scale(1.05); box-shadow: 0 8px 25px rgba(37,211,102,0.5); }
  .whatsapp-btn svg { width: 20px; height: 20px; fill: white; }

  /* HERO */
  .hero { min-height: auto; display: flex; align-items: center; justify-content: center; padding: 4rem 2rem 1rem; background: var(--white); position: relative; overflow: hidden; }
  .hero-wrap { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; z-index: 2; }
  .hero-badge { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; background: #374151; color: var(--white); padding: 0.7rem 2.5rem; border-radius: 10px; font-size: 0.92rem; font-weight: 700; margin-bottom: 1.2rem; letter-spacing: 0.3px; text-align: center; width: 100%; max-width: 480px; box-sizing: border-box; }
  .hero-badge .dot { width: 12px; height: 12px; border-radius: 50%; background: #22C55E; animation: pDot 2s ease-in-out infinite; flex-shrink: 0; }
  .hero-badge .badge-main { display: flex; align-items: center; gap: 0.5rem; }
  .hero-badge .badge-sub { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.55); padding-left: 1.3rem; cursor: pointer; text-align: center; width: 100%; }
  .hero-badge .badge-sub:hover { color: rgba(255,255,255,0.85); }

  /* MOBILE \u2014 margens uniformes */
  @media (max-width: 768px) {
    html, body { overflow-x: hidden; max-width: 100vw; }
    * { box-sizing: border-box; }
    section { padding: 2.5rem 0.6rem; }
    .container { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }

    #landing-nav { display: flex !important; justify-content: space-between !important; }
    .nav-links { display: flex !important; flex-direction: column; align-items: stretch; justify-content: flex-start; gap: 0.6rem; position: fixed; top: 0; right: 0; bottom: 0; width: 78%; max-width: 280px; background: rgba(255,255,255,0.92); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); padding: 4.5rem 1.4rem 1.5rem; border-left: 1px solid var(--border); box-shadow: -8px 0 30px rgba(0,0,0,0.12); z-index: 200; transform: translateX(100%); transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
    .nav-links.open { transform: translateX(0); }
    .nav-links a { font-size: 0.85rem; padding: 0.5rem 0.2rem; }
    .nav-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.18); z-index: 199; opacity: 0; pointer-events: none; transition: opacity 0.28s ease; }
    .nav-overlay.open { opacity: 1; pointer-events: auto; }
    .hamburger { display: flex; }

    .hero { padding: 5rem 0 3rem; }
    .hero-wrap { grid-template-columns: 1fr !important; gap: 2rem; text-align: center; max-width: 100% !important; padding: 0 0.6rem; width: 100% !important; box-sizing: border-box !important; }
    .hero-wrap > * { max-width: 100% !important; width: 100% !important; min-width: 0 !important; box-sizing: border-box !important; }
    .hero h1 { font-size: 2.6rem; white-space: normal !important; }
    .hero-desc { margin: 0 auto 1.5rem; }
    .hero-actions { justify-content: center; }
    .trust { justify-content: center; flex-wrap: wrap; gap: 1rem; }
    .hero-visual { display: none; }
    .hero-textbox { padding: 1.2rem; margin-left: 0; margin-right: 0; max-width: 100% !important; width: 100% !important; box-sizing: border-box !important; overflow: hidden !important; }
    .hero-textbox h1 { font-size: 1.5rem !important; white-space: normal !important; word-break: break-word !important; overflow-wrap: anywhere !important; }
    .hero-philosophy { font-size: 0.95rem !important; white-space: normal !important; word-break: break-word !important; }
    .hero-quote-box { text-align: center; }

    .filosofia-grid { grid-template-columns: 1fr !important; gap: 1.5rem; }
    .fil-img-box { width: 100%; }
    .fil-img-box h2 { white-space: normal !important; font-size: 1.5rem !important; }
    .fil-content p { text-align: justify; font-size: 0.9rem !important; }
    .cycle-card { width: 100%; }

    .stitle { font-size: 1.6rem; }

    .indicacoes-grid { grid-template-columns: repeat(2, 1fr) !important; }

    .como-tab { padding: 0.7rem 1.2rem; font-size: 0.85rem; }
    .flow { grid-template-columns: 1fr 1fr !important; gap: 0.8rem; }
    .flow-step { padding: 1rem 0.6rem; }
    .patient-features { grid-template-columns: 1fr !important; }
    .reward-banner { flex-direction: column; text-align: center; }

    .oba-grid { grid-template-columns: 1fr !important; }

    .cta-cards { grid-template-columns: 1fr !important; }
  }
  @keyframes pDot { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(1.5);} }
  @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(220,38,38,0.8), 0 0 0 0 rgba(220,38,38,0.4);}70%{box-shadow:0 0 0 12px rgba(220,38,38,0), 0 0 0 24px rgba(220,38,38,0);}100%{box-shadow:0 0 0 0 rgba(220,38,38,0), 0 0 0 0 rgba(220,38,38,0);} }
  @keyframes pulseGray { 0%{box-shadow:0 0 0 0 rgba(31,41,55,0.8), 0 0 0 0 rgba(31,41,55,0.4);}70%{box-shadow:0 0 0 12px rgba(31,41,55,0), 0 0 0 24px rgba(31,41,55,0);}100%{box-shadow:0 0 0 0 rgba(31,41,55,0), 0 0 0 0 rgba(31,41,55,0);} }
  @keyframes heartbeat { 0%{transform:scale(1);}14%{transform:scale(1.10);}28%{transform:scale(1);}42%{transform:scale(1.10);}70%{transform:scale(1);} }
  @keyframes fadeInHint { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeOutHint { from { opacity: 1; } to { opacity: 0; } }
  @keyframes pulseSoftRed { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45); } 50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }
  @keyframes pulseSoftLight { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.55); } 50% { box-shadow: 0 0 0 8px rgba(255,255,255,0); } }
  .hero-badge-sub { font-size: 0.78rem; color: var(--text-sec); margin-top: -0.4rem; margin-bottom: 0.8rem; font-weight: 700; }

  .hero-textbox {
    background: var(--white); border: 1px solid var(--border); border-radius: 16px;
    padding: 2rem 2.5rem; box-shadow: var(--shadow);
    position: relative; overflow: hidden; cursor: pointer; margin: 0 auto 0.8rem;
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

  .hero-visual { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .fairy-showcase { width: 208px; height: 208px; }
  .fairy-showcase img { width: 100%; height: 100%; object-fit: contain; animation: floatFairy 4s ease-in-out infinite; }
  @keyframes floatFairy { 0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);} }

  .fairy-quote { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 1.8rem 2rem; box-shadow: var(--shadow); text-align: center; max-width: 380px; width: 100%; }
  .fairy-quote p { font-size: 1.45rem; color: var(--text); line-height: 1.5; font-weight: 800; font-family: 'DM Sans', sans-serif; }
  .fairy-quote .question { color: var(--wine); font-weight: 700; margin-top: 1rem; font-size: 1.2rem; font-family: 'DM Sans', sans-serif; font-style: normal; }

  .oba-home-btn { display: flex; flex-direction: column; align-items: center; text-decoration: none; background: linear-gradient(135deg, var(--oba-orange), var(--oba-blue)); border-radius: 16px; padding: 1.2rem 2rem; transition: all 0.3s; box-shadow: 0 4px 20px rgba(232,114,12,0.2); width: 100%; max-width: 380px; }
  .oba-home-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(232,114,12,0.3); }
  .oba-home-btn .oba-title { font-size: 1.1rem; font-weight: 800; color: var(--white); letter-spacing: 1px; }
  .oba-home-btn .oba-sub { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.9); margin-top: 0.15rem; font-weight: 700; }
  .oba-home-btn .oba-link { font-size: 0.78rem; color: rgba(255,255,255,0.85); margin-top: 0.5rem; text-decoration: underline; }

  .container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
  section { padding: 3rem 2rem; scroll-margin-top: 80px; }
  .center { text-align: center; }
  .tag { display: inline-block; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: var(--cherry); margin-bottom: 0.6rem; }
  .stitle { font-size: 2.3rem; color: var(--text); margin-bottom: 0.7rem; font-weight: 800; }
  .sdesc { font-size: 1.02rem; color: var(--text-sec); max-width: 580px; line-height: 1.7; font-weight: 600; }
  .sdesc-bold { font-size: 1rem; font-weight: 700; color: var(--text); max-width: 580px; line-height: 1.75; }

  .filosofia { background: var(--gray-bg); color: var(--text); position: relative; margin-top: 5rem; padding-top: 1.5rem; padding-bottom: 1.5rem; }
  .filosofia .tag { color: var(--cherry); margin-bottom: 0.3rem; }
  .filosofia-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; margin-top: 1.5rem; }
  .fil-img-box .fil-content p { font-size: 0.95rem; color: var(--text-sec); line-height: 1.85; margin-bottom: 1rem; font-weight: 600; }
  .fil-img-box .fil-content .highlight-box p { color: var(--white); font-size: 1rem; margin: 0; font-weight: 600; }
  .highlight-box { background: var(--wine); border: 2px solid var(--wine-dark); border-radius: 12px; padding: 1.2rem 1.5rem; margin-top: 1.5rem; }
  .highlight-box p { color: var(--white); font-weight: 600; font-size: 1rem; margin: 0; text-align: center; }
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

  .indicacoes-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.6rem; margin-top: 2rem; align-items: start; }
  .ind { background: white; border: 1px solid var(--border2); border-radius: 8px; padding: 0.6rem 1rem; font-size: 0.85rem; color: var(--text-sec); font-weight: 500; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; }
  .ind.auto-dot::before { content: ''; width: 8px; height: 8px; min-width: 8px; border-radius: 50%; background: var(--cherry); display: block; flex-shrink: 0; margin-top: 3px; }
  .ind:hover { border-color: var(--border2); }

  .terapeutica { background: var(--white); }
  .terap-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
  .terap-card { background: var(--white); border: 2px solid #7f1d1d; border-radius: var(--radius); padding: 1rem 1.2rem 0.6rem; transition: all 0.2s; }
  .terap-card:hover { box-shadow: var(--shadow); }
  .terap-card .tc-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 0.6rem; background: var(--cherry-bg); }
  .terap-card h4 { font-size: 0.95rem; margin-bottom: 0.2rem; }
  .terap-card p { font-size: 0.83rem; color: var(--text-sec); margin-bottom: 0; }

  .como { background: var(--gray-bg); }
  .como-tabs-wrap { display: flex; justify-content: center; margin-top: 2rem; margin-bottom: 2.5rem; }
  .como-tabs { display: inline-flex; gap: 0.5rem; }
  .como-tab { padding: 0.85rem 0; border-radius: 10px; font-size: 0.95rem; font-weight: 600; border: none; cursor: pointer; background: #9CA3AF; color: white; transition: all 0.25s; font-family: inherit; width: 200px; text-align: center; }
  .como-tab:hover { background: #374151; }
  .como-tab.active { background: var(--wine); color: white; box-shadow: 0 4px 14px rgba(123,30,30,0.25); }
  .como-tab.active:hover { background: var(--cherry); }
  .como-tab.paciente.active { background: #1F2937; box-shadow: 0 4px 14px rgba(31,41,55,0.25); }
  .como-tab.paciente.active:hover { background: #4B5563; }
  .como-content { min-height: 300px; }
  .flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
  .flow-step { text-align: center; background: white; border: 1px solid var(--border2); border-radius: 14px; padding: 1.5rem 1rem; }
  .flow-num { width: 44px; height: 44px; border-radius: 50%; background: var(--wine); color: white; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.8rem; transition: background 0.2s ease; }
  .flow-step.medico .flow-num { background: #7B1E1E; color: white; }
  .flow-step.medico:hover .flow-num { background: #EF4444; }
  .flow-step.paciente .flow-num { background: #1F2937; color: white; }
  .flow-step.paciente:hover .flow-num { background: #9CA3AF; }
  .flow-step h4 { font-size: 0.92rem; margin-bottom: 0.4rem; font-weight: 700; }
  .flow-step p { font-size: 0.82rem; color: var(--text-sec); line-height: 1.6; }
  .reward-banner { background: #22863A; border-radius: 14px; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; }
  .reward-text h4 { color: white; font-size: 1rem; margin-bottom: 0.3rem; font-weight: 700; }
  .reward-text p { color: rgba(255,255,255,0.9); font-size: 0.85rem; line-height: 1.6; }
  .reward-text strong { color: white; }
  .reward-right { display: flex; align-items: center; gap: 0.5rem; }
  .reward-amount { font-size: 2rem; font-weight: 800; color: white; white-space: nowrap; }
  .klipbit-k { width: 36px; height: 36px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 900; color: var(--wine); font-family: serif; }
  .patient-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .pf-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid var(--border2); }
  .pf-icon { width: 36px; height: 36px; margin-bottom: 0.8rem; color: var(--wine); }
  .pf-card h4 { font-size: 0.9rem; margin-bottom: 0.3rem; font-weight: 700; }
  .pf-card p { font-size: 0.82rem; color: var(--text-sec); line-height: 1.6; }
  .pricing-box { background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 14px; padding: 2.5rem 2rem; text-align: center; margin-top: 1.5rem; }
  .price { font-size: 3.5rem; font-weight: 800; color: var(--wine); }
  .price-sub { font-size: 0.95rem; color: var(--wine); margin-bottom: 1.2rem; font-weight: 400; }
  .pix-methods { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 1rem; }
  .pix-tag { background: white; border: 1px solid #FECDD3; border-radius: 8px; padding: 0.4rem 0.9rem; font-size: 0.82rem; color: var(--wine); font-weight: 500; display: flex; align-items: center; gap: 0.4rem; }

  .oba { background: linear-gradient(170deg, var(--oba-blue-dark) 0%, #334155 60%, #1E293B 100%); color: var(--white); position: relative; overflow: hidden; }
  .oba::before { content: ''; position: absolute; top: -30%; right: -15%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(232,114,12,0.12), transparent 70%); border-radius: 50%; }
  .oba .container { position: relative; z-index: 2; }
  .oba .tag { color: var(--oba-orange-light); }
  .oba .stitle { color: var(--white); }
  .oba-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; align-items: start; margin-top: 2.5rem; }
  .oba-narrative p { color: rgba(255,255,255,0.7); font-size: 0.93rem; line-height: 1.8; margin-bottom: 1rem; }
  .oba-narrative strong { color: var(--oba-orange-light); }
  .oba-metaphor { background: linear-gradient(135deg, var(--oba-orange), var(--oba-blue)); border-radius: 12px; padding: 1.3rem 1.5rem; margin: 0 0 1.5rem; }
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
  .cta-doc li::before { content: '\u2713'; color: var(--cherry); font-weight: 700; }
  .cta-pat li { font-size: 0.84rem; color: rgba(255,255,255,0.9); padding: 0.3rem 0; display: flex; align-items: center; gap: 0.4rem; }
  .cta-pat li::before { content: '\u2713'; color: rgba(255,255,255,0.6); font-weight: 700; }
  .btn-cta-doc { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.85rem 2rem; border-radius: 10px; font-size: 0.95rem; font-weight: 600; border: none; cursor: pointer; font-family: inherit; transition: all 0.25s; background: var(--wine); color: var(--white); height: 60px; }
  .btn-cta-doc:hover { background: var(--cherry); transform: translateY(-2px); }
  .btn-cta-pat { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.85rem 2rem; border-radius: 10px; font-size: 0.95rem; font-weight: 600; border: 1.5px solid #9CA3AF; cursor: pointer; font-family: inherit; transition: all 0.25s; background: #9CA3AF; color: var(--white); height: 60px; }
  .btn-cta-pat:hover { background: #374151; border-color: #374151; transform: translateY(-2px); }

  footer { text-align: center; }
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
  { id:3,  label:"SAUD\u00c1VEL", color:'green',
    conditions:{ ferritina:{min:25,max:150}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:75,max:100}, rdw:{min:11.5,max:15.5}, satTransf:{min:20,max:50}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:"Produ\u00e7\u00e3o normal de hemoglobina e c\u00e9lulas vermelhas, com boa reserva de ferro. Sem indica\u00e7\u00e3o de anemia ou siderose.",
    rec:"Avalia\u00e7\u00e3o m\u00e9dica preventiva semestral. Se a ferritina for \u2265 100 ng/mL, voc\u00ea pode ser candidato a doa\u00e7\u00f5es de sangue." },
  { id:10, label:'SIDEROPENIA INCIPIENTE SEM ANEMIA', color:'yellow',
    conditions:{ ferritina:{min:0,max:24}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:75,max:100}, rdw:{min:15.1,max:999}, satTransf:{min:0,max:50}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:"Hemoglobina normal, mas com sinais de deple\u00e7\u00e3o incipiente de ferro \u2014 anisocitose e hipoferritinemia.",
    rec:"Procure orienta\u00e7\u00e3o de hematologista. Investigue a causa da sideropenia. N\u00e3o doe sangue enquanto n\u00e3o esclarecer." },
  { id:11, label:'ANEMIA FERROPRIVA MODERADA', color:'orange',
    conditions:{ ferritina:{min:0,max:24}, hemoglobina:{min:10.0,max:11.9}, vcm:{min:0,max:79}, rdw:{min:15.1,max:999}, satTransf:{min:0,max:50}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:"Defici\u00eancia de ferro com impacto sobre a produ\u00e7\u00e3o de hemoglobina e hem\u00e1cias, produzindo anemia moderada.",
    rec:"Avalia\u00e7\u00e3o com hematologista assim que poss\u00edvel. Reposi\u00e7\u00e3o de ferro oral ou intravenosa conforme avalia\u00e7\u00e3o m\u00e9dica." },
  { id:12, label:'ANEMIA FERROPRIVA IMPORTANTE', color:'red',
    conditions:{ ferritina:{min:0,max:24}, hemoglobina:{min:7.0,max:9.9}, vcm:{min:0,max:79}, rdw:{min:15.1,max:999}, satTransf:{min:0,max:19}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:"Anemia ferropriva importante. Exige interven\u00e7\u00e3o m\u00e9dica imediata.",
    rec:"Avalia\u00e7\u00e3o urgente com hematologista. Pode ser necess\u00e1ria hospitaliza\u00e7\u00e3o. Ferro endovenoso indicado." },
  { id:5,  label:"PROCESSO INFLAMAT\u00d3RIO OU DOEN\u00c7A CR\u00d4NICA", color:'yellow',
    conditions:{ ferritina:{min:151,max:400}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:80,max:100}, rdw:{min:11.5,max:16}, satTransf:{min:20,max:50}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:"Ferritina elevada com satura\u00e7\u00e3o normal. Processos inflamat\u00f3rios, neoplasias ou doen\u00e7as degenerativas.",
    rec:"Procure orienta\u00e7\u00e3o de hematologista. N\u00e3o doe sangue enquanto n\u00e3o esclarecer a origem da ferritina elevada." },
  { id:7,  label:'EXCESSO DE FERRO / SIDEROSE', color:'orange',
    conditions:{ ferritina:{min:401,max:900}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:80,max:100}, rdw:{min:11.5,max:15}, satTransf:{min:51,max:999}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:"Ferritina e satura\u00e7\u00e3o da transferrina elevadas, traduzindo siderose significativa.",
    rec:"Procure orienta\u00e7\u00e3o de hematologista. Sangrias terap\u00eauticas podem ser indicadas." },
  { id:8,  label:"COMPAT\u00cdVEL COM HEMOCROMATOSE", color:'red',
    conditions:{ ferritina:{min:801,max:9999}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:80,max:100}, rdw:{min:11.5,max:15}, satTransf:{min:51,max:999}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:"Siderose maior \u2014 ferritina e satura\u00e7\u00e3o muito elevadas. Poss\u00edvel hemocromatose heredit\u00e1ria (gene HFE).",
    rec:"Avalia\u00e7\u00e3o urgente com hematologista. Sangrias terap\u00eauticas dever\u00e3o ser indicadas." },
  { id:80, label:"ERITROCITOSE \u2014 HEMOGLOBINA ACIMA DO NORMAL", color:'red',
    conditions:{ ferritina:{min:24,max:9999}, hemoglobina:{min:15.6,max:999}, vcm:{min:0,max:9999}, rdw:{min:0,max:999}, satTransf:{min:0,max:999}, bariatrica:false, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:"Hemoglobina acima do normal. Pode corresponder a uso de testosterona, eritropoetina, ou doen\u00e7as hematol\u00f3gicas.",
    rec:"Repita o hemograma. Se confirmada, avalie com hematologista assim que poss\u00edvel." },
  { id:14, label:'VEGETARIANO/A COMPENSADO/A', color:'green',
    conditions:{ ferritina:{min:25,max:150}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:75,max:100}, rdw:{min:11.5,max:16}, satTransf:{min:0,max:50}, bariatrica:false, vegetariano:true, perda:false, alcoolista:false, transfundido:false },
    diag:"Normal quanto \u00e0 produ\u00e7\u00e3o de hemoglobina. A suplementa\u00e7\u00e3o de ferro e vitamina B12 parece adequada.",
    rec:"Procure orienta\u00e7\u00e3o de hematologista antes de doar sangue." },
  { id:17, label:'VEGETARIANO/A COM ANEMIA FERROPRIVA', color:'orange',
    conditions:{ ferritina:{min:0,max:24}, hemoglobina:{min:10.0,max:11.9}, vcm:{min:0,max:79}, rdw:{min:15.1,max:999}, satTransf:{min:0,max:19}, bariatrica:false, vegetariano:true, perda:false, alcoolista:false, transfundido:false },
    diag:"Anemia moderada por defici\u00eancia de ferro, provavelmente secund\u00e1ria a dieta insuficiente.",
    rec:"Avalia\u00e7\u00e3o com hematologista assim que poss\u00edvel. Suplementa\u00e7\u00e3o de ferro e B12 necess\u00e1ria." },
  { id:25, label:"BARI\u00c1TRICO/A COM SUPORTE ADEQUADO", color:'green',
    conditions:{ ferritina:{min:25,max:150}, hemoglobina:{min:12.0,max:17.5}, vcm:{min:75,max:100}, rdw:{min:11.5,max:16}, satTransf:{min:0,max:50}, bariatrica:true, vegetariano:false, perda:false, alcoolista:false, transfundido:false },
    diag:"Normal quanto \u00e0 produ\u00e7\u00e3o de hemoglobina apesar do d\u00e9ficit absortivo da bari\u00e1trica.",
    rec:"Avalia\u00e7\u00e3o com hematologista. Deve ser avaliado por m\u00e9dico antes de doar sangue." },
  { id:35, label:'ANEMIA IMPORTANTE COM HEMORRAGIA E SIDEROPENIA', color:'red',
    conditions:{ ferritina:{min:0,max:24}, hemoglobina:{min:7.0,max:9.9}, vcm:{min:0,max:79}, rdw:{min:15.1,max:999}, satTransf:{min:0,max:19}, bariatrica:false, vegetariano:false, perda:true, alcoolista:false, transfundido:false },
    diag:"Anemia importante por defici\u00eancia de ferro possivelmente causada pela hemorragia, com sideropenia grave.",
    rec:"Avalia\u00e7\u00e3o urgente com hematologista. Ferro endovenoso indicado. Investigar causa do sangramento." },
  { id:82, label:"ANEMIA MACROC\u00cdTICA \u2014 D\u00c9FICIT DE FOLATOS", color:'orange',
    conditions:{ ferritina:{min:25,max:150}, hemoglobina:{min:8.0,max:11.9}, vcm:{min:101,max:999}, rdw:{min:15.1,max:999}, satTransf:{min:20,max:50}, bariatrica:false, vegetariano:false, perda:false, alcoolista:true, transfundido:false },
    diag:"Anemia macroc\u00edtica em alcoolista \u2014 padr\u00e3o compat\u00edvel com defici\u00eancia de \u00e1cido f\u00f3lico.",
    rec:"Avalia\u00e7\u00e3o com hematologista. Suplementa\u00e7\u00e3o de \u00e1cido f\u00f3lico essencial. Suspender o \u00e1lcool." },
]

const colorMap = {
  green:  { bg:'rgba(34,197,94,0.1)',  border:'rgba(34,197,94,0.3)',  badge:'#16A34A', text:'#BBF7D0' },
  yellow: { bg:'rgba(234,179,8,0.1)',  border:'rgba(234,179,8,0.3)',  badge:'#CA8A04', text:'#FEF08A' },
  orange: { bg:'rgba(249,115,22,0.1)', border:'rgba(249,115,22,0.3)', badge:'#EA580C', text:'#FED7AA' },
  red:    { bg:'rgba(220,38,38,0.1)',  border:'rgba(220,38,38,0.35)', badge:'#DC2626', text:'#FECACA' },
}

// Lista de indicacoes (usada na faixa flutuante da hero e em qualquer outro lugar)
const RF_INDICACOES = [
  { text: "Projeto OBA\u00ae | OTIMIZAR O BARI\u00c1TRICO", highlight: true },
  { text: "Bari\u00e1tricos" },
  { text: "Anemias Cr\u00f4nicas" },
  { text: "Anemias Agudas" },
  { text: "Defici\u00eancia de Ferro" },
  { text: "Excesso de Ferro" },
  { text: "Hemoglobina Alta" },
  { text: "Regime de Sangrias" },
  { text: "Sangramentos Cr\u00f4nicos" },
  { text: "Vegetarianos" },
  { text: "Gestantes" },
  { text: "Cel\u00edacos" },
  { text: "Doadores de Sangue" },
  { text: "Uso de Testosterona" },
  { text: "Endometriose e Miomas" },
  { text: "Menstrua\u00e7\u00e3o Excessiva" },
  { text: "Defici\u00eancia de G-6-PD" },
  { text: "Alcoolistas" },
  { text: "HEMOGLOBINOPATIAS" },
];


export default function LandingPage({ onModoMedico, onModoPaciente, onIrLogin, onIrDashboardPaciente }) {
  const [medicoLogado, setMedicoLogado] = useState(() => {
    try { return localStorage.getItem('medico_nome') || ''; } catch(e) { return ''; }
  })

  // Controla qual modal de Termos esta aberto: null, 'medico', 'paciente'
  const [tcAberto, setTcAberto] = useState(null);

  // Indicacoes flutuantes do hero: marquee de 3 linhas, infinito.
  // Cada linha tem ordem embaralhada e velocidade propria.
  const marqueeRow1 = RF_INDICACOES;
  const marqueeRow2 = [...RF_INDICACOES].reverse();
  const marqueeRow3 = [...RF_INDICACOES].sort(() => Math.random() - 0.5);
  function fazerLogoffLanding() {
    try {
      localStorage.removeItem('medico_crm');
      localStorage.removeItem('medico_nome');
      localStorage.removeItem('medico_login_at');
    } catch(e) {}
    setMedicoLogado('');
  }

  // -- Paciente logado: localStorage (novo padrao) + Supabase Auth (fallback) --
  // pacienteLogadoFlag = ha sessao (existe paciente_id)
  // pacienteLogado = nome para exibicao (pode ser vazio nas contas novas)
  const [pacienteLogadoFlag, setPacienteLogadoFlag] = useState(() => {
    try { return !!localStorage.getItem('paciente_id'); } catch(e) { return false; }
  })
  const [pacienteLogado, setPacienteLogado] = useState(() => {
    try { return localStorage.getItem('paciente_nome') || ''; } catch(e) { return ''; }
  })
  useEffect(() => {
    let cancelado = false
    async function carregarPaciente(userId) {
      if (!userId) return
      const { data } = await supabase.from('profiles').select('nome').eq('id', userId).maybeSingle()
      if (!cancelado && data?.nome) setPacienteLogado(data.nome)
    }
    // Fallback: se nao tem nome no localStorage, tenta Supabase Auth
    try {
      const nomeLs = localStorage.getItem('paciente_nome')
      if (!nomeLs) {
        supabase.auth.getSession().then(({ data }) => carregarPaciente(data?.session?.user?.id))
      }
    } catch (e) {}
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) carregarPaciente(session.user.id)
    })
    return () => { cancelado = true; sub?.subscription?.unsubscribe?.() }
  }, [])
  async function fazerLogoffPaciente() {
    try {
      localStorage.removeItem('paciente_id')
      localStorage.removeItem('paciente_cpf')
      localStorage.removeItem('paciente_nome')
      localStorage.removeItem('paciente_login_at')
    } catch(e) {}
    try { await supabase.auth.signOut() } catch(e) {}
    setPacienteLogado('')
    setPacienteLogadoFlag(false)
  }

  const [crmMedicoExpand, setCrmMedicoExpand] = useState(false);
  // Fluxo seamless: dois campos (Numero + UF) que se juntam internamente em '123456/BA'.
  const UFS_VALIDAS_LP = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  const [crmMedicoNum, setCrmMedicoNum] = useState('');
  const [crmMedicoUF, setCrmMedicoUF] = useState('');
  const refCrmNumLP = useRef(null);
  const refCrmUfLP = useRef(null);
  // crmMedicoValor agora derivado (mantido para nao reescrever continuarComoMedico/caixaAvancarCrm/caixaConcluir).
  const crmMedicoValor = (crmMedicoNum && crmMedicoUF) ? `${crmMedicoNum}/${crmMedicoUF}` : '';
  const crmMedicoValido = !!(crmMedicoNum && crmMedicoUF.length === 2 && UFS_VALIDAS_LP.includes(crmMedicoUF));
  function continuarComoMedico() {
    if (!crmMedicoValido) return;
    try { localStorage.setItem('rf_crm_prefill', crmMedicoValor.trim().toUpperCase()); } catch(e) {}
    onModoMedico();
  }

  // Timer 1300ms: numero -> UF. Tambem avanca imediato com 6 digitos.
  useEffect(() => {
    if (!crmMedicoNum) return;
    if (crmMedicoNum.length === 6) {
      if (refCrmUfLP.current) refCrmUfLP.current.focus();
      return;
    }
    const t = setTimeout(() => {
      if (refCrmUfLP.current && document.activeElement === refCrmNumLP.current) {
        refCrmUfLP.current.focus();
      }
    }, 1300);
    return () => clearTimeout(t);
  }, [crmMedicoNum]);

  const [fluxoEtapa, setFluxoEtapa] = useState('inicio');
  // Tooltip "Procure no exame...":
  //  - Desktop: aparece no hover, some apos 4500ms (com fade-out 320ms)
  //  - Mobile: auto-aparece 800ms apos o mount (sem timeout), some no primeiro toque
  // Estado: 'hidden' | 'in' | 'out'.
  const [hintHero, setHintHero] = useState('hidden');
  const hintTimerRef = useRef(null);
  const hintHideTimerRef = useRef(null);
  // Detecta touch device (sem mouse hover fino). Roda uma vez no mount.
  const isMobile = (() => {
    if (typeof window === 'undefined') return false;
    try { return window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches; } catch (e) { return false; }
  })();
  function mostrarHintHero(opts) {
    const { semTimeout = false } = opts || {};
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (hintHideTimerRef.current) clearTimeout(hintHideTimerRef.current);
    setHintHero('in');
    if (!semTimeout) {
      hintTimerRef.current = setTimeout(() => {
        setHintHero('out');
        hintHideTimerRef.current = setTimeout(() => setHintHero('hidden'), 320);
      }, 4500);
    }
  }
  function esconderHintHero() {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (hintHideTimerRef.current) clearTimeout(hintHideTimerRef.current);
    setHintHero('out');
    hintHideTimerRef.current = setTimeout(() => setHintHero('hidden'), 320);
  }
  // Em mobile: auto-aparece 800ms apos mount, sem timeout (espera toque).
  useEffect(() => {
    if (!isMobile) return;
    const t = setTimeout(() => mostrarHintHero({ semTimeout: true }), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Em mobile: qualquer toque na tela fecha o tooltip (inclusive no proprio botao).
  useEffect(() => {
    if (!isMobile) return;
    if (hintHero !== 'in') return;
    function onTouch() { esconderHintHero(); }
    // Usa { once: true } pra fechar so' no primeiro toque depois que o tooltip subiu.
    window.addEventListener('touchstart', onTouch, { passive: true, once: true });
    return () => window.removeEventListener('touchstart', onTouch);
  }, [hintHero, isMobile]);
  const [fluxoFade, setFluxoFade] = useState(false);
  const [twTexto, setTwTexto] = useState('');
  useEffect(() => {
    if (fluxoEtapa !== 'inicio') return;
    const full = 'TEM UM HEMOGRAMA?...';
    let i = 0;
    setTwTexto('');
    const iv = setInterval(() => {
      i += 3;
      setTwTexto(full.slice(0, i));
      if (i >= full.length) { setTwTexto(full); clearInterval(iv); }
    }, 20);
    return () => clearInterval(iv);
  }, [fluxoEtapa]);

  // Alternancia do hero textbox a cada 7s
  const [heroVariant, setHeroVariant] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setHeroVariant(v => (v === 0 ? 1 : 0));
    }, 7000);
    return () => clearInterval(iv);
  }, []);

  function irPara(etapa) {
    setFluxoFade(true);
    setTimeout(() => {
      if (etapa === 'medico') { setCaixaPasso('crm'); setCaixaSenha(''); }
      setFluxoEtapa(etapa);
      setFluxoFade(false);
    }, 260);
  }
  function signInMedico() {
    try { localStorage.setItem('rf_open_login','1'); } catch(e){}
    onModoMedico();
  }

  function entrarLogadoDireto() {
    try {
      const crm = localStorage.getItem('medico_crm') || '';
      if (crm) { localStorage.setItem('rf_crm_prefill', crm); }
      localStorage.setItem('medico_login_at', Date.now().toString());
    } catch(e) {}
    onModoMedico();
  }

  const [caixaPasso, setCaixaPasso] = useState('crm');
  const [caixaSenha, setCaixaSenha] = useState('');
  const [caixaShowSenha, setCaixaShowSenha] = useState(false);
  const [caixaTw, setCaixaTw] = useState('');
  const [caixaModo, setCaixaModo] = useState(null);
  const [caixaBuscando, setCaixaBuscando] = useState(false);
  const [caixaErro, setCaixaErro] = useState('');
  const [caixaAceitoTC, setCaixaAceitoTC] = useState(false);
  const caixaSenhaValida = (caixaSenha || '').length >= 6;
  useEffect(() => {
    if (fluxoEtapa !== 'medico') return;
    const full = caixaPasso === 'crm'
      ? 'DIGITE O SEU CRM \u2794 UF'
      : (caixaModo === 'cadastro' ? 'CRIE AGORA A SUA SENHA' : 'DIGITE A SUA SENHA');
    let i = 0; setCaixaTw('');
    const iv = setInterval(() => {
      i += 3; setCaixaTw(full.slice(0, i));
      if (i >= full.length) { setCaixaTw(full); clearInterval(iv); }
    }, 20);
    return () => clearInterval(iv);
  }, [fluxoEtapa, caixaPasso]);
  async function caixaAvancarCrm() {
    if (!crmMedicoValido || caixaBuscando) return;
    setCaixaErro('');
    setCaixaBuscando(true);
    const crmLimpo = crmMedicoValor.trim().toUpperCase();
    let existe = false;
    try {
      const { data } = await supabase
        .from('medicos')
        .select('crm')
        .eq('crm', crmLimpo)
        .maybeSingle();
      existe = !!data;
    } catch (e) {
      existe = false;
    }
    setCaixaBuscando(false);
    setCaixaModo(existe ? 'login' : 'cadastro');
    setCaixaSenha('');
    setCaixaPasso('senha');
  }

  // Seamless: quando UF eh completada (2 letras validas), dispara avancar pra senha.
  useEffect(() => {
    if (caixaPasso !== 'crm') return;
    if (crmMedicoUF.length === 2 && UFS_VALIDAS_LP.includes(crmMedicoUF) && crmMedicoNum) {
      caixaAvancarCrm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmMedicoUF, crmMedicoNum, caixaPasso]);
  async function caixaConcluir() {
    if (!crmMedicoValido || !caixaSenhaValida || caixaBuscando) return;
    setCaixaErro('');
    if (caixaModo === 'cadastro' && !caixaAceitoTC) {
      setCaixaErro("ACEITE OS TERMOS DE USO PARA CONTINUAR");
      return;
    }
    const crmLimpo = crmMedicoValor.trim().toUpperCase();    if (caixaModo === 'login') {
      setCaixaBuscando(true);
      let medico = null;
      try {
        const { data } = await supabase
          .from('medicos')
          .select('id, nome, crm, senha_klipbit')
          .eq('crm', crmLimpo)
          .maybeSingle();
        medico = data;
      } catch (e) { medico = null; }
      setCaixaBuscando(false);
      if (!medico) { setCaixaErro('CONSELHO NAO ENCONTRADO'); return; }
      if (medico.senha_klipbit !== caixaSenha) { setCaixaErro('SENHA INCORRETA'); return; }
      try {
        localStorage.setItem('medico_crm', medico.crm);
        localStorage.setItem('medico_nome', medico.nome || '');
        localStorage.setItem('medico_login_at', Date.now().toString());
        localStorage.setItem('rf_crm_prefill', medico.crm);
      } catch (e) {}
      onModoMedico();
      return;
    }

    setCaixaBuscando(true);
    const partes = crmLimpo.split('/');
    const uf = partes[1] || '';
    let erroInsert = null;
    try {
      const { error } = await supabase.from('medicos').insert({
        crm: crmLimpo,
        uf,
        celular: '',
        email: '',
        senha_klipbit: caixaSenha,
      });
      erroInsert = error;
    } catch (e) {
      erroInsert = e;
    }
    setCaixaBuscando(false);
    if (erroInsert) {
      setCaixaErro('NAO FOI POSSIVEL CRIAR. TENTE NOVAMENTE.');
      return;
    }
    try {
      localStorage.setItem('medico_crm', crmLimpo);
      localStorage.setItem('medico_nome', '');
      localStorage.setItem('medico_login_at', Date.now().toString());
      localStorage.setItem('rf_crm_prefill', crmLimpo);
    } catch (e) {}
    onModoMedico();
  }

  // -- Caixa CPF + SENHA do PACIENTE (espelha caixa CRM/UF do medico) --
  const [cpfPacPasso, setCpfPacPasso] = useState('cpf'); // 'cpf' | 'senha'
  const [cpfPacValor, setCpfPacValor] = useState('');
  const [cpfPacSenha, setCpfPacSenha] = useState('');
  const [cpfPacShowSenha, setCpfPacShowSenha] = useState(false);
  const [cpfPacModo, setCpfPacModo] = useState(null); // 'login' | 'cadastro'
  const [cpfPacBuscando, setCpfPacBuscando] = useState(false);
  const [cpfPacErro, setCpfPacErro] = useState('');
  const [cpfPacTw, setCpfPacTw] = useState('');
  const [cpfPacSemCpf, setCpfPacSemCpf] = useState(false);
  const [cpfPacAceitoTC, setCpfPacAceitoTC] = useState(false);
  function formatarCPFLand(valor) {
    const d = (valor || '').replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0,3) + '.' + d.slice(3);
    if (d.length <= 9) return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6);
    return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9);
  }
  const cpfPacDigitos = (cpfPacValor || '').replace(/\D/g, '');
  const cpfPacValido = cpfPacDigitos.length === 11;
  const cpfPacSenhaValida = (cpfPacSenha || '').length >= 6;
  useEffect(() => {
    if (fluxoEtapa !== 'paciente') return;
    const full = cpfPacPasso === 'cpf'
      ? "DIGITE O SEU CPF"
      : (cpfPacModo === 'cadastro' ? "CRIE AGORA A SUA SENHA" : "DIGITE A SUA SENHA");
    let i = 0; setCpfPacTw('');
    const iv = setInterval(() => {
      i += 3; setCpfPacTw(full.slice(0, i));
      if (i >= full.length) { setCpfPacTw(full); clearInterval(iv); }
    }, 20);
    return () => clearInterval(iv);
  }, [fluxoEtapa, cpfPacPasso, cpfPacModo]);
  async function cpfPacAvancar() {
    if (!cpfPacValido || cpfPacBuscando) return;
    setCpfPacErro('');
    setCpfPacBuscando(true);
    let existe = false;
    try {
      const { data } = await supabase.rpc('lookup_cpf_triagem', { cpf_input: cpfPacDigitos });
      existe = !!(data?.find?.(r => r.origem === 'profile'));
    } catch (e) { existe = false; }
    setCpfPacBuscando(false);
    setCpfPacModo(existe ? 'login' : 'cadastro');
    setCpfPacSenha('');
    setCpfPacAceitoTC(false);
    setCpfPacPasso('senha');
  }
  async function cpfPacConcluir() {
    if (!cpfPacValido || !cpfPacSenhaValida || cpfPacBuscando) return;
    setCpfPacErro('');
    if (cpfPacModo === 'cadastro' && !cpfPacAceitoTC) {
      setCpfPacErro("ACEITE OS TERMOS DE USO PARA CONTINUAR");
      return;
    }
    setCpfPacBuscando(true);
    const rpcName = cpfPacModo === 'login' ? 'login_paciente' : 'register_paciente';
    let resp = null;
    try {
      const { data, error } = await supabase.rpc(rpcName, {
        p_cpf: cpfPacDigitos,
        p_senha: cpfPacSenha,
      });
      if (error) {
        setCpfPacBuscando(false);
        setCpfPacErro("ERRO DE CONEXAO. TENTE NOVAMENTE.");
        return;
      }
      resp = data;
    } catch (e) {
      setCpfPacBuscando(false);
      setCpfPacErro("ERRO DE CONEXAO. TENTE NOVAMENTE.");
      return;
    }
    setCpfPacBuscando(false);
    if (!resp || !resp.ok) {
      const msg = (resp && resp.erro) ? String(resp.erro).toUpperCase() : "FALHA NO LOGIN";
      setCpfPacErro(msg);
      return;
    }
    try {
      localStorage.setItem('paciente_id', resp.id || '');
      localStorage.setItem('paciente_cpf', cpfPacDigitos);
      localStorage.setItem('paciente_nome', resp.nome || '');
      localStorage.setItem('paciente_login_at', Date.now().toString());
    } catch (e) {}
    setPacienteLogado(resp.nome || '');
    setPacienteLogadoFlag(true);
    onModoPaciente && onModoPaciente();
  }
  function cpfPacAlternativo() {
    // Fluxo alternativo (sem CPF) - por enquanto manda pra AuthPage legacy
    try {
      localStorage.setItem('rf_paciente_sem_cpf', '1');
      localStorage.removeItem('rf_paciente_cpf_prefill');
      localStorage.removeItem('rf_paciente_etapa_inicial');
    } catch (e) {}
    onIrLogin && onIrLogin({ cpf: '', etapa: 'cadastro', semCpf: true });
  }
  function cpfPacVoltarCpf() {
    setCpfPacPasso('cpf');
    setCpfPacSenha('');
    setCpfPacErro('');
    setCpfPacModo(null);
  }


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

  useEffect(() => {
    if (!showContato) return
    const onKey = (e) => { if (e.key === 'Escape') setShowContato(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showContato])

  function handleFadaClick() {
    const next = fadaClicks + 1
    setFadaClicks(next)
    if (fadaTimer.current) clearTimeout(fadaTimer.current)
    if (next >= 5) {
      setFadaClicks(0)
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

  function onFilEnter() {
    if (filTimer.current) clearTimeout(filTimer.current)
    setShowFil(true)
    filTimer.current = setTimeout(() => setShowFil(false), 1000)
  }

  function handleFormChange(field, value) {
    setRfForm(prev => ({ ...prev, [field]: value }))
  }

  const rfMatrix2 = [
    { id:3,  label:'Eritron Saudavel',           color:'#16A34A', diag:"Produ\u00e7\u00e3o normal de hemoglobina e c\u00e9lulas vermelhas, com boa reserva de ferro.",           rec:"Avalia\u00e7\u00e3o m\u00e9dica preventiva semestral.",                                       c:{ f:{a:25,b:150},   h:{a:12,b:17.5}, v:{a:75,b:100}, r:{a:11.5,b:15.5}, s:{a:20,b:50}  } },
    { id:10, label:'Sideropenia sem Anemia',     color:'#CA8A04', diag:"Hemoglobina normal, mas com deple\u00e7\u00e3o incipiente de ferro.",                              rec:"Procure hematologista. Investigue a causa.",                                   c:{ f:{a:0,b:24},     h:{a:12,b:17.5}, v:{a:75,b:100}, r:{a:15.1,b:999}, s:{a:0,b:50}   } },
    { id:11, label:'Anemia Ferropriva Moderada', color:'#EA580C', diag:"Defici\u00eancia de ferro com impacto sobre a produ\u00e7\u00e3o de hemoglobina \u2014 anemia moderada.",    rec:"Avalia\u00e7\u00e3o com hematologista. Reposi\u00e7\u00e3o de ferro conforme avalia\u00e7\u00e3o.",          c:{ f:{a:0,b:24},     h:{a:10,b:11.9}, v:{a:0,b:79},   r:{a:15.1,b:999}, s:{a:0,b:50}   } },
    { id:12, label:'Anemia Ferropriva Importante',color:'#DC2626', diag:"Anemia ferropriva importante. Exige interven\u00e7\u00e3o m\u00e9dica imediata.",                       rec:"Avalia\u00e7\u00e3o urgente. Ferro endovenoso indicado.",                               c:{ f:{a:0,b:24},     h:{a:7,b:9.9},   v:{a:0,b:79},   r:{a:15.1,b:999}, s:{a:0,b:19}   } },
    { id:5,  label:"Processo Inflamat\u00f3rio",      color:'#CA8A04', diag:"Ferritina elevada com satura\u00e7\u00e3o normal. Processos inflamat\u00f3rios ou doen\u00e7as cr\u00f4nicas.",   rec:"Procure hematologista. Investigar a ferritina elevada.",                       c:{ f:{a:151,b:400},  h:{a:12,b:17.5}, v:{a:80,b:100}, r:{a:11.5,b:16},  s:{a:20,b:50}  } },
    { id:7,  label:'Excesso de Ferro / Siderose',color:'#EA580C', diag:"Ferritina e satura\u00e7\u00e3o da transferrina elevadas \u2014 siderose significativa.",                rec:"Sangrias terap\u00eauticas podem ser indicadas.",                                   c:{ f:{a:401,b:900},  h:{a:12,b:17.5}, v:{a:80,b:100}, r:{a:11.5,b:15},  s:{a:51,b:999} } },
    { id:8,  label:"Compat\u00edvel com Hemocromatose",color:'#DC2626',diag:"Ferritina e satura\u00e7\u00e3o muito elevadas. Poss\u00edvel hemocromatose heredit\u00e1ria.",              rec:"Avalia\u00e7\u00e3o urgente. Sangrias indicadas.",                                       c:{ f:{a:801,b:9999}, h:{a:12,b:17.5}, v:{a:80,b:100}, r:{a:11.5,b:15},  s:{a:51,b:999} } },
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
      if (l) l.textContent="Combina\u00e7\u00e3o n\u00e3o encontrada"
      const d = document.getElementById('rf-result-diag')
      if (d) d.textContent="Acesse o RedFairy completo para avalia\u00e7\u00e3o detalhada."
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
    if (!idade || idade < 12 || idade > 100) { setRfErro("Informe uma idade v\u00e1lida (12\u2013100 anos)."); return }
    const inp = { hemoglobina:hb, ferritina:ferr, vcm, rdw, satTransf:sat,
      bariatrica:rfForm.bariatrica, vegetariano:rfForm.vegetariano,
      perda:rfForm.perda, alcoolista:rfForm.alcoolista, transfundido:rfForm.transfundido }
    const res = rfMatch(rfMatrix, inp)
    if (res) setRfResultado(res)
    else setRfErro("Combina\u00e7\u00e3o n\u00e3o encontrada na vers\u00e3o simplificada. Acesse o RedFairy completo.")
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

      {showOBA && (
        <OBAModal
          sexo={sexoOBA}
          idade={idadeOBA}
          cpf={null}
          onConcluir={() => { setShowOBA(false); onModoPaciente() }}
          onFechar={() => setShowOBA(false)}
        />
      )}

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
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span className="tag" style={{ color: 'var(--cherry)' }}>Contato</span>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--wine)', fontWeight: 800, marginTop: '0.4rem' }}>
                Fale com a gente
              </h2>
            </div>

            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.6, fontWeight: 700, margin: 0 }}>
                <strong style={{ color: 'var(--wine)' }}>{"La\u00edse Silva Dantas"}</strong>
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-sec)', fontWeight: 500, margin: '0.2rem 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                COO
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.8rem' }}>
                {"Endere\u00e7o para Correspond\u00eancia"}
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
                {"Rua Barro Vermelho, 386/42"}<br/>
                {"Rio Vermelho \u00b7 CEP 41940-340"}<br/>
                {"Salvador \u2014 Bahia | Brasil"}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 500, margin: 0, textAlign: 'center' }}>
                <strong style={{ color: 'var(--wine)', fontWeight: 700, letterSpacing: '0.5px' }}>{"CYTOMICA"}<sup style={{ fontSize: '0.6em', fontWeight: 500 }}>{"\u00ae"}</sup></strong><br/>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-sec)' }}>CNPJ 57.561.446/0001-02</span>
              </p>
            </div>

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
                  transition: 'all 0.2s', fontFamily: "'Apple Color Emoji', 'Segoe UI Symbol', 'Noto Sans Symbols', sans-serif",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
              >
                {"\u2715"}
              </button>
            </div>
          </div>
        </div>
      )}

      <a href="https://wa.me/5571997110804" target="_blank" rel="noopener noreferrer" className="whatsapp-btn" aria-label="WhatsApp">
        <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>


      <nav id="landing-nav" className={navScrolled ? 'scrolled' : ''} style={{ position:'fixed', top:0, left:0, right:0, boxSizing:'border-box', zIndex:1000, padding:'0.75rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', maxWidth:1200, margin:'0 auto', width:'100%' }}>
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
          <span>Red<em>Fairy</em><sup style={{ color: 'var(--cherry)', fontSize: '0.45em', fontWeight: 500, verticalAlign: 'super', marginLeft: '1px' }}>{"\u00ae"}</sup></span>
        </a>
        <div className={`nav-overlay${navOpen ? ' open' : ''}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
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
          <a href="#indicacoes" onClick={() => setNavOpen(false)}>{"Indica\u00e7\u00f5es"}</a>
          <a href="#avaliar" onClick={() => setNavOpen(false)}>Avaliar</a>
          <a href="#oba" onClick={() => setNavOpen(false)}>Projeto OBA</a>
          <a href="#sobre" onClick={() => { setShowSobre(true); setNavOpen(false) }}>Sobre</a>
          <a href="#contato" onClick={(e) => { e.preventDefault(); setShowContato(true); setNavOpen(false) }}>Contato</a>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
          {medicoLogado && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div title={medicoLogado} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#b91c1c', border: '2px solid rgba(123,30,30,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'pulse 2s infinite' }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: '12px' }}>
                  {medicoLogado.split(' ').filter(Boolean).slice(0,2).map(p => p[0]).join('').toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ color: '#b91c1c', fontSize: '9px', fontWeight: 700, letterSpacing: '1px' }}>LOGADO</span>
                <span style={{ color: '#b91c1c', fontSize: '8px', fontWeight: 700, letterSpacing: '1px', marginTop: '2px' }}>{"M\u00c9DICO"}</span>
              </div>
              <button onClick={fazerLogoffLanding} aria-label="Sair" title="Sair"
                style={{ background: '#e5e7eb', color: '#b91c1c', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', lineHeight: 1 }}>
                Sair
              </button>
            </div>
          )}
          {pacienteLogadoFlag && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div title={pacienteLogado || 'Paciente'} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1f2937', border: '2px solid rgba(31,41,55,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'pulseGray 2s infinite' }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: '12px' }}>
                  {(pacienteLogado || '').split(' ').filter(Boolean).slice(0,2).map(p => p[0]).join('').toUpperCase() || '\u2022'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ color: '#1f2937', fontSize: '9px', fontWeight: 700, letterSpacing: '1px' }}>LOGADO</span>
                <span style={{ color: '#1f2937', fontSize: '8px', fontWeight: 700, letterSpacing: '1px', marginTop: '2px' }}>PACIENTE</span>
              </div>
              <button onClick={fazerLogoffPaciente} aria-label="Sair" title="Sair"
                style={{ background: '#e5e7eb', color: '#1f2937', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', lineHeight: 1 }}>
                Sair
              </button>
            </div>
          )}
          <button className="hamburger" onClick={() => setNavOpen(!navOpen)}>
            <span /><span /><span />
          </button>
        </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-wrap">

          <div className="reveal">

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
                <div style={{ display:'grid' }}>
                  <div style={{ gridArea:'1 / 1', opacity: heroVariant === 0 ? 1 : 0, transition:'opacity 1.2s ease', pointerEvents: heroVariant === 0 ? 'auto' : 'none' }}>
                    <h1>{"Eu sou a sua fada vermelha, a sua "}<span className="red">Hemoglobina</span></h1>
                    <p className="hero-philosophy" style={{ fontStyle:'normal', fontWeight:800, textAlign:'center' }}>
                      {"Eu uso poeira de estrelas para te entregar o ar."}<br/>{"Quanto tempo voc\u00ea vive sem ar?"}
                    </p>
                  </div>
                  <div style={{ gridArea:'1 / 1', opacity: heroVariant === 1 ? 1 : 0, transition:'opacity 1.2s ease', pointerEvents: heroVariant === 1 ? 'auto' : 'none', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <h1>{"Diagn\u00f3stico e tratamento de dist\u00farbios do "}<span className="red">Eritron</span>{" humano"}</h1>
                    <p className="hero-philosophy" style={{ fontStyle:'normal', fontWeight:800, textAlign:'center' }}>
                      {"Entender e ajustar a produ\u00e7\u00e3o de hemoglobina e c\u00e9lulas vermelhas"}
                    </p>
                  </div>
                </div>
              </div>
            </div>


            <div className={`rf-fadewrap ${fluxoFade ? 'out' : 'in'}`} style={{ width:'100%', maxWidth:480, margin:'0 auto 0.5rem', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.7rem' }}>

              {fluxoEtapa === 'inicio' && (
                <>
                  <p onMouseEnter={mostrarHintHero}
                    style={{ fontSize:'1rem', fontWeight:800, color:'#ef4444', letterSpacing:'1px', margin:'0 0 0.5rem', minHeight:'1.3rem', cursor:'default' }}>
                    {twTexto}
                  </p>
                  <div style={{ position:'relative', display:'inline-block' }}>
                    <button onClick={() => {
                      if (medicoLogado) { entrarLogadoDireto(); return; }
                      // Checa localStorage live (n\u00e3o state estale): se nao tem paciente_id real,
                      // nao tenta ir pro dashboard (cairia em AuthPage legacy "Modo Paciente").
                      let temPacienteIdLive = false;
                      try { temPacienteIdLive = !!localStorage.getItem('paciente_id'); } catch (e) {}
                      if (pacienteLogadoFlag && !temPacienteIdLive) {
                        // Estado dessincronizado: limpa flag e segue pra escolha.
                        setPacienteLogadoFlag(false);
                        setPacienteLogado('');
                      } else if (pacienteLogadoFlag && temPacienteIdLive) {
                        onIrDashboardPaciente && onIrDashboardPaciente();
                        return;
                      }
                      irPara('escolha');
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.06)'; mostrarHintHero(); }}
                    onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
                    style={{ position:'relative', width:96, height:96, borderRadius:'50%', background:'none', backgroundColor:'transparent', border:'none', outline:'none', padding:0, margin:0, cursor:'pointer', transition:'transform 0.15s ease', animation:'heartbeat 1.6s ease-in-out infinite', WebkitAppearance:'none', MozAppearance:'none', appearance:'none', boxShadow:'none' }}>
                    <img src={redcell1} alt="ENTRE"
                      style={{ width:'100%', height:'100%', objectFit:'contain', display:'block', pointerEvents:'none', background:'transparent' }} />
                    <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', color:'#fff', fontWeight:900, fontSize:'0.85rem', letterSpacing:'1px', paddingLeft:'1px', textShadow:'0 1px 3px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.4)', pointerEvents:'none', userSelect:'none', whiteSpace:'nowrap' }}>
                      ENTRE
                    </span>
                    </button>
                    {hintHero !== 'hidden' && (
                      <div role="tooltip"
                        style={{ position:'absolute', left:'calc(100% + 18px)', top:'50%', transform:'translateY(-50%)', background:'#f3f4f6', color:'#374151', fontSize:'0.7rem', fontWeight:500, lineHeight:1.35, padding:'6px 10px', borderRadius:'8px', border:'1.5px solid #7B1E1E', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', maxWidth:'180px', textAlign:'left', zIndex:50, pointerEvents:'none', animation: hintHero === 'in' ? 'fadeInHint 0.35s ease-out forwards' : 'fadeOutHint 0.3s ease-in forwards' }}>
                        {"Procure no exame e anote: DATA, HEMOGLOBINA, VCM e RDW"}
                      </div>
                    )}
                  </div>
                </>
              )}

              {fluxoEtapa === 'escolha' && (
                <div style={{ display:'flex', gap:'0.9rem', justifyContent:'center', width:'100%' }}>
                  <button onClick={() => irPara('medico')}
                  onMouseEnter={e => { e.currentTarget.style.transform='scale(1.06)'; e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,0.18)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='none'; }}
                  style={{ width:72, height:72, borderRadius:'50%', background:'#d1d5db', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', fontWeight:900, letterSpacing:'1px', textAlign:'center', padding:0, transition:'transform 0.15s ease, box-shadow 0.15s ease', border:'4px solid #ef4444', color:'#ef4444', fontSize:'0.62rem' }}>
                    MEDICO
                  </button>
                  <button onClick={() => {
                    let temPacienteIdLive = false;
                    try { temPacienteIdLive = !!localStorage.getItem('paciente_id'); } catch (e) {}
                    if (pacienteLogadoFlag && !temPacienteIdLive) {
                      setPacienteLogadoFlag(false);
                      setPacienteLogado('');
                    } else if (pacienteLogadoFlag && temPacienteIdLive) {
                      onIrDashboardPaciente && onIrDashboardPaciente();
                      return;
                    }
                    irPara('paciente');
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='scale(1.06)'; e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,0.18)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='none'; }}
                  style={{ width:72, height:72, borderRadius:'50%', background:'#d1d5db', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', fontWeight:900, letterSpacing:'1px', textAlign:'center', padding:0, transition:'transform 0.15s ease, box-shadow 0.15s ease', border:'4px solid #1f2937', color:'#1f2937', fontSize:'0.62rem' }}>
                    PACIENTE
                  </button>
                </div>
              )}

              {fluxoEtapa === 'medico' && (
                <div style={{ border:'2px solid #ef4444', borderRadius:'14px', padding:'16px', background:'#fff', width:'100%', maxWidth:340 }}>
                  <p style={{ fontSize:'0.78rem', fontWeight:800, color:'#ef4444', letterSpacing:'0.5px', margin:'0 0 6px', minHeight:'1rem', textAlign:'center' }}>
                    {caixaTw}
                  </p>

                  {caixaPasso === 'crm' && (
                    <>
                      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'8px' }}>
                        <input
                          ref={refCrmNumLP}
                          autoFocus
                          type="text"
                          value={crmMedicoNum}
                          onChange={e => setCrmMedicoNum(String(e.target.value || '').replace(/\D/g, '').slice(0, 6))}
                          placeholder="Ex: 6302"
                          inputMode="numeric"
                          maxLength={6}
                          className="rf-cx-input"
                          style={{ width:'100%', border:'2px solid #facc15', background:'#fefce8', color:'#1e3a8a', fontWeight:700, borderRadius:'8px', padding:'10px 12px', fontSize:'0.95rem', outline:'none', textAlign:'center' }}
                        />
                        <input
                          ref={refCrmUfLP}
                          type="text"
                          value={crmMedicoUF}
                          onChange={e => setCrmMedicoUF(String(e.target.value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))}
                          onKeyDown={e => { if (e.key === 'Enter' && crmMedicoValido) caixaAvancarCrm(); }}
                          placeholder="UF"
                          maxLength={2}
                          className="rf-cx-input"
                          style={{ width:'100%', border: (crmMedicoUF.length === 2 && !UFS_VALIDAS_LP.includes(crmMedicoUF)) ? '2px solid #ef4444' : '2px solid #facc15', background: (crmMedicoUF.length === 2 && !UFS_VALIDAS_LP.includes(crmMedicoUF)) ? '#fef2f2' : '#fefce8', color:'#1e3a8a', fontWeight:700, borderRadius:'8px', padding:'10px 12px', fontSize:'0.95rem', outline:'none', textAlign:'center', textTransform:'uppercase' }}
                        />
                      </div>
                      {crmMedicoUF.length === 2 && !UFS_VALIDAS_LP.includes(crmMedicoUF) && (
                        <p style={{ fontSize:'0.7rem', color:'#dc2626', fontWeight:700, margin:'6px 0 0', textAlign:'center' }}>{"UF inv\u00e1lida"}</p>
                      )}
                      <p style={{ fontSize:'0.62rem', color:'#6B7280', fontWeight:700, letterSpacing:'1px', margin:'6px 0 12px', textAlign:'center' }}>LOGIN NO SISTEMA</p>
                      <button
                        onClick={caixaAvancarCrm}
                        disabled={!crmMedicoValido}
                        style={{ width:'100%', height:42, borderRadius:'8px', border:'none', background:'#ef4444', color:'#fff', fontWeight:800, letterSpacing:'1px', cursor: crmMedicoValido ? 'pointer' : 'not-allowed', opacity: crmMedicoValido ? 1 : 0.4 }}>
                        {"CONTINUAR \u2192"}
                      </button>
                    </>
                  )}

                  {caixaPasso === 'senha' && (
                    <>
                      <div style={{ position:'relative' }}>
                        <input
                          autoFocus
                          type={caixaShowSenha ? 'text' : 'password'}
                          value={caixaSenha}
                          onChange={e => setCaixaSenha(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && caixaSenhaValida) caixaConcluir(); }}
                          placeholder="SEIS CARACTERES"
                          className="rf-cx-input"
                          style={{ width:'100%', border:'2px solid #facc15', background:'#fefce8', color:'#1e3a8a', fontWeight:700, borderRadius:'8px', padding:'10px 38px 10px 12px', fontSize:'0.95rem', outline:'none', textAlign:'center' }}
                        />
                        <button type="button" onClick={() => setCaixaShowSenha(s => !s)}
                          aria-label={caixaShowSenha ? 'Ocultar senha' : 'Mostrar senha'}
                          style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:'4px', color:'#9ca3af' }}>
                          {caixaShowSenha ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                      <p style={{ fontSize:'0.62rem', color:'#6B7280', fontWeight:700, letterSpacing:'1px', margin:'6px 0 12px', textAlign:'center' }}>LOGIN NO SISTEMA</p>
                      {caixaModo === 'cadastro' && (
                        <label style={{ display:'flex', alignItems:'flex-start', gap:'8px', justifyContent:'flex-start', margin:'0 0 12px', cursor:'pointer', userSelect:'none' }}>
                          <input
                            type="checkbox"
                            checked={caixaAceitoTC}
                            onChange={e => setCaixaAceitoTC(e.target.checked)}
                            style={{ width:'14px', height:'14px', cursor:'pointer', accentColor:'#ef4444', marginTop:'2px', flexShrink:0 }} />
                          <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#374151', letterSpacing:'0.3px', lineHeight:1.3 }}>
                            {"Li e aceito os "}
                            <a href="#" onClick={e => { e.preventDefault(); setTcAberto('medico'); }}
                              style={{ color:'#7B1E1E', textDecoration:'underline', fontWeight:800 }}>
                              {"Termos e Condi\u00e7\u00f5es de Uso"}
                            </a>
                          </span>
                        </label>
                      )}
                      {caixaErro && (
                        <div style={{ textAlign:'center', margin:'0 0 10px' }}>
                          <p style={{ color:'#dc2626', fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.5px', margin:'0 0 2px' }}>{caixaErro}</p>
                          {caixaModo === 'login' && (
                            <a href="https://wa.me/5571997110804" target="_blank" rel="noopener noreferrer"
                              style={{ color:'#7B1E1E', fontSize:'0.66rem', fontWeight:700, textDecoration:'underline' }}>
                              Recuperar senha
                            </a>
                          )}
                        </div>
                      )}
                      <button
                        onClick={caixaConcluir}
                        disabled={!caixaSenhaValida}
                        style={{ width:'100%', height:42, borderRadius:'8px', border:'none', background:'#ef4444', color:'#fff', fontWeight:800, letterSpacing:'1px', cursor: caixaSenhaValida ? 'pointer' : 'not-allowed', opacity: caixaSenhaValida ? 1 : 0.4 }}>
                        {"CONTINUAR \u2192"}
                      </button>
                      <button onClick={() => setCaixaPasso('crm')}
                        style={{ width:'100%', background:'none', border:'none', color:'#9CA3AF', fontSize:'0.65rem', fontWeight:700, letterSpacing:'1px', cursor:'pointer', marginTop:'8px' }}>
                        {"\u2190 corrigir CRM"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {fluxoEtapa === 'paciente' && (
                <div style={{ border:'2px solid #1f2937', borderRadius:'14px', padding:'16px', background:'#fff', width:'100%', maxWidth:340 }}>
                  <p style={{ fontSize:'0.78rem', fontWeight:800, color:'#1f2937', letterSpacing:'0.5px', margin:'0 0 6px', minHeight:'1rem', textAlign:'center' }}>
                    {cpfPacTw}
                  </p>

                  {cpfPacPasso === 'cpf' && (
                    <>
                      <input
                        autoFocus
                        type="text"
                        value={cpfPacValor}
                        onChange={e => { setCpfPacValor(formatarCPFLand(e.target.value)); setCpfPacErro(''); }}
                        onKeyDown={e => { if (e.key === 'Enter' && cpfPacValido) cpfPacAvancar(); }}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                        maxLength={14}
                        className="rf-cx-input"
                        style={{ width:'100%', border:'2px solid #facc15', background:'#fefce8', color:'#1e3a8a', fontWeight:700, borderRadius:'8px', padding:'10px 12px', fontSize:'0.95rem', outline:'none', textAlign:'center' }}
                      />
                      <p style={{ fontSize:'0.62rem', color:'#6B7280', fontWeight:700, letterSpacing:'1px', margin:'6px 0 10px', textAlign:'center' }}>{"LOGIN DO PACIENTE"}</p>

                      <label style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'center', margin:'0 0 12px', cursor:'pointer', userSelect:'none' }}>
                        <input
                          type="checkbox"
                          checked={cpfPacSemCpf}
                          onChange={e => setCpfPacSemCpf(e.target.checked)}
                          style={{ width:'14px', height:'14px', cursor:'pointer', accentColor:'#1f2937' }} />
                        <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#374151', letterSpacing:'0.3px' }}>{"N\u00c3O TENHO CPF"}</span>
                      </label>

                      {cpfPacErro && (
                        <div style={{ textAlign:'center', margin:'0 0 10px' }}>
                          <p style={{ color:'#dc2626', fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.5px', margin:'0' }}>{cpfPacErro}</p>
                        </div>
                      )}

                      {cpfPacSemCpf ? (
                        <button
                          onClick={cpfPacAlternativo}
                          style={{ width:'100%', height:42, borderRadius:'8px', border:'none', background:'#1f2937', color:'#fff', fontWeight:800, letterSpacing:'1px', cursor:'pointer' }}>
                          {"CONTINUAR SEM CPF \u2192"}
                        </button>
                      ) : (
                        <button
                          onClick={cpfPacAvancar}
                          disabled={!cpfPacValido || cpfPacBuscando}
                          style={{ width:'100%', height:42, borderRadius:'8px', border:'none', background:'#1f2937', color:'#fff', fontWeight:800, letterSpacing:'1px', cursor: cpfPacValido && !cpfPacBuscando ? 'pointer' : 'not-allowed', opacity: cpfPacValido && !cpfPacBuscando ? 1 : 0.4 }}>
                          {cpfPacBuscando ? "VERIFICANDO..." : "CONTINUAR \u2192"}
                        </button>
                      )}
                    </>
                  )}

                  {cpfPacPasso === 'senha' && (
                    <>
                      <div style={{ position:'relative' }}>
                        <input
                          autoFocus
                          type={cpfPacShowSenha ? 'text' : 'password'}
                          value={cpfPacSenha}
                          onChange={e => { setCpfPacSenha(e.target.value); setCpfPacErro(''); }}
                          onKeyDown={e => { if (e.key === 'Enter' && cpfPacSenhaValida) cpfPacConcluir(); }}
                          placeholder="SEIS CARACTERES"
                          className="rf-cx-input"
                          style={{ width:'100%', border:'2px solid #facc15', background:'#fefce8', color:'#1e3a8a', fontWeight:700, borderRadius:'8px', padding:'10px 38px 10px 12px', fontSize:'0.95rem', outline:'none', textAlign:'center' }}
                        />
                        <button type="button" onClick={() => setCpfPacShowSenha(s => !s)}
                          aria-label={cpfPacShowSenha ? 'Ocultar senha' : 'Mostrar senha'}
                          style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:'4px', color:'#9ca3af' }}>
                          {cpfPacShowSenha ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                      <p style={{ fontSize:'0.62rem', color:'#6B7280', fontWeight:700, letterSpacing:'1px', margin:'6px 0 12px', textAlign:'center' }}>{"LOGIN DO PACIENTE"}</p>

                      {cpfPacModo === 'cadastro' && (
                        <label style={{ display:'flex', alignItems:'flex-start', gap:'8px', justifyContent:'flex-start', margin:'0 0 12px', cursor:'pointer', userSelect:'none' }}>
                          <input
                            type="checkbox"
                            checked={cpfPacAceitoTC}
                            onChange={e => setCpfPacAceitoTC(e.target.checked)}
                            style={{ width:'14px', height:'14px', cursor:'pointer', accentColor:'#1f2937', marginTop:'2px', flexShrink:0 }} />
                          <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#374151', letterSpacing:'0.3px', lineHeight:1.3 }}>
                            {"Li e aceito os "}
                            <a href="#" onClick={e => { e.preventDefault(); setTcAberto('paciente'); }}
                              style={{ color:'#1f2937', textDecoration:'underline', fontWeight:800 }}>
                              {"Termos e Condi\u00e7\u00f5es de Uso"}
                            </a>
                          </span>
                        </label>
                      )}

                      {cpfPacErro && (
                        <div style={{ textAlign:'center', margin:'0 0 10px' }}>
                          <p style={{ color:'#dc2626', fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.5px', margin:'0 0 2px' }}>{cpfPacErro}</p>
                          {cpfPacModo === 'login' && (
                            <a href="https://wa.me/5571997110804" target="_blank" rel="noopener noreferrer"
                              style={{ color:'#7B1E1E', fontSize:'0.66rem', fontWeight:700, textDecoration:'underline' }}>
                              Recuperar senha
                            </a>
                          )}
                        </div>
                      )}
                      <button
                        onClick={cpfPacConcluir}
                        disabled={!cpfPacSenhaValida || cpfPacBuscando}
                        style={{ width:'100%', height:42, borderRadius:'8px', border:'none', background:'#1f2937', color:'#fff', fontWeight:800, letterSpacing:'1px', cursor: cpfPacSenhaValida && !cpfPacBuscando ? 'pointer' : 'not-allowed', opacity: cpfPacSenhaValida && !cpfPacBuscando ? 1 : 0.4 }}>
                        {cpfPacBuscando ? (cpfPacModo === 'login' ? "ENTRANDO..." : "CRIANDO...") : "CONTINUAR \u2192"}
                      </button>
                      <button onClick={cpfPacVoltarCpf}
                        style={{ width:'100%', background:'none', border:'none', color:'#9CA3AF', fontSize:'0.65rem', fontWeight:700, letterSpacing:'1px', cursor:'pointer', marginTop:'8px' }}>
                        {"\u2190 corrigir CPF"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {fluxoEtapa !== 'inicio' && (
                <button onClick={() => { setCrmMedicoExpand(false); irPara(fluxoEtapa === 'escolha' ? 'inicio' : 'escolha'); }}
                  style={{ background:'none', border:'none', color:'#9CA3AF', fontSize:'0.7rem', fontWeight:700, letterSpacing:'1px', cursor:'pointer', marginTop:'0.3rem' }}>
                  {"\u2190 VOLTAR"}
                </button>
              )}

            </div>

            {/* Marquee de indicacoes: 3 linhas, scroll infinito horizontal */}
            <div className="rf-marquee" aria-hidden="true">
              <div className="rf-marquee-row rf-marquee-row-1">
                <div className="rf-marquee-track">
                  {marqueeRow1.map((ind, i) => (
                    <span key={`r1a-${i}`} className={`rf-marquee-item${ind.highlight ? ' rf-marquee-item-hl' : ''}`}>{ind.text}</span>
                  ))}
                  {marqueeRow1.map((ind, i) => (
                    <span key={`r1b-${i}`} className={`rf-marquee-item${ind.highlight ? ' rf-marquee-item-hl' : ''}`} aria-hidden="true">{ind.text}</span>
                  ))}
                </div>
              </div>
              <div className="rf-marquee-row rf-marquee-row-2">
                <div className="rf-marquee-track">
                  {marqueeRow2.map((ind, i) => (
                    <span key={`r2a-${i}`} className={`rf-marquee-item${ind.highlight ? ' rf-marquee-item-hl' : ''}`}>{ind.text}</span>
                  ))}
                  {marqueeRow2.map((ind, i) => (
                    <span key={`r2b-${i}`} className={`rf-marquee-item${ind.highlight ? ' rf-marquee-item-hl' : ''}`} aria-hidden="true">{ind.text}</span>
                  ))}
                </div>
              </div>
              <div className="rf-marquee-row rf-marquee-row-3">
                <div className="rf-marquee-track">
                  {marqueeRow3.map((ind, i) => (
                    <span key={`r3a-${i}`} className={`rf-marquee-item${ind.highlight ? ' rf-marquee-item-hl' : ''}`}>{ind.text}</span>
                  ))}
                  {marqueeRow3.map((ind, i) => (
                    <span key={`r3b-${i}`} className={`rf-marquee-item${ind.highlight ? ' rf-marquee-item-hl' : ''}`} aria-hidden="true">{ind.text}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="trust" style={{ justifyContent:'center', marginTop:'2.5rem' }}>
              <div className="trust-i">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>{"30 vari\u00e1veis cl\u00ednicas"}</span>
              </div>
              <div className="trust-i">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Resultado imediato</span>
              </div>

            </div>

            {/* Cr\u00e9ditos: mesma fonte/cor do rodap\u00e9 */}
            <p style={{ fontSize:'0.75rem', color:'var(--text-light)', textAlign:'center', margin:'0.6rem 0 0', letterSpacing:'-0.01em' }}>
              <span style={{ fontFamily:"'DM Serif Display',serif", color:'var(--wine)' }}>Red<em style={{color:'var(--cherry)',fontStyle:'normal'}}>Fairy</em><sup style={{ color: 'var(--cherry)', fontSize: '0.45em', fontWeight: 500, verticalAlign: 'super', marginLeft: '1px' }}>{"\u00ae"}</sup></span>
              {" by "}<a href="https://cytomica.com" target="_blank" rel="noopener noreferrer" style={{color:'var(--text-sec)'}}>cytomica.com</a>{"  \u00b7  \u00a9 2026  \u00b7  E.F. Ramos, M.D. CRM 6302|BA"}
            </p>

          </div>

          <div className="hero-visual reveal" style={{ transitionDelay:'0.15s' }}>



          </div>
        </div>

        {/* CSS do marquee de indicacoes (3 linhas, scroll infinito) */}
        <style>{`
          @keyframes rfMarqueeScroll {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          .rf-marquee {
            width: 100%;
            max-width: 800px;
            margin: 1.4rem auto 0.6rem;
            display: flex;
            flex-direction: column;
            gap: 0.55rem;
            overflow: hidden;
            mask-image: linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%);
            -webkit-mask-image: linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%);
          }
          .rf-marquee-row {
            overflow: hidden;
            width: 100%;
          }
          .rf-marquee-track {
            display: inline-flex;
            white-space: nowrap;
            gap: 2.4rem;
            padding-right: 2.4rem;
            animation: rfMarqueeScroll linear infinite;
            will-change: transform;
          }
          .rf-marquee-row-1 .rf-marquee-track { animation-duration: 38s; }
          .rf-marquee-row-2 .rf-marquee-track { animation-duration: 46s; animation-direction: reverse; }
          .rf-marquee-row-3 .rf-marquee-track { animation-duration: 32s; }
          .rf-marquee-item {
            color: #6B7280;
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .rf-marquee-item-hl {
            color: #ef4444;
            font-weight: 900;
          }
          @media (max-width: 720px) {
            .rf-marquee-item { font-size: 0.66rem; }
            .rf-marquee-track { gap: 1.6rem; padding-right: 1.6rem; }
          }
        `}</style>
      </section>


      <section className="filosofia" id="filosofia" style={{ display: showFilosofia ? 'block' : 'none', position: 'relative' }}>
        <div className="container">
          <div className="reveal">
            <span className="tag">Filosofia</span>
          </div>
          <div className="filosofia-grid">
            <div className="reveal">
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
                    {"Vida \u00e9 ventila\u00e7\u00e3o e perfus\u00e3o. \u00c9 a sua "}<span style={{ color:'#DC2626' }}>Hemoglobina</span>{" que faz isso."}
                  </h1>
                  <p style={{ fontStyle:'normal', fontWeight:700, fontSize:'0.9rem', color:'#7B1E1E', lineHeight:1.6 }}>
                    Cuide dela. Saiba mais:
                  </p>
                </div>
              </div>
              <div style={{ padding:'0.5rem 0' }}>
                <p style={{ fontSize:'0.9rem', color:'var(--text-sec)', lineHeight:1.8, marginBottom:'0.8rem', fontWeight:600 }}>{"Com Ferro, a Natureza faz a Hemoglobina, a prote\u00edna vermelha e mais importante da sua vida."}</p>
                <p style={{ fontSize:'0.9rem', color:'var(--text-sec)', lineHeight:1.8, marginBottom:'0.8rem', fontWeight:600 }}>{"Ela sustenta a ventila\u00e7\u00e3o e realiza a perfus\u00e3o: capta o oxig\u00eanio do ar que ventila os pulm\u00f5es e o entrega a todas as suas c\u00e9lulas \u2014 vinte vezes por minuto."}</p>
                <p style={{ fontSize:'0.9rem', color:'var(--text-sec)', lineHeight:1.8, marginBottom:'0.8rem', fontWeight:600 }}>{"Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento em suas c\u00e9lulas, e o leva aos seus pulm\u00f5es para que voc\u00ea o expire no ar do mundo."}</p>
                <p style={{ fontSize:'0.9rem', color:'var(--text-sec)', lineHeight:1.8, fontWeight:600 }}>{"No ambiente, uma prote\u00edna verde \u2014 a clorofila, m\u00e3e da Hemoglobina \u2014 usa a luz do sol para partir o CO2 e fazer a\u00e7\u00facar a partir de carbono e \u00e1gua, devolvendo o oxig\u00eanio ao ar do planeta, em um ciclo virtuoso perfeito."}</p>
              </div>
            </div>
            <div className="reveal" style={{ transitionDelay:'0.1s' }}>
              <div className="cycle-card" style={{ height:'100%' }}>
                <h4>O ciclo da vida</h4>
                <div className="cycle-step">
                  <div className="icon">{"\u2b50"}</div>
                  <div className="desc">{"Ferro \u2014 \u00e9 poeira das estrelas, d\u00e1 poder ao seu sangue."}</div>
                </div>
                <div className="cycle-step">
                  <div className="icon"><img src={logo} className="fairy-mini" alt="Fadinha" /></div>
                  <div className="desc">{"Hemoglobina \u2014 A fada vermelha, que com o ferro faz voc\u00ea respirar."}</div>
                </div>
                <div className="cycle-step">
                  <div className="icon">{"\ud83e\udeC1"}</div>
                  <div className="desc">{"Ventila\u00e7\u00e3o \u2014 Ela capta o oxig\u00eanio do ar, 20x por minuto."}</div>
                </div>
                <div className="cycle-step">
                  <div className="icon" style={{ color:'#DC2626' }}>{"\u2764\ufe0f"}</div>
                  <div className="desc">{"Perfus\u00e3o \u2014 Ela entrega oxig\u00eanio a cada c\u00e9lula do corpo e capta o g\u00e1s carb\u00f4nico do metabolismo."}</div>
                </div>
                <div className="cycle-step">
                  <div className="icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.8">
                      <path d="M17.8 2c-1.5 0-3 .5-4.3 1.4C12.5 2 11.5 1.5 10.3 1.5 7.5 1.5 5 4 5 7c0 .5.1 1 .2 1.5C3.2 10 2 12.5 2 15.5 2 20 5.5 22 9 22c1.5 0 3-.5 4-1.5 1 1 2.5 1.5 4 1.5 3.5 0 7-2 7-6.5 0-3-1.2-5.5-3.2-7"/>
                      <path d="M12 22V8" strokeWidth="1.5"/><path d="M12 12l4-3" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 15l-3-2.5" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="desc">{"Clorofila \u2014 No meio ambiente, a m\u00e3e verde recicla o g\u00e1s carb\u00f4nico em oxig\u00eanio."}</div>
                </div>
                <div className="cycle-step">
                  <div className="icon" style={{ color:'#3B82F6' }}>{"\u267b\ufe0f"}</div>
                  <div className="desc">{"Ciclo perfeito \u2014 O vermelho e o verde sustentam a vida no planeta azul."}</div>
                </div>
              </div>
            </div>
          </div>

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
                transition: 'all 0.2s', fontFamily: "'Apple Color Emoji', 'Segoe UI Symbol', 'Noto Sans Symbols', sans-serif",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              {"\u2715"}
            </button>
          </div>
        </div>
      </section>

      <section className="filosofia" id="sobre" style={{ display: showSobre ? 'block' : 'none', position: 'relative' }}>
        <div className="container">
          <div className="reveal">
            <span className="tag">Sobre</span>
            <h2 className="stitle" style={{ fontSize: '1.6rem' }}>RedFairy<sup style={{ color: 'var(--cherry)', fontSize: '0.45em', fontWeight: 500, verticalAlign: 'super', marginLeft: '1px' }}>{"\u00ae"}</sup> | OBA</h2>
          </div>

          <div className="reveal" style={{ marginTop: '1.5rem', maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>RedFairy<sup style={{ color: 'var(--cherry)', fontSize: '0.65em', fontWeight: 500 }}>{"\u00ae"}</sup></strong>{" e o "}<strong style={{ color: 'var(--wine)', fontWeight: 700 }}>{"Projeto OBA"}<sup style={{ fontSize: '0.65em', fontWeight: 500 }}>TM</sup>{" \u2014 Otimizar o Bari\u00e1trico"}</strong>{" representam uma iniciativa institucional de "}<strong style={{ color: 'var(--wine)', fontWeight: 700 }}>{"Cytomica"}<sup style={{ fontSize: '0.65em', fontWeight: 500 }}>{"\u00ae"}</sup></strong>{", com forte compromisso \u00e9tico e social, voltada \u00e0 melhoria da qualidade de vida de pacientes com doen\u00e7as e condi\u00e7\u00f5es cr\u00f4nicas ou agudas que afetam a produ\u00e7\u00e3o de hemoglobina e de c\u00e9lulas vermelhas. Entre eles, destacam-se os pacientes bari\u00e1tricos, que frequentemente demandam aten\u00e7\u00e3o cl\u00ednica especializada."}
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              {"A iniciativa oferece "}<strong>{"avalia\u00e7\u00f5es iniciais gratuitas"}</strong>{", acionadas por m\u00e9dicos com o apoio de um algoritmo m\u00e9dico avan\u00e7ado, seguidas, quando necess\u00e1rio, de acompanhamento acess\u00edvel, com suporte de intelig\u00eancia artificial e assist\u00eancia m\u00e9dica por telemedicina."}
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              {"Desenvolvido ao longo de anos sob a orienta\u00e7\u00e3o do "}<strong style={{ color: 'var(--wine)', fontWeight: 700 }}>{"Dr. Est\u00e1cio Ferreira Ramos"}</strong>{", hematologista e pesquisador, o projeto re\u00fane rigor m\u00e9dico, inova\u00e7\u00e3o e prop\u00f3sito social."}
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.8rem' }}>
              {"O empreendimento inclui ainda um "}<strong style={{ color: 'var(--wine)', fontWeight: 700 }}>{"Programa de Afiliados Patrocinado"}</strong>{", destinado a ampliar o alcance da iniciativa e favorecer o acesso de um n\u00famero crescente de pacientes \u00e0 avalia\u00e7\u00e3o e ao cuidado."}
            </p>

            <p style={{ textAlign: 'center', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: '0.5rem 0 0', letterSpacing: '0.5px' }}>
              Explore. Entenda. Compartilhe.
            </p>

          </div>

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
                transition: 'all 0.2s', fontFamily: "'Apple Color Emoji', 'Segoe UI Symbol', 'Noto Sans Symbols', sans-serif",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              {"\u2715"}
            </button>
          </div>
        </div>
      </section>

      <section className="filosofia" id="afiliados" style={{ display: showAfiliados ? 'block' : 'none', position: 'relative' }}>
        <div className="container">
          <div className="reveal">
            <span className="tag">Afiliados</span>
            <h2 className="stitle" style={{ fontSize: '1.6rem' }}>Programa de Afiliados</h2>
          </div>

          <div className="reveal" style={{ marginTop: '1.5rem', maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              {"O "}<strong style={{ color: 'var(--wine)', fontWeight: 700 }}>{"Programa de Afiliados RedFairy"}<sup style={{ color: 'var(--cherry)', fontSize: '0.65em', fontWeight: 500 }}>{"\u00ae"}</sup>{" | OBA"}</strong>{" est\u00e1 aberto ao apoio de "}<strong>{"empresas, filantropos, organiza\u00e7\u00f5es sociais e funda\u00e7\u00f5es"}</strong>{" comprometidos com a amplia\u00e7\u00e3o do acesso \u00e0 iniciativa."}
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              {"Seu objetivo \u00e9 estimular e reconhecer "}<strong style={{ color: 'var(--wine)', fontWeight: 700 }}>{"m\u00e9dicos"}</strong>{" que contribuam para expandir seu alcance, seja por meio de avalia\u00e7\u00f5es, seja por a\u00e7\u00f5es, ideias e iniciativas de difus\u00e3o. Ao realizar a primeira avalia\u00e7\u00e3o de um paciente, o m\u00e9dico j\u00e1 pode optar por integrar o Programa."}
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.8rem' }}>
              {"Apoiar o programa \u00e9 fortalecer o acesso de pessoas com condi\u00e7\u00f5es ligadas ao "}<strong>{"ferro e \u00e0 hemoglobina"}</strong>{" a mais sa\u00fade, desempenho e qualidade de vida."}
            </p>

            <p style={{ textAlign: 'center', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: '0.5rem 0 0', letterSpacing: '0.3px' }}>
              {"Quer participar? "}
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
              {". Ser\u00e1 um prazer acolher seu apoio."}
            </p>

          </div>

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
                transition: 'all 0.2s', fontFamily: "'Apple Color Emoji', 'Segoe UI Symbol', 'Noto Sans Symbols', sans-serif",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              {"\u2715"}
            </button>
          </div>
        </div>
      </section>


      <section id="indicacoes" style={{ background:'var(--gray-bg)', padding:'5rem 1.25rem' }}>
        <div className="container">
          <div className="reveal center">
            <span className="tag">{"Indica\u00e7\u00f5es"}</span>
            <h2 className="stitle" style={{ fontSize: '1.6rem' }}>{"Para quem \u00e9 o RedFairy"}<sup style={{ color: '#000', fontSize: '0.7em', fontWeight: 600, verticalAlign: 'super', marginLeft: '2px' }}>{"\u00ae"}</sup>{"?"}</h2>
          </div>
          <div className="reveal" style={{ maxWidth: 880, margin: '1.5rem auto 0', lineHeight: 1.7, color: 'var(--text-sec)', fontSize: '0.88rem', fontWeight: 600, textAlign: 'justify' }}>
            <p style={{ marginBottom: '1.1rem' }}>
              {"No Brasil, anemia, defici\u00eancia de ferro e dist\u00farbios gen\u00e9ticos ou adquiridos da hemoglobina, das hem\u00e1cias e do seu metabolismo, atingem dezenas de milh\u00f5es de pessoas \u2014 incluindo crian\u00e7as, idosos, gestantes, vegetarianos, bari\u00e1tricos, gastrectomizados, doadores de sangue, pessoas com sangramentos cr\u00f4nicos, uso de testosterona, abuso de \u00e1lcool, doen\u00e7a cel\u00edaca, defici\u00eancia de G-6-PD, sobrecarga de ferro ou necessidade de sangrias terap\u00eauticas. Em conjunto, essas condi\u00e7\u00f5es envolvem mais de "}<strong style={{ color: 'var(--wine)' }}>{"55 milh\u00f5es de brasileiros"}</strong>{" que vivem sob dano hematol\u00f3gico-nutricional relevante, muitos sem acesso poss\u00edvel a avalia\u00e7\u00e3o especializada."}
            </p>
            <p style={{ marginBottom: '1.1rem' }}>
              <strong style={{ color: 'var(--wine)' }}>{"RedFairy"}<sup style={{ color: 'var(--cherry)', fontSize: '0.65em', fontWeight: 500 }}>{"\u00ae"}</sup>{" | OBA"}</strong>{" transforma o hemograma em uma porta de entrada inteligente para triagem, orienta\u00e7\u00e3o diagn\u00f3stica, seguimento estruturado e cuidado m\u00e9dico em hematologia para essas condi\u00e7\u00f5es. Em um pa\u00eds continental, desigual e com car\u00eancia de hematologistas em extensas regi\u00f5es, o sistema ocupa uma lacuna assistencial com orienta\u00e7\u00e3o m\u00e9dica fundamentada, solicita\u00e7\u00e3o de exames e prescri\u00e7\u00f5es emitidas por hematologistas atrav\u00e9s da Plataforma do Conselho Federal de Medicina."}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              {"Para ampliar essa rede de cuidado, "}<strong style={{ color: 'var(--wine)' }}>{"RedFairy"}<sup style={{ color: 'var(--cherry)', fontSize: '0.65em', fontWeight: 500 }}>{"\u00ae"}</sup>{" | OBA"}</strong>{" inclui o 4DOC - Programa de Afiliados Patrocinado para M\u00e9dicos, que reconhece e apoia profissionais que identificam pacientes afetados e os orientam a se cadastrar no sistema, gerando cr\u00e9ditos institucionais vinculados ao encaminhamento e fortalecendo a triagem, a preven\u00e7\u00e3o, a redu\u00e7\u00e3o de sequelas, e o diagn\u00f3stico precoce de hemopatias no Brasil."}
            </p>
            {medicoLogado && (
              <p style={{ textAlign: 'center', margin: '1.2rem 0 0', cursor: 'pointer' }}
                 onClick={() => document.getElementById('info-epidemio')?.scrollIntoView({ behavior:'smooth' })}>
                <span style={{ color:'#7B1E1E', fontSize:'0.78rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1.5px', borderBottom:'1.5px solid #7B1E1E', paddingBottom:'2px' }}>
                  {"Informa\u00e7\u00f5es Epidemiol\u00f3gicas & T\u00e9cnicas \u2192"}
                </span>
              </p>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'center', marginTop:'1.8rem' }}>
            <a href="#oba" className="oba-home-btn" style={{ padding:'0.7rem 1.5rem' }}>
              <span className="oba-title">Projeto OBA</span>
              <span className="oba-sub">{"Otimizar o Bari\u00e1trico"}</span>
              <span className="oba-link">{"Saiba mais \u2192"}</span>
            </a>
          </div>
        </div>
      </section>

      <section className="terapeutica">
        <div className="container">
          <div className="reveal center">
            <span className="tag">{"Orienta\u00e7\u00f5es Terap\u00eauticas"}</span>
            <h2 className="stitle" style={{ fontSize: '1.6rem' }}>{"Muito al\u00e9m do diagn\u00f3stico"}</h2>
            <p className="sdesc-bold" style={{ margin:"0 auto" }}>
              {"O RedFairy"}<sup style={{ color: 'var(--cherry)', fontSize: '0.55em', fontWeight: 500 }}>{"\u00ae"}</sup>{" \u00e9 um algoritmo m\u00e9dico, que n\u00e3o apenas avalia: ele orienta."}<br />
              {"Gera recomenda\u00e7\u00f5es personalizadas com base no perfil completo do paciente."}
            </p>
          </div>
          <div className="terap-grid reveal">
            <div className="terap-card"><div className="tc-icon">{"\ud83d\udc89"}</div><h4>{"INFUS\u00d5ES | FERRO ENDOVENOSO"}</h4><p>{"Prescri\u00e7\u00e3o m\u00e9dica do medicamento adequado, doses, n\u00famero de aplica\u00e7\u00f5es e intervalos ideais."}</p></div>
            <div className="terap-card"><div className="tc-icon">{"\ud83e\ude78"}</div><h4>{"SANGRIAS TERAP\u00caUTICAS"}</h4><p>{"N\u00famero de sess\u00f5es, volumes e intervalos para abordagem de sideroses e poliglobulia."}</p></div>
            <div className="terap-card"><div className="tc-icon">{"\ud83d\udc8a"}</div><h4>{"REPOSI\u00c7\u00c3O | FERRO ORAL"}</h4><p>{"Prescri\u00e7\u00e3o m\u00e9dica do medicamento ideal, dose e dura\u00e7\u00e3o ajustada do tratamento."}</p></div>
            <div className="terap-card"><div className="tc-icon">{"\ud83d\udcc8"}</div><h4>{"GR\u00c1FICOS CL\u00cdNICOS"}</h4><p>{"Visualiza\u00e7\u00e3o e follow-up da evolu\u00e7\u00e3o."}</p></div>
          </div>
        </div>
      </section>

      <section className="como" id="como-funciona">
        <div className="container">
          <div className="center reveal">
            <span className="tag">Como Funciona</span>
            <h2 className="stitle" style={{ fontSize: '1.6rem' }}>{"Simples para m\u00e9dicos e pacientes"}</h2>
          </div>
          <div className="como-tabs-wrap reveal">
            <div className="como-tabs">
              <button className={`como-tab${activeTab === 'medico' ? ' active' : ''}`} onClick={() => setActiveTab('medico')}><span>{"Para M\u00e9dicos"}</span></button>
              <button className={`como-tab paciente${activeTab === 'paciente' ? ' active' : ''}`} onClick={() => setActiveTab('paciente')}>Para Pacientes</button>
            </div>
          </div>
          <div className="como-content">
            {activeTab === 'medico' && (
              <div>
                <div className="flow">
                  <div className="flow-step medico"><div className="flow-num">1</div><h4>{"Acesse o Modo M\u00e9dico"}<br/><span style={{ fontSize:"0.6rem", fontWeight:700, letterSpacing:"1.5px", color:"var(--cherry)", textTransform:"uppercase" }}>{"M\u00e9dicos"}</span></h4><p>{"Gratuito, sem cadastro. Use o seu CRM para acesso imediato \u00e0 calculadora cl\u00ednica."}</p></div>
                  <div className="flow-step medico"><div className="flow-num">2</div><h4>Insira o CPF do paciente</h4><p>{"\u00danica informa\u00e7\u00e3o de identifica\u00e7\u00e3o. Vincula os dados ao paciente automaticamente."}</p></div>
                  <div className="flow-step medico"><div className="flow-num">3</div><h4>{"Preencha os par\u00e2metros"}</h4><p>{"Apenas cinco par\u00e2metros laboratoriais e algumas caixinhas com dados cl\u00ednicos."}</p></div>
                  <div className="flow-step medico"><div className="flow-num">4</div><h4>Avalie e oriente</h4><p>{"Diagn\u00f3stico, orienta\u00e7\u00f5es terap\u00eauticas e dosagens em segundos."}</p></div>
                </div>
                <div style={{ margin:'1.5rem 0 0' }}>
                  <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.8rem' }} />
                  <p style={{ color:'#7B1E1E', fontSize:'0.95rem', fontWeight:600, textAlign:'center', margin:'0 0 0.3rem', lineHeight:1.5 }}>
                    {"Avalie um paciente e torne-se membro do Programa de Afiliados patrocinado."}
                  </p>
                  <p style={{ color:'#7B1E1E', fontSize:'0.85rem', fontWeight:500, textAlign:'center', margin:'0 0 0.3rem', lineHeight:1.5, opacity:0.9 }}>
                    {"Ao beneficiar pacientes, voc\u00ea tamb\u00e9m passa a auferir benef\u00edcios."}
                  </p>
                  <p style={{ color:'#991B1B', fontSize:'0.7rem', fontWeight:700, letterSpacing:'1px', textAlign:'center', margin:'0 0 0.6rem', textTransform:'uppercase', opacity:0.75 }}>
                    {"V\u00e1lido para m\u00e9dicos com registro no CRM"}
                  </p>
                  {medicoLogado && (
                    <p style={{ color:'#6B7280', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', margin:'0.4rem 0 0', cursor:'pointer' }}
                       onClick={() => document.getElementById('acesso')?.scrollIntoView({ behavior:'smooth' })}>
                      {"CONHE\u00c7A AS REGRAS"}
                    </p>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'paciente' && (
              <div>
                <div className="flow">
                  <div className="flow-step paciente"><div className="flow-num">1</div><h4>Informe seu CPF</h4><p>{"Se o seu m\u00e9dico j\u00e1 fez a primeira avalia\u00e7\u00e3o, seus dados j\u00e1 estar\u00e3o aqui. Se ele n\u00e3o fez, voc\u00ea mesmo faz. Tenha em m\u00e3os o seu Hemograma, a Ferritina e a Satura\u00e7\u00e3o da Transferrina."}</p></div>
                  <div className="flow-step paciente"><div className="flow-num">2</div><h4>{"Complete ou Fa\u00e7a um Novo Cadastro"}</h4><p>{"Cadastro simples com e-mail, senha e celular. R\u00e1pido e seguro."}</p></div>
                  <div className="flow-step paciente"><div className="flow-num">3</div><h4>Assine via PIX</h4><p>{"R$ 149,90/ano via QR Code, Chave PIX ou Copie e Cole."}</p></div>
                  <div className="flow-step paciente"><div className="flow-num">4</div><h4>Acompanhe seu eritron</h4><p>{"Novas avalia\u00e7\u00f5es geram o gr\u00e1fico multiparam\u00e9trico da sua sa\u00fade eritrocit\u00e1ria."}</p></div>
                </div>
                <div className="patient-features">
                  <div className="pf-card">
                    <svg className="pf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <h4>{"Gr\u00e1fico evolutivo"}</h4>
                    <p>{"Acompanhe a evolu\u00e7\u00e3o dos par\u00e2metros ao longo do tempo em um painel visual."}</p>
                  </div>
                  <div className="pf-card">
                    <svg className="pf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <polyline points="9 15 11 17 15 13"/>
                    </svg>
                    <h4>{"Orienta\u00e7\u00f5es claras e Prescri\u00e7\u00f5es"}</h4>
                    <p>{"Resultados em linguagem acess\u00edvel, com recomenda\u00e7\u00f5es pr\u00e1ticas, emiss\u00e3o de receitas m\u00e9dicas, e pedidos de exames."}</p>
                    <p style={{marginTop:'0.6rem', display:'flex', alignItems:'flex-start', gap:'0.4rem'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" style={{flexShrink:0, marginTop:'2px'}}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#DC2626"/>
                        <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="12" y1="17" x2="12.01" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span style={{color:'#5C1515', fontSize:'0.78rem', fontWeight:600}}>{"ATEN\u00c7\u00c3O: Haver\u00e1 uma pequena taxa a pagar pela emiss\u00e3o de receitas m\u00e9dicas e pedidos de exames."}</span>
                    </p>
                  </div>
                  <div className="pf-card">
                    <svg className="pf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      <path d="M18.364 5.636a9 9 0 0 1 0 12.728" strokeDasharray="2 2"/>
                    </svg>
                    <h4>{"Conectado ao seu m\u00e9dico"}</h4>
                    <p>{"A avalia\u00e7\u00e3o do m\u00e9dico j\u00e1 est\u00e1 no seu perfil quando voc\u00ea se cadastrar."}</p>
                  </div>
                </div>
                <div className="pricing-box">
                  <div className="price">{"R$ 149,90"}</div>
                  <div className="price-sub">{"Por um ano de avalia\u00e7\u00f5es na plataforma"}</div>
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

      <section id="avaliar" style={{ background:'white', padding:'5.5rem 2rem' }}>
        <div className="container">
          <div className="center reveal" style={{ marginBottom:'2.5rem' }}>
            <span className="tag">Experimente Agora</span>
            <h2 className="stitle" style={{ fontSize: '1.6rem' }}>{"Fa\u00e7a uma avalia\u00e7\u00e3o gratuita"}</h2>
            <p className="sdesc" style={{ margin:'0 auto' }}>{"Sem cadastro. Insira os dados e veja o diagn\u00f3stico."}</p>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ width:320, background:'#1A1A2E', borderRadius:40, border:'8px solid #2A2A3E', boxShadow:'0 0 0 2px #111, inset 0 0 0 1px rgba(255,255,255,0.05)', overflow:'hidden' }}>

              <div style={{ background:'#111', height:26, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:60, height:13, background:'#1A1A2E', borderRadius:'0 0 10px 10px' }} />
              </div>
              <div style={{ background:'#0F0F1A', padding:'3px 16px', display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:9 }}>9:41</span>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:9 }}>{"\u25ae\u25ae\u25ae \ud83d\udd0b"}</span>
              </div>
              <div style={{ background:'linear-gradient(135deg,#7B1E1E,#DC2626)', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                <img src={logo} alt="RedFairy" style={{ height:24, objectFit:'contain', filter:'brightness(0) invert(1)' }} />
                <p style={{ color:'rgba(255,255,255,0.65)', fontSize:9, margin:0, letterSpacing:'0.5px' }}>Eritrog\u00eanese e Metabolismo do Ferro</p>
              </div>

              <div id="rf-screen" style={{ background:'#0F0F1A', height:540, overflowY:'auto' }}>

                <div id="rf-view-form" style={{ padding:11 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <div>
                      <label style={{ color:'#fff', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Sexo</label>
                      <select id="rf-sexo" style={{ width:'100%', background:'#e5e7eb', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'#000', fontSize:11, outline:'none' }}>
                        <option value="F">Feminino</option><option value="M">Masculino</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ color:'#fff', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Idade</label>
                      <input type="number" id="rf-idade" placeholder="35" style={{ width:'100%', background:'#e5e7eb', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'#000', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <div>
                      <label style={{ color:'#fff', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>HEMOGLOBINA g/dL</label>
                      <input type="number" id="rf-hb2" step="0.1" placeholder="12.5" style={{ width:'100%', background:'#e5e7eb', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'#000', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ color:'#fff', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Ferritina (ng/mL)</label>
                      <input type="number" id="rf-ferr2" step="0.1" placeholder="15" style={{ width:'100%', background:'#e5e7eb', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'#000', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <div>
                      <label style={{ color:'#fff', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>VCM / fL</label>
                      <input type="number" id="rf-vcm2" step="0.1" placeholder="82" style={{ width:'100%', background:'#e5e7eb', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'#000', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ color:'#fff', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>RDW-CV (%)</label>
                      <input type="number" id="rf-rdw2" step="0.1" placeholder="13.5" style={{ width:'100%', background:'#e5e7eb', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'#000', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <label style={{ color:'#fff', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>SATURA\u00c7\u00c3O DA TRANSFERRINA (%)</label>
                    <input type="number" id="rf-sat2" step="0.1" placeholder="25" style={{ width:'100%', background:'#e5e7eb', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'5px 6px', color:'#000', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                  </div>

                  <div style={{ marginBottom:10 }}>
                    <p style={{ color:'rgba(255,255,255,0.65)', fontSize:8, textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px' }}>{"Contexto Cl\u00ednico"}</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:6 }}>
                      {[['bariatrica',"Bari\u00e1trica"],['vegetariano','Vegetariano'],['perda','Hemorragia'],['alcoolista','Alcoolista'],['transfundido','Transfundido'],['hemoAlta','Hb Alta']].map(([k,l]) => (
                        <label key={k} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.28)', borderRadius:6, padding:'5px 6px', cursor:'pointer', fontSize:9, color:'rgba(255,255,255,0.7)' }}>
                          <input type="checkbox" id={`rf2-${k}`} style={{ width:10, height:10, accentColor:'#DC2626', flexShrink:0 }} /> {l}
                        </label>
                      ))}
                    </div>
                    <p style={{ color:'rgba(255,255,255,0.65)', fontSize:8, textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px' }}>Medicamentos</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                      {[['aspirina','Aspirina'],['b12','Vitamina B12'],['ferroOral','Ferro Oral'],['ferroEV','Ferro E.V. / I.M.']].map(([k,l]) => (
                        <label key={k} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.28)', borderRadius:6, padding:'5px 6px', cursor:'pointer', fontSize:9, color:'rgba(255,255,255,0.7)' }}>
                          <input type="checkbox" id={`rf2-${k}`} style={{ width:10, height:10, accentColor:'#DC2626', flexShrink:0 }} /> {l}
                        </label>
                      ))}
                    </div>
                  </div>

                  <p id="rf-erro2" style={{ color:'#F87171', fontSize:10, margin:'0 0 6px', display:'none' }} />
                  <button onClick={() => rfAvaliar2()} style={{ width:'100%', background:'#7B1E1E', color:'white', border:'none', borderRadius:9, padding:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    {"\ud83d\udd2c Avaliar Eritron"}
                  </button>
                  <p style={{ color:'rgba(255,255,255,0.2)', fontSize:8, textAlign:'center', margin:'8px 0 0', letterSpacing:'0.3px' }}>
                    {"RedFairy"}<sup style={{ color: 'var(--cherry)', fontSize: '0.7em', fontWeight: 500 }}>{"\u00ae"}</sup>{" \u00b7 Cuidar do Seu Eritron \u00b7 by cytomica.com \u00a9 2026"}
                  </p>
                </div>

                <div id="rf-view-result" style={{ display:'none', padding:11 }}>
                  <div id="rf-result-header" style={{ borderRadius:'10px 10px 0 0', padding:'10px 12px' }}>
                    <p style={{ fontSize:8, color:'rgba(255,255,255,0.6)', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:1 }}>{"Diagn\u00f3stico"}</p>
                    <p id="rf-result-label" style={{ fontSize:13, fontWeight:700, color:'white', margin:0 }} />
                  </div>
                  <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'0 0 10px 10px', padding:'10px 12px', marginBottom:8 }}>
                    <p style={{ fontSize:8, color:'rgba(255,255,255,0.45)', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:1 }}>{"Diagn\u00f3stico"}</p>
                    <p id="rf-result-diag" style={{ fontSize:10, color:'white', margin:'0 0 10px', lineHeight:1.6 }} />
                    <p style={{ fontSize:8, color:'rgba(255,255,255,0.45)', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:1 }}>{"Recomenda\u00e7\u00e3o"}</p>
                    <p id="rf-result-rec" style={{ fontSize:10, color:'white', margin:0, lineHeight:1.6 }} />
                  </div>
                  <div style={{ background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'10px 12px', textAlign:'center', marginBottom:8 }}>
                    <p style={{ color:'rgba(255,255,255,0.55)', fontSize:9, margin:'0 0 6px' }}>{"Para orienta\u00e7\u00f5es completas com dosagens:"}</p>
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
                        {"Acessar RedFairy"}<sup style={{ color: 'var(--cherry)', fontSize: '0.7em', fontWeight: 500 }}>{"\u00ae"}</sup>{" completo \u2192"}
                      </button>
                  </div>
                  <button onClick={() => rfReset2()} style={{ width:'100%', background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.6)', border:'none', borderRadius:8, padding:8, fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                    {"\u2190 Nova avalia\u00e7\u00e3o"}
                  </button>
                </div>
              </div>

              <div style={{ background:'#0F0F1A', padding:7, display:'flex', justifyContent:'center' }}>
                <div style={{ width:70, height:3, background:'rgba(255,255,255,0.2)', borderRadius:2 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="oba" id="oba">
        <div className="container">
          <div className="reveal">
            <span className="tag">Projeto OBA</span>
            <h2 className="stitle">{"Otimizar o Bari\u00e1trico"}</h2>
            <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'1rem', maxWidth:580, lineHeight:1.7, fontWeight:700 }}>{"Milhares de bari\u00e1tricos vivem desassistidos. O Projeto OBA \u00e9 um sub-algoritmo especializado dentro do RedFairy"}<sup style={{ color: 'var(--cherry)', fontSize: '0.65em', fontWeight: 500 }}>{"\u00ae"}</sup>{" que cuida especificamente de quem fez cirurgia bari\u00e1trica."}</p>
          </div>
          <div className="oba-grid">
            <div className="oba-narrative reveal">
              <div className="oba-metaphor"><p>{"A cirurgia bari\u00e1trica corta as asas da sua fada vermelha."}<br />{"Ela continua com seus superpoderes, mas para voar precisa da ajuda do RedFairy"}<sup style={{ color: 'var(--cherry)', fontSize: '0.65em', fontWeight: 500 }}>{"\u00ae"}</sup>{"."}</p></div>
              <p>{"O bypass g\u00e1strico e a gastrectomia causam uma "}<strong>{"s\u00edndrome disabsortiva"}</strong>{" que prejudica a absor\u00e7\u00e3o de ferro, vitamina B12 e outros elementos essenciais."}</p>
              <p>{"O Projeto OBA oferece um "}<strong>{"tratamento de manuten\u00e7\u00e3o indefinido"}</strong>{": monitoramento cont\u00ednuo, c\u00e1lculo de reposi\u00e7\u00e3o personalizado e orienta\u00e7\u00f5es espec\u00edficas."}</p>
              <div className="oba-cta-row">
                <button className="btn btn-oba-main" onClick={() => {
                        localStorage.setItem('rf_flag', 'bariatrica')
                        onModoPaciente && onModoPaciente()
                      }} style={{ flexDirection:'column', gap:'0.2rem', alignItems:'center', animation:'pulse 1.5s ease-out infinite', margin:'0 auto', display:'flex', border:'2px solid rgba(220,38,38,0.8)' }}>
                  <span>{"Sou Bari\u00e1trico \u2014 Come\u00e7ar"}</span>
                  <span style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'1px', opacity:0.8, fontWeight:700 }}>{"Siga as Instru\u00e7\u00f5es"}</span>
                </button>
              </div>
            </div>
            <div className="oba-features reveal" style={{ transitionDelay:'0.1s' }}>
              <div className="oba-feat"><div className="of-icon">{"\ud83d\udd2c"}</div><div><h4>Mini-anamnese especializada</h4><p>{"Informa\u00e7\u00f5es adicionais para que o algoritmo cuide de voc\u00ea especificamente."}</p></div></div>
              <div className="oba-feat"><div className="of-icon">{"\ud83d\udc8a"}</div><div><h4>{"Reposi\u00e7\u00e3o personalizada"}</h4><p>{"C\u00e1lculo de ferro, B12 e outros elementos prejudicados pela s\u00edndrome disabsortiva."}</p></div></div>
              <div className="oba-feat"><div className="of-icon">{"\ud83d\udcc8"}</div><div><h4>{"Monitoramento cont\u00ednuo"}</h4><p>{"Evolu\u00e7\u00e3o dos par\u00e2metros com gr\u00e1ficos e alertas personalizados."}</p></div></div>
              <div className="oba-feat"><div className="of-icon">{"\ud83d\udcb0"}</div><div><h4>{"Muito mais acess\u00edvel"}</h4><p>{"Custa uma fra\u00e7\u00e3o do acompanhamento m\u00e9dico tradicional recorrente."}</p></div></div>
              <div className="oba-feat"><div className="of-icon">{"\ud83d\udd17"}</div><div><h4>{"Manuten\u00e7\u00e3o indefinida"}</h4><p>{"O bari\u00e1trico precisa de cuidado cont\u00ednuo. O RedFairy"}<sup style={{ color: 'var(--cherry)', fontSize: '0.65em', fontWeight: 500 }}>{"\u00ae"}</sup>{" est\u00e1 sempre ao seu lado."}</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-final" id="acesso">
        <div className="container">
          <div className="center reveal" style={{ marginBottom:'2.5rem' }}>
            <span className="tag">Comece Agora</span>
            <h2 style={{ fontSize:'1.6rem', fontWeight:800, color:'#000', marginBottom:'0.8rem' }}>{"Cuidar da Hemoglobina \u00e9 cuidar da Vida"}</h2>
          </div>
          <div className="cta-cards reveal">
            <div className="cta-c cta-doc">
              <div className="ci">{"\ud83e\ude7a"}</div>
              <h3>{"Modo M\u00e9dico"}</h3>
              <p>{"Algoritmo poderoso e simples: com apenas o CPF e poucos dados do paciente voc\u00ea faz uma triagem e pode aprofundar a avalia\u00e7\u00e3o, e obt\u00e9m orienta\u00e7\u00f5es para melhor diagn\u00f3stico e tratamento."}</p>
              <ul>
                <li>{"Acesso 100% gratuito para m\u00e9dicos"}</li>
                <li>{"Cadastro m\u00ednimo"}</li>
                <li>{"Orienta\u00e7\u00f5es fundamentadas"}</li>
                <li>{"Programa 4DOC de benef\u00edcios para afiliados"}</li>
              </ul>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', marginTop:'auto' }}>
                <button onClick={() => {
                  // Se medico ja logado, vai direto pro Calculator (entra como antes).
                  // Senao, abre a caixa "DIGITE O SEU CRM \u2794 UF" na hero e scrolla pra cima.
                  if (medicoLogado) { entrarLogadoDireto(); return; }
                  irPara('medico');
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform='scale(1.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
                  style={{ width:72, height:72, borderRadius:'50%', background:'#d1d5db', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontWeight:900, letterSpacing:'1px', textAlign:'center', padding:0, transition:'transform 0.15s ease', border:'4px solid #ef4444', color:'#ef4444', fontSize:'0.62rem', animation:'pulseSoftRed 2s ease-in-out infinite' }}>
                  {"M\u00c9DICO"}
                </button>
                <span style={{ fontSize:'0.62rem', fontWeight:700, letterSpacing:'1.5px', color:'#ef4444' }}>ENTRE</span>
              </div>
            </div>
            <div className="cta-c cta-pat">
              <div className="ci">{"\u2764\ufe0f"}</div>
              <h3>Modo Paciente</h3>
              <p>{"Cadastre-se e acompanhe a evolu\u00e7\u00e3o dos seus exames ao longo do tempo. Reduza a necessidade de consultas m\u00e9dicas. Economize, evite agendamentos, e reduza tempo e o custo dos deslocamentos."}</p>
              <ul>
                <li>{"A primeira avalia\u00e7\u00e3o pode ser feita por seu m\u00e9dico, ou por voc\u00ea"}</li>
                <li>{"Obtenha pedidos de exames e receitas m\u00e9dicas"}</li>
                <li>{"Orienta\u00e7\u00f5es em linguagem acess\u00edvel"}</li>
                <li>{"Apenas R$ 149,90 por ano, via PIX"}</li>
              </ul>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', marginTop:'auto' }}>
                <button onClick={() => {
                  // Mesma logica do botao PACIENTE da escolha hero (linha ~1258).
                  // Se ja esta logado, vai direto pro dashboard. Senao, abre a caixa
                  // "DIGITE O SEU CPF" na hero e scrolla pra cima.
                  let temPacienteIdLive = false;
                  try { temPacienteIdLive = !!localStorage.getItem('paciente_id'); } catch (e) {}
                  if (pacienteLogadoFlag && !temPacienteIdLive) {
                    setPacienteLogadoFlag(false);
                    setPacienteLogado('');
                  } else if (pacienteLogadoFlag && temPacienteIdLive) {
                    onIrDashboardPaciente && onIrDashboardPaciente();
                    return;
                  }
                  irPara('paciente');
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform='scale(1.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
                  style={{ width:72, height:72, borderRadius:'50%', background:'#d1d5db', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontWeight:900, letterSpacing:'1px', textAlign:'center', padding:0, transition:'transform 0.15s ease', border:'4px solid #1f2937', color:'#1f2937', fontSize:'0.62rem', animation:'pulseSoftLight 2s ease-in-out infinite', animationDelay:'1s' }}>
                  PACIENTE
                </button>
                <span style={{ fontSize:'0.62rem', fontWeight:700, letterSpacing:'1.5px', color:'rgba(255,255,255,0.85)' }}>ENTRE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ padding:'0.8rem 1rem', borderTop:'1px solid var(--border)', textAlign:'center' }}>
        <p style={{ fontSize:'0.65rem', color:'var(--text-light)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', margin:0, letterSpacing:'-0.01em' }}>
          <img src={logo} alt="" style={{ height:14, verticalAlign:'middle', marginRight:4 }} />
          <span style={{ fontFamily:"'DM Serif Display',serif", color:'var(--wine)' }}>Red<em style={{color:'var(--cherry)',fontStyle:'normal'}}>Fairy</em><sup style={{ color: 'var(--cherry)', fontSize: '0.45em', fontWeight: 500, verticalAlign: 'super', marginLeft: '1px' }}>{"\u00ae"}</sup></span>
          {" \u00b7 by "}<a href="https://cytomica.com" style={{color:'var(--text-sec)'}}>cytomica.com</a>{" \u00a9 2026 \u00b7 E.F. Ramos, M.D. CRM 6302 BA \u00b7 "}<a href="https://drestacioramos.com.br" style={{color:'var(--text-sec)'}}>drestacioramos.com.br</a>
        </p>
      </footer>

      {tcAberto && (
        <TermosModal tipo={tcAberto} onFechar={() => setTcAberto(null)} />
      )}

    </div>
  )
}
