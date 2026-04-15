calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

lines = txt.split('\n')
print('=== Todas as linhas com setShowOBA ===')
for i, line in enumerate(lines, 1):
    if 'setShowOBA' in line or 'showOBA' in line.lower():
        print(f'  {i}: {line}')
