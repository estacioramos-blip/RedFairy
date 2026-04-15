calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

# Mostrar TODOS os trechos que mencionam bariatrica e showOBA
lines = txt.split('\n')
print('=== Linhas com bariatrica + show/setShow ===')
for i, line in enumerate(lines, 1):
    l = line.lower()
    if 'bariatrica' in l and ('showoba' in l or 'setshowoba' in l):
        print(f'  {i}: {line}')

print()
print('=== Bloco handleChange completo ===')
idx = txt.find('function handleChange')
if idx >= 0:
    end = txt.find('\n  }', idx) + 4
    print(txt[idx:end])
