oba = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba, encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total linhas: {len(lines)}')

# Encontrar todas ocorrências
limites = [i for i,l in enumerate(lines) if 'const LIMITES_OBA' in l]
aberr   = [i for i,l in enumerate(lines) if '[aberrantesOBA, setAberrantesOBA]' in l]

print(f'LIMITES_OBA: {[x+1 for x in limites]}')
print(f'aberrantesOBA: {[x+1 for x in aberr]}')

if len(limites) < 2 and len(aberr) < 2:
    print('Nada a remover — sem duplicatas')
else:
    # Remover segundo bloco LIMITES_OBA (do índice limites[1] até fechar })
    if len(limites) >= 2:
        s = limites[1]
        e = s + 1
        while e < len(lines) and not (lines[e].strip() == '}' and e > s):
            e += 1
        e += 1  # incluir a linha do }
        print(f'Removendo linhas {s+1} a {e} (LIMITES_OBA duplicado)')
        lines = lines[:s] + lines[e:]

    # Recalcular após remoção
    aberr2 = [i for i,l in enumerate(lines) if '[aberrantesOBA, setAberrantesOBA]' in l]
    print(f'aberrantesOBA após: {[x+1 for x in aberr2]}')
    if len(aberr2) >= 2:
        idx = aberr2[1]
        print(f'Removendo linha {idx+1} (aberrantesOBA duplicado)')
        lines.pop(idx)

    with open(oba, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('OK: duplicatas removidas')
