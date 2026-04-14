filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# Corrigir nav CSS: adicionar !important e max-width para garantir largura total
old = "  nav { position: fixed; top: 0; width: 100%; z-index: 100; padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; }"
new = "  nav { position: fixed; top: 0; left: 0; right: 0; width: 100% !important; max-width: 100% !important; z-index: 100; padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; box-sizing: border-box; }"

if old in txt:
    txt = txt.replace(old, new)
    open(filepath, 'w', encoding='utf-8').write(txt)
    print('OK: nav corrigida com !important e left:0/right:0')
else:
    print('ERRO: trecho nao encontrado — verificando variacao...')
    # Tenta encontrar trecho parcial para debug
    idx = txt.find('nav { position: fixed')
    if idx >= 0:
        print('Encontrado em:', idx)
        print('Trecho:', repr(txt[idx:idx+150]))
    else:
        print('Nao encontrado')
