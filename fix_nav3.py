filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

old = "  #landing-nav { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; max-width: 100vw !important; z-index: 1000 !important; padding: 0.75rem 2rem !important; display: flex !important; justify-content: space-between !important; align-items: center !important; transition: all 0.3s; box-sizing: border-box !important; }"

new = "  #landing-nav { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; width: 100vw !important; max-width: 100vw !important; z-index: 1000 !important; padding: 0.75rem 2rem !important; display: flex !important; justify-content: space-between !important; align-items: center !important; transition: all 0.3s; box-sizing: border-box !important; overflow: hidden !important; }"

if old in txt:
    txt = txt.replace(old, new)
    open(filepath, 'w', encoding='utf-8').write(txt)
    print('OK: width 100vw aplicado na nav')
else:
    print('ERRO: trecho nao encontrado')
    idx = txt.find('#landing-nav {')
    if idx >= 0:
        print('Encontrado em:', idx)
        print('Trecho:', repr(txt[idx:idx+200]))
