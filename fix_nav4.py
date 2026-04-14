filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# 1. Corrigir o div raiz para ter overflow:hidden e max-width:100vw
old_div = "    <div style={{ fontFamily:\"'DM Sans', sans-serif\" }}>"
new_div = "    <div style={{ fontFamily:\"'DM Sans', sans-serif\", overflowX:'hidden', maxWidth:'100vw', position:'relative' }}>"

# 2. Substituir toda a regra CSS da nav por uma mais simples usando position:fixed com left/right
old_nav_css = """  #landing-nav { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; width: 100vw !important; max-width: 100vw !important; z-index: 1000 !important; padding: 0.75rem 2rem !important; display: flex !important; justify-content: space-between !important; align-items: center !important; transition: all 0.3s; box-sizing: border-box !important; overflow: hidden !important; }
  #landing-nav.scrolled { background: rgba(255,255,255,0.95) !important; backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); box-shadow: 0 1px 8px rgba(0,0,0,0.04); }
  nav { position: fixed; top: 0; left: 0; right: 0; width: 100% !important; max-width: 100vw !important; z-index: 1000; padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; box-sizing: border-box; }"""

new_nav_css = """  #landing-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; box-sizing: border-box; }
  #landing-nav.scrolled { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); box-shadow: 0 1px 8px rgba(0,0,0,0.04); }"""

fixed1 = False
fixed2 = False

if old_div in txt:
    txt = txt.replace(old_div, new_div)
    fixed1 = True
    print("OK: div raiz com overflowX:hidden")
else:
    print("AVISO: div raiz não encontrado — tentando variação")
    alt = "    <div style={{ fontFamily:\"'DM Sans', sans-serif\" }}>"
    if alt in txt:
        txt = txt.replace(alt, new_div)
        fixed1 = True
        print("OK: div raiz corrigido (variação)")

if old_nav_css in txt:
    txt = txt.replace(old_nav_css, new_nav_css)
    fixed2 = True
    print("OK: CSS nav simplificado com left/right")
else:
    print("AVISO: CSS nav não encontrado — tentando patch parcial")
    # Tenta apenas adicionar overflow:hidden no div raiz se pelo menos isso funcionar
    idx = txt.find('#landing-nav {')
    if idx >= 0:
        print("CSS nav encontrado em:", idx)
        print("Trecho:", repr(txt[idx:idx+150]))

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(txt)

print(f"\nResultado: div={'OK' if fixed1 else 'FALHOU'}, nav_css={'OK' if fixed2 else 'FALHOU'}")
print("Arquivo salvo.")
