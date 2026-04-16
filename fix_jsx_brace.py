lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = "      {/* COMO FUNCIONA */}}"
new = "      {/* COMO FUNCIONA */}"

if old in txt:
    txt = txt.replace(old, new)
    open(lp, 'w', encoding='utf-8').write(txt)
    print('OK: chave dupla corrigida')
else:
    print('ERRO: não encontrado')
