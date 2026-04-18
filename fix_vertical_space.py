lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Reduzir padding das sections (5.5rem → 3rem)
old_sec = "  section { padding: 5.5rem 2rem; }"
new_sec = "  section { padding: 3rem 2rem; }"
if old_sec in txt:
    txt = txt.replace(old_sec, new_sec)
    fixed.append('OK: padding sections reduzido')
else:
    fixed.append('ERRO: padding sections')

# 2. Filosofia padding
old_fil = "  .filosofia { background: var(--gray-bg); color: var(--text); position: relative; padding-top: 1.5rem; padding-bottom: 2rem; }"
new_fil = "  .filosofia { background: var(--gray-bg); color: var(--text); position: relative; padding-top: 1rem; padding-bottom: 1.5rem; }"
if old_fil in txt:
    txt = txt.replace(old_fil, new_fil)
    fixed.append('OK: filosofia padding reduzido')
else:
    fixed.append('ERRO: filosofia padding')

# 3. Botão OBA nas Indicações — padding menor
old_oba_btn = """          <div style={{ display:'flex', justifyContent:'center', marginTop:'2rem' }}>
            <a href="#oba" className="oba-home-btn">
              <span className="oba-title">Projeto OBA</span>
              <span className="oba-sub">Otimizar o Bariátrico</span>
              <span className="oba-link">Saiba mais →</span>
            </a>
          </div>"""
new_oba_btn = """          <div style={{ display:'flex', justifyContent:'center', marginTop:'1.5rem' }}>
            <a href="#oba" className="oba-home-btn" style={{ padding:'0.7rem 1.5rem' }}>
              <span className="oba-title">Projeto OBA</span>
              <span className="oba-sub">Otimizar o Bariátrico</span>
              <span className="oba-link">Saiba mais →</span>
            </a>
          </div>"""
if old_oba_btn in txt:
    txt = txt.replace(old_oba_btn, new_oba_btn)
    fixed.append('OK: botão OBA menor')
else:
    fixed.append('ERRO: botão OBA')

# 4. Quadros terapêutica — padding menor
old_terap = "  .terap-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.8rem; transition: all 0.2s; }"
new_terap = "  .terap-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.2rem; transition: all 0.2s; }"
if old_terap in txt:
    txt = txt.replace(old_terap, new_terap)
    fixed.append('OK: terap-card padding reduzido')
else:
    fixed.append('ERRO: terap-card')

# 5. terap-grid: margin menor
old_tgrid = "  .terap-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.2rem; margin-top: 2.5rem; }"
new_tgrid = "  .terap-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1.5rem; }"
if old_tgrid in txt:
    txt = txt.replace(old_tgrid, new_tgrid)
    fixed.append('OK: terap-grid margin reduzido')
else:
    fixed.append('ERRO: terap-grid')

# 6. CTA cards — padding menor
old_cta = "  .cta-c { border-radius: 16px; padding: 1rem 1.5rem; transition: transform 0.25s; display: flex; flex-direction: column; justify-content: space-between; }"
new_cta = "  .cta-c { border-radius: 16px; padding: 0.8rem 1.2rem; transition: transform 0.25s; display: flex; flex-direction: column; justify-content: space-between; }"
if old_cta in txt:
    txt = txt.replace(old_cta, new_cta)
    fixed.append('OK: cta-cards padding reduzido')
else:
    fixed.append('ERRO: cta-cards')

# 7. cta-cards margin menor
old_ctam = "  .cta-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 2.5rem; }"
new_ctam = "  .cta-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }"
if old_ctam in txt:
    txt = txt.replace(old_ctam, new_ctam)
    fixed.append('OK: cta-cards gap reduzido')
else:
    fixed.append('ERRO: cta-cards gap')

# 8. Hero padding menor
old_hero = "  .hero { min-height: auto; display: flex; align-items: center; padding: 5.5rem 2rem 1.5rem; background: var(--white); position: relative; overflow: hidden; }"
new_hero = "  .hero { min-height: auto; display: flex; align-items: center; padding: 4rem 2rem 1rem; background: var(--white); position: relative; overflow: hidden; }"
if old_hero in txt:
    txt = txt.replace(old_hero, new_hero)
    fixed.append('OK: hero padding reduzido')
else:
    fixed.append('ERRO: hero padding')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
