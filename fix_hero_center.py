lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. hero-wrap: de grid 2 colunas para coluna única centralizada
old_wrap = "  .hero-wrap { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; position: relative; z-index: 2; }"
new_wrap = "  .hero-wrap { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; z-index: 2; }"
if old_wrap in txt:
    txt = txt.replace(old_wrap, new_wrap)
    fixed.append('OK: hero-wrap centralizado')
else:
    fixed.append('ERRO: hero-wrap não encontrado')

# 2. hero-actions: centralizar
old_actions = "  .hero-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: center; }"
new_actions = "  .hero-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: center; justify-content: center; }"
if old_actions in txt:
    txt = txt.replace(old_actions, new_actions)
    fixed.append('OK: hero-actions centralizado')
else:
    fixed.append('ERRO: hero-actions não encontrado')

# 3. trust: centralizar
old_trust = "  .trust { margin-top: 2rem; display: flex; gap: 1.8rem; align-items: center; flex-wrap: wrap; }"
new_trust = "  .trust { margin-top: 2rem; display: flex; gap: 1.8rem; align-items: center; flex-wrap: wrap; justify-content: center; }"
if old_trust in txt:
    txt = txt.replace(old_trust, new_trust)
    fixed.append('OK: trust centralizado')
else:
    fixed.append('ERRO: trust não encontrado')

# 4. hero-desc: centralizar texto
old_desc_css = "  .hero-desc { font-size: 1.02rem; color: var(--text-sec); max-width: 100%; line-height: 1.7; margin-bottom: 1.2rem; font-weight: 700; text-align: justify; }"
new_desc_css = "  .hero-desc { font-size: 1.02rem; color: var(--text-sec); max-width: 100%; line-height: 1.7; margin-bottom: 1.2rem; font-weight: 700; text-align: center; }"
if old_desc_css in txt:
    txt = txt.replace(old_desc_css, new_desc_css)
    fixed.append('OK: hero-desc centralizado')
else:
    fixed.append('ERRO: hero-desc css não encontrado')

# 5. hero-textbox: centralizar e limitar largura
old_htb = "  .hero-textbox {\n    background: var(--white); border: 1px solid var(--border); border-radius: 16px;\n    padding: 2rem 2.5rem; box-shadow: var(--shadow);\n    position: relative; overflow: hidden; cursor: pointer; margin-bottom: 0.8rem;\n  }"
new_htb = "  .hero-textbox {\n    background: var(--white); border: 1px solid var(--border); border-radius: 16px;\n    padding: 2rem 2.5rem; box-shadow: var(--shadow);\n    position: relative; overflow: hidden; cursor: pointer; margin-bottom: 0.8rem;\n    width: 100%; max-width: 700px; text-align: center;\n  }"
if old_htb in txt:
    txt = txt.replace(old_htb, new_htb)
    fixed.append('OK: hero-textbox centralizado')
else:
    fixed.append('ERRO: hero-textbox não encontrado')

# 6. hero-philosophy: centralizar
old_phil = "                <p className=\"hero-philosophy\" style={{ fontStyle:'normal', fontWeight:800, textAlign:'center' }}>"
# já está centrado, ok

# 7. grid dos botões: centralizar e limitar largura
old_grid = "            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.5rem', width:'100%' }}>"
new_grid = "            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.5rem', width:'100%', maxWidth:700 }}>"
if old_grid in txt:
    txt = txt.replace(old_grid, new_grid)
    fixed.append('OK: grid botões com maxWidth')
else:
    fixed.append('ERRO: grid botões não encontrado')

# 8. dupla linha: centralizar e limitar largura
old_dl = "            <div style={{ margin:'0.5rem 0 0.8rem', textAlign:'center' }}>"
new_dl = "            <div style={{ margin:'0.5rem 0 0.8rem', textAlign:'center', width:'100%', maxWidth:700 }}>"
if old_dl in txt:
    txt = txt.replace(old_dl, new_dl)
    fixed.append('OK: dupla linha com maxWidth')
else:
    fixed.append('ERRO: dupla linha não encontrada')

# 9. Remover coluna direita (hero-visual) se ainda existir
old_visual = """          {/* COLUNA DIREITA */}
          <div className="hero-visual reveal" style={{ transitionDelay:'0.15s' }}>"""
if old_visual in txt:
    # Encontrar e remover toda a coluna direita
    start = txt.find(old_visual)
    end = txt.find('\n        </div>\n      </section>\n\n      {/* FILOSOFIA */')
    if start > 0 and end > 0:
        txt = txt[:start] + '\n        </div>\n      </section>\n\n      {/* FILOSOFIA */'  + txt[end + len('\n        </div>\n      </section>\n\n      {/* FILOSOFIA */'):]
        fixed.append('OK: coluna direita removida')
    else:
        fixed.append('AVISO: coluna direita — fim não encontrado')
else:
    fixed.append('OK: coluna direita já não existe')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
