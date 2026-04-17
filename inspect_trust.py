lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

idx = txt.find('variáveis clínicas')
if idx >= 0:
    print('Contexto:')
    print(repr(txt[idx-200:idx+100]))
else:
    print('variáveis clínicas não encontrado')
    idx2 = txt.find('trust')
    print('trust idx:', idx2)
    print(repr(txt[idx2:idx2+300]))
