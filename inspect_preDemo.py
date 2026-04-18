calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

# Ver useEffect preDemoDados
idx = txt.find('preDemoDados')
while idx >= 0:
    print(repr(txt[max(0,idx-20):idx+80]))
    print('---')
    idx = txt.find('preDemoDados', idx+1)
