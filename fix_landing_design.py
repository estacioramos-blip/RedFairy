lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# ── 1. Hero: fundo branco (remover gradient com gray-bg) ─────────────────────
old = "  .hero { min-height: auto; display: flex; align-items: center; padding: 5.5rem 2rem 1.5rem; background: linear-gradient(170deg, var(--white) 0%, var(--gray-bg) 45%, var(--white) 100%); position: relative; overflow: hidden; }"
new = "  .hero { min-height: auto; display: flex; align-items: center; padding: 5.5rem 2rem 1.5rem; background: var(--white); position: relative; overflow: hidden; }"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: hero fundo branco')
else: fixed.append('ERRO: hero background')

# ── 2. Fada menor 20% (260px → 208px) ────────────────────────────────────────
old = "  .fairy-showcase { width: 260px; height: 260px; }"
new = "  .fairy-showcase { width: 208px; height: 208px; }"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: fada 20% menor')
else: fixed.append('ERRO: fairy-showcase size')

# ── 3. Remover hero-badge (faixa preta) do JSX ───────────────────────────────
old = """            <div className="hero-badge">
              <div className="badge-main">
                <div className="dot" />
                Doutor* — Profissional de Saúde
              </div>
              <span className="badge-sub" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior:'smooth' })}>
                Conheça as regras
              </span>
            </div>
            <p className="hero-badge-sub" style={{ textAlign:'center', width:'100%' }}>
              Você vai precisar de algumas informações do eritrograma:<br />
              Hemoglobina · VCM · RDW + Ferritina e Saturação da Transferrina
            </p>"""
new = ""
if old in txt: txt = txt.replace(old, new); fixed.append('OK: hero-badge removido')
else: fixed.append('ERRO: hero-badge JSX')

# ── 4. Adicionar dupla linha vermelha + texto afiliados abaixo dos botões ─────
old = """            <div className="trust">"""
new = """            {/* Dupla linha vermelha + texto afiliados */}
            <div style={{ margin:'0.5rem 0 0.8rem', textAlign:'center' }}>
              <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.5rem' }} />
              <p style={{ color:'#1F2937', fontSize:'0.88rem', fontWeight:600, margin:'0.3rem 0 0.2rem' }}>
                Avalie um paciente e torne-se membro do Programa de Afiliados patrocinado.
              </p>
              <p style={{ color:'#6B7280', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', margin:'0.2rem 0 0.3rem' }}>
                VÁLIDO PARA PROFISSIONAIS DE SAÚDE COM REGISTRO EM CONSELHO
              </p>
              <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />
            </div>

            <div className="trust">"""
if old in txt: txt = txt.replace(old, new); fixed.append('OK: dupla linha + texto afiliados')
else: fixed.append('ERRO: dupla linha hero')

# ── 5. Filosofia: reduzir padding entre steps do ciclo da vida ────────────────
old = "  .cycle-step { display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem 0; border-bottom: 1px solid var(--border); }"
new = "  .cycle-step { display: flex; align-items: center; gap: 0.8rem; padding: 0.35rem 0; border-bottom: 1px solid var(--border); }"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: cycle-step padding menor')
else: fixed.append('ERRO: cycle-step padding')

# ── 6. Filosofia: diminuir padding-top da section ────────────────────────────
old = "  .filosofia { background: var(--gray-bg); color: var(--text); position: relative; padding-top: 2.5rem; padding-bottom: 3rem; }"
new = "  .filosofia { background: var(--gray-bg); color: var(--text); position: relative; padding-top: 1.5rem; padding-bottom: 2rem; }"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: filosofia padding menor')
else: fixed.append('ERRO: filosofia padding')

# ── 7. Indicações: bolinhas mais baixas (align-items: flex-end → center com padding-top) ──
old = "            <div className=\"ind\" style={{ alignItems:'flex-start' }}>\n              <span style={{ width:8, height:8, minWidth:8, borderRadius:'50%', background:'#EAB308', display:'block', flexShrink:0, marginTop:3 }} />"
new = "            <div className=\"ind\" style={{ alignItems:'flex-start' }}>\n              <span style={{ width:8, height:8, minWidth:8, borderRadius:'50%', background:'#EAB308', display:'block', flexShrink:0, marginTop:8 }} />"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: bolinha bariátrico mais baixa')
else: fixed.append('ERRO: bolinha bariátrico')

# ── 8. Terapêutica: dupla linha + texto eritrograma no rodapé ─────────────────
old = "      </section>\n\n      {/* COMO FUNCIONA */"
new = """      {/* Dupla linha vermelha + texto eritrograma após Terapêutica */}
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 2rem 1.5rem' }}>
        <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.6rem' }} />
        <p style={{ color:'#1F2937', fontSize:'0.92rem', fontWeight:600, textAlign:'center', margin:'0.4rem 0 0.3rem' }}>
          Para fazer uma avaliação você vai precisar de algumas informações do eritrograma:
        </p>
        <p style={{ color:'#6B7280', fontSize:'0.85rem', fontWeight:600, textAlign:'center', margin:'0 0 0.4rem' }}>
          Hemoglobina · VCM · RDW + Ferritina e Saturação da Transferrina
        </p>
        <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />
      </div>

      {/* COMO FUNCIONA */}"""
if old in txt: txt = txt.replace(old, new); fixed.append('OK: dupla linha + eritrograma após terapêutica')
else: fixed.append('ERRO: dupla linha terapêutica')

# ── 9. Como Funciona: reward-banner verde → dupla linha vermelha + texto afiliados ──
old = """                <div className="reward-banner">
                  <div className="reward-text">
                    <h4>Doutor: Ganhe por cada paciente que você avaliar</h4>
                    <p>Quando o paciente que você avaliou se cadastra, você recebe <strong>DEZ DÓLARES DIGITAIS</strong> diretamente na sua wallet <strong>KlipBit</strong>.</p>
                  </div>
                  <div className="reward-right">
                    <div className="reward-amount">10 USDC</div>
                    <a href="https://www.klipbit.com/en" target="_blank" rel="noopener" style={{display:'flex',alignItems:'center'}}>
                      <img src="https://klipbit.com/favicon.ico" alt="KlipBit" style={{height:36, width:36, borderRadius:8, opacity:0.9}} />
                    </a>
                  </div>
                </div>"""
new = """                <div style={{ margin:'1rem 0' }}>
                  <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.6rem' }} />
                  <p style={{ color:'#1F2937', fontSize:'0.95rem', fontWeight:600, textAlign:'center', margin:'0.4rem 0 0.2rem' }}>
                    O Programa de Afiliados RedFairy beneficia quem beneficia os seus pacientes.
                  </p>
                  <p style={{ color:'#6B7280', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', margin:'0.2rem 0 0.4rem', cursor:'pointer' }}
                     onClick={() => document.getElementById('acesso')?.scrollIntoView({ behavior:'smooth' })}>
                    CONHEÇA AS REGRAS
                  </p>
                  <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />
                </div>"""
if old in txt: txt = txt.replace(old, new); fixed.append('OK: reward-banner → dupla linha afiliados')
else: fixed.append('ERRO: reward-banner')

# ── 10. CTA final: reduzir altura dos cards (padding menor) ──────────────────
old = "  .cta-c { border-radius: 16px; padding: 1.8rem; transition: transform 0.25s; display: flex; flex-direction: column; justify-content: space-between; }"
new = "  .cta-c { border-radius: 16px; padding: 1rem 1.5rem; transition: transform 0.25s; display: flex; flex-direction: column; justify-content: space-between; }"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: cta-cards menor altura')
else: fixed.append('ERRO: cta-c padding')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
