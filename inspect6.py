calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

lines = txt.split('\n')
print('=== Contexto linhas 688-702 ===')
for i, line in enumerate(lines[687:702], 688):
    print(f'  {i}: {line}')
