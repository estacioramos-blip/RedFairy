filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# Remover width:100vw do style inline da nav — deixar só left:0 right:0
old = """<nav id="landing-nav" className={navScrolled ? 'scrolled' : ''} style={{ position:'fixed', top:0, left:0, right:0, width:'100vw', maxWidth:'100vw', boxSizing:'border-box', zIndex:1000, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 2rem' }}>"""

new = """<nav id="landing-nav" className={navScrolled ? 'scrolled' : ''} style={{ position:'fixed', top:0, left:0, right:0, boxSizing:'border-box', zIndex:1000, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 2rem' }}>"""

if old in txt:
    txt = txt.replace(old, new)
    open(filepath, 'w', encoding='utf-8').write(txt)
    print('OK: width removido da nav, usando so left/right')
else:
    print('ERRO: tag nav nao encontrada')
    idx = txt.find('id="landing-nav"')
    if idx >= 0:
        print('Trecho atual:', repr(txt[idx:idx+300]))
