oba = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba, encoding='utf-8') as f:
    lines = f.readlines()

# Encontrar todas as ocorrências de LIMITES_OBA e aberrantesOBA
limites_lines = [i for i, l in enumerate(lines) if 'const LIMITES_OBA' in l]
aberrantes_lines = [i for i, l in enumerate(lines) if '[aberrantesOBA, setAberrantesOBA]' in l]

print(f'LIMITES_OBA nas linhas: {[x+1 for x in limites_lines]}')
print(f'aberrantesOBA nas linhas: {[x+1 for x in aberrantes_lines]}')

# Mostrar contexto de cada bloco LIMITES_OBA para identificar qual remover
for idx in limites_lines:
    print(f'\n--- LIMITES_OBA linha {idx+1} ---')
    print(repr(''.join(lines[idx:idx+3])))

for idx in aberrantes_lines:
    print(f'\n--- aberrantesOBA linha {idx+1} ---')
    print(repr(lines[idx]))
