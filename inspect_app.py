app_path = 'C:/Users/Estacio/Desktop/redfairy/src/App.jsx'

with open(app_path, encoding='utf-8') as f:
    txt = f.read()

lines = txt.split('\n')
print('=== App.jsx — linhas relevantes ===')
for i, line in enumerate(lines, 1):
    l = line.lower()
    if any(x in l for x in ['cadastrado', 'medico_crm', 'authmedico', 'calculadora', 'onmodomedico', 'handledeom']):
        print(f'  {i}: {line}')
