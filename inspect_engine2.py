engine_path = 'C:/Users/Estacio/Desktop/redfairy/src/engine/obaEngine.js'

with open(engine_path, encoding='utf-8') as f:
    txt = f.read()

# Ver quais módulos existem
import re
modulos = re.findall(r'// MÓDULO \d+ — (.+)', txt)
print('MÓDULOS EXISTENTES:')
for i, m in enumerate(modulos, 1):
    print(f'  {i}. {m}')

# Ver como status_intestinal chega no dadosOBA
idx = txt.find('status_intestinal')
if idx >= 0:
    print(f'\nstatus_intestinal no engine: {repr(txt[idx-30:idx+60])}')
else:
    print('\nstatus_intestinal: NÃO ENCONTRADO no engine')

idx2 = txt.find('status_fibromialgia')
if idx2 >= 0:
    print(f'status_fibromialgia no engine: {repr(txt[idx2-30:idx2+60])}')
else:
    print('status_fibromialgia: NÃO ENCONTRADO no engine')
