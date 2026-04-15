calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
oba_path  = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

print('=== Calculator.jsx — linhas com bariatrica/setShowOBA ===')
with open(calc_path, encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        l = line.lower()
        if 'bariatrica' in l and ('setshowoba' in l or 'showoba' in l):
            print(f'  {i}: {line.rstrip()}')

print()
print('=== Calculator.jsx — bloco handleChange bariatrica ===')
with open(calc_path, encoding='utf-8') as f:
    txt = f.read()
idx = txt.find("name === 'bariatrica'")
if idx >= 0:
    print(repr(txt[idx-10:idx+200]))
else:
    print('NAO ENCONTRADO')

print()
print('=== OBAModal.jsx — linhas com onFechar/Voltar/Cancelar ===')
with open(oba_path, encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        l = line.lower()
        if 'onfechar' in l or 'voltar' in l or 'cancelar' in l:
            print(f'  {i}: {line.rstrip()}')
