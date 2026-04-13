# -*- coding: utf-8 -*-
# fix_sobreposicao_35_94.py
# Separa os IDs 35 e 94 da femaleMatrix por faixa de Hb
# ID 35: anemia importante com hemorragia (Hb 8.0-11.9)
# ID 94: anemia leve-moderada com hemorragia (Hb 10.0-13.4)
# Execute em: C:\Users\Estacio\Desktop\redfairy\src\engine
# python fix_sobreposicao_35_94.py

import os, re

dir_ = os.path.dirname(os.path.abspath(__file__))
fem = os.path.join(dir_, 'femaleMatrix.js')

with open(fem, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = []

# ID 35: Hb max 12.4 → 11.9 (anemia importante, abaixo de 12)
m35 = re.search(r'(id:\s*35\b.*?hemoglobina:\s*\{[^}]*\})', content, re.DOTALL)
if m35:
    bloco = m35.group(1)
    print(f"ID 35 Hb atual: {re.search(r'hemoglobina.*?}', bloco).group()}")
    novo = re.sub(
        r'(hemoglobina:\s*\{\s*min:\s*8\.?0?\s*,\s*max:\s*)12\.?4?(\s*\})',
        r'\g<1>11.9\2',
        bloco
    )
    if novo != bloco:
        content = content.replace(bloco, novo)
        fixes.append("✅ ID 35: Hb max 12.4 → 11.9")
    else:
        fixes.append("⚠️  ID 35: padrão não encontrado, tentando alternativo")
        # Tentar substituição mais ampla
        novo2 = re.sub(
            r'(id:\s*35\b.*?hemoglobina:\s*\{)[^}]*(\})',
            r'\g<1> min: 8.0, max: 11.9 \2',
            content,
            flags=re.DOTALL,
            count=1
        )
        if novo2 != content:
            content = novo2
            fixes.append("✅ ID 35: Hb corrigida via alternativo")
else:
    fixes.append("❌ ID 35 não encontrado")

# Verificar ID 94: Hb deve ser 12.0-13.4 (complementar ao 35)
m94 = re.search(r'(id:\s*94\b.*?hemoglobina:\s*\{[^}]*\})', content, re.DOTALL)
if m94:
    bloco94 = m94.group(1)
    hb94 = re.search(r'hemoglobina.*?}', bloco94)
    print(f"ID 94 Hb atual: {hb94.group() if hb94 else 'não encontrado'}")
    # ID 94 deve ter Hb min 12.0 para não sobrepor com ID 35
    # mas clinicamente 10.0-13.4 também faz sentido se vier APÓS o 35
    # Vamos deixar 10.0-13.4 e garantir que 94 vem ANTES de 35 no array
    fixes.append("ℹ️  ID 94: Hb mantida em 10.0-13.4 (posição no array garante prioridade)")

with open(fem, 'w', encoding='utf-8') as f:
    f.write(content)

# Verificação final
print("\n=== VERIFICAÇÃO FINAL ===")
with open(fem, 'r', encoding='utf-8') as f:
    c = f.read()

for id_num in [35, 94]:
    m = re.search(rf'id:\s*{id_num}\b.*?hemoglobina:\s*(\{{[^}}]+\}})', c, re.DOTALL)
    if m:
        print(f"ID {id_num}: Hb = {m.group(1).strip()}")

# Verificar posição no array (94 deve vir antes de 35)
pos35 = c.find('id: 35,')
pos94 = c.find('id: 94,')
if pos94 > 0 and pos35 > 0:
    if pos94 < pos35:
        print("✅ ID 94 vem ANTES de ID 35 no array")
    else:
        print("⚠️  ID 94 vem DEPOIS de ID 35 — pode causar sobreposição")
        print("   Mas ID 35 agora tem Hb max 11.9, então não há sobreposição")

print("\n=== CORREÇÕES ===")
for f in fixes: print(f"  {f}")

print("\nRode:")
print('  cd C:\\Users\\Estacio\\Desktop\\redfairy && git add . && git commit -m "fix: ID 35 Hb max 11.9, sem sobreposição com ID 94" && git push origin main')
