oba = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba, encoding='utf-8') as f:
    txt = f.read()

# Ver cálculos de peso
idx = txt.find('kgPerdidos')
print('=== kgPerdidos ===')
print(repr(txt[idx-50:idx+300]))

idx2 = txt.find('kgGanhou')
print('\n=== kgGanhou ===')
print(repr(txt[idx2-50:idx2+300]))

# Ver onde ganhou_peso_apos é renderizado
idx3 = txt.find('PERDI MAS GANHEI')
print('\n=== checkbox ganhou ===')
print(repr(txt[idx3-100:idx3+200]))
