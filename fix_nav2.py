filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# 1. Substituir a regra nav no CSS por uma regra com ID de alta especificidade
old_css = "  nav { position: fixed; top: 0; left: 0; right: 0; width: 100% !important; max-width: 100% !important; z-index: 100; padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; box-sizing: border-box; }"

# Se o patch anterior não funcionou, tenta o original
if old_css not in txt:
    old_css = "  nav { position: fixed; top: 0; width: 100%; z-index: 100; padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; }"

new_css = """  #landing-nav { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; max-width: 100vw !important; z-index: 1000 !important; padding: 0.75rem 2rem !important; display: flex !important; justify-content: space-between !important; align-items: center !important; transition: all 0.3s; box-sizing: border-box !important; }
  #landing-nav.scrolled { background: rgba(255,255,255,0.95) !important; backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); box-shadow: 0 1px 8px rgba(0,0,0,0.04); }
  nav { position: fixed; top: 0; left: 0; right: 0; width: 100% !important; max-width: 100vw !important; z-index: 1000; padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; box-sizing: border-box; }
  nav.scrolled { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); box-shadow: 0 1px 8px rgba(0,0,0,0.04); }"""

if old_css in txt:
    txt = txt.replace(old_css, new_css)
    print("OK: CSS da nav atualizado com !important e ID")
else:
    print("ERRO: trecho CSS nao encontrado")
    idx = txt.find('nav { position: fixed')
    if idx >= 0:
        print("Encontrado parcial em:", idx)
        print("Trecho:", repr(txt[idx:idx+200]))

# 2. Remover a regra scrolled duplicada se existir
old_scrolled = "  nav.scrolled { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); box-shadow: 0 1px 8px rgba(0,0,0,0.04); }"
if old_scrolled in txt:
    txt = txt.replace(old_scrolled, '')
    print("OK: regra scrolled duplicada removida")

# 3. Adicionar id="landing-nav" na tag nav do JSX
old_nav_tag = '<nav id="nav" className={navScrolled ? \'scrolled\' : \'\'}>'
new_nav_tag = '<nav id="landing-nav" className={navScrolled ? \'scrolled\' : \'\'}>'

if old_nav_tag in txt:
    txt = txt.replace(old_nav_tag, new_nav_tag)
    print("OK: id landing-nav adicionado na tag nav")
else:
    print("AVISO: tag nav nao encontrada para adicionar ID")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(txt)

print("Arquivo salvo.")
