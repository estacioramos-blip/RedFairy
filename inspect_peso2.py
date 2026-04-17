oba = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba, encoding='utf-8') as f:
    txt = f.read()

print('kgPerdidos exibição:', 'Perdeu' in txt or 'kgPerdidos.toFixed' in txt)
print('kgGanhou exibição:', 'Ganhou' in txt or 'kgGanhou.toFixed' in txt)

# Ver contexto após os inputs de peso
idx = txt.find('peso_atual} onChange={e => sf')
print('\n=== após input peso_atual ===')
print(repr(txt[idx+60:idx+600]))
