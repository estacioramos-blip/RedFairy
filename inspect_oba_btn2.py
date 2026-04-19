lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'
with open(lp, encoding='utf-8') as f:
    txt = f.read()

for term in ['COMEÇAR', 'MODO PACIENTE', 'bari', 'Bari', 'oba-start', 'SOU BARI']:
    idx = txt.find(term)
    if idx >= 0:
        print(f'[{term}]')
        print(repr(txt[max(0,idx-80):idx+150]))
        print('---')
