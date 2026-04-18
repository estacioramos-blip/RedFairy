calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

idx = txt.find('conselho')
while idx >= 0:
    print(repr(txt[max(0,idx-30):idx+120]))
    print('---')
    idx = txt.find('conselho', idx+1)
    if idx > 0 and txt[idx-1:idx+10].count('conselho') > 3:
        break
