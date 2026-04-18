lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Ver contexto da logo no nav
idx = txt.find('logo')
while idx >= 0:
    trecho = txt[max(0,idx-50):idx+150]
    if 'nav' in trecho.lower() or 'header' in trecho.lower() or 'href' in trecho.lower() or 'cursor' in trecho.lower():
        print(repr(trecho))
        print('---')
    idx = txt.find('logo', idx+1)
