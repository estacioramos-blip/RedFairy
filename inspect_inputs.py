calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# Ver contexto atual do inputs
idx = txt.find('const [inputs, setInputs]')
print('Contexto inputs:')
print(repr(txt[idx:idx+600]))
