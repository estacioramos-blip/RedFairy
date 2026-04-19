calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
with open(calc, encoding='utf-8') as f:
    txt = f.read()

idx = txt.find('Ctrl')
while idx >= 0:
    print(repr(txt[max(0,idx-30):idx+120]))
    print('---')
    idx = txt.find('Ctrl', idx+1)
