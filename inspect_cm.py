calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
with open(calc, encoding='utf-8') as f:
    txt = f.read()
idx = txt.find('carregarMedico')
print(repr(txt[idx:idx+200]))
