calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

# Ver onde setResultado é chamado e como avaliacoes são contadas
for term in ['setResultado', 'totalAvaliacoes', 'count', 'avaliacoes']:
    idx = txt.find(term)
    if idx >= 0:
        print(f'[{term}]')
        print(repr(txt[max(0,idx-30):idx+150]))
        print('---')
