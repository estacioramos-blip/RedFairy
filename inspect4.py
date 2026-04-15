calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

lines = txt.split('\n')
print('=== Contexto linhas 535-555 ===')
for i, line in enumerate(lines[534:555], 535):
    print(f'  {i}: {line}')
