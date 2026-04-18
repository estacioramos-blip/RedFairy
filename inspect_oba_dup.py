oba = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba, encoding='utf-8') as f:
    lines = f.readlines()

# Encontrar linhas com LIMITES_OBA e aberrantesOBA
for i, line in enumerate(lines[530:550], 531):
    print(f'{i}: {line.rstrip()}')
print('...')
for i, line in enumerate(lines[660:670], 661):
    print(f'{i}: {line.rstrip()}')
print('...')
for i, line in enumerate(lines[780:815], 781):
    print(f'{i}: {line.rstrip()}')
