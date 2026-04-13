# -*- coding: utf-8 -*-
# RedFairy — fix_female_35_36.py
# Corrige satTransf dos IDs 35 e 36 da femaleMatrix via busca flexível
# Execute em: C:\Users\Estacio\Desktop\redfairy\src\engine
# python fix_female_35_36.py

import os, re

dir_ = os.path.dirname(os.path.abspath(__file__))
fem = os.path.join(dir_, 'femaleMatrix.js')

with open(fem, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = []

# Encontrar ID 35 e verificar satTransf atual
def fix_id_sat(content, id_num):
    # Encontrar o bloco do ID
    pattern = rf'(id:\s*{id_num},.*?satTransf:\s*\{{[^}}]+\}})'
    m = re.search(pattern, content, re.DOTALL)
    if not m:
        return content, f"❌ ID {id_num}: não encontrado"
    
    bloco = m.group(1)
    print(f"\nID {id_num} — satTransf atual:")
    sat_m = re.search(r'satTransf:\s*\{[^}]+\}', bloco)
    if sat_m:
        print(f"  {sat_m.group()}")
    
    # Substituir max: 19 por max: 50 SOMENTE dentro deste bloco
    novo_bloco = re.sub(
        r'(satTransf:\s*\{\s*min:\s*0\s*,\s*max:\s*)19(\s*\})',
        r'\g<1>50\2',
        bloco
    )
    
    if novo_bloco == bloco:
        # Já está com max 50, ou tem outro valor
        sat_m2 = re.search(r'satTransf:\s*\{[^}]+\}', novo_bloco)
        return content, f"ℹ️  ID {id_num}: satTransf já correto ou valor diferente — {sat_m2.group() if sat_m2 else 'não encontrado'}"
    
    content = content.replace(bloco, novo_bloco)
    return content, f"✅ ID {id_num}: satTransf corrigido para max: 50"

content, msg35 = fix_id_sat(content, 35)
fixes.append(msg35)

content, msg36 = fix_id_sat(content, 36)
fixes.append(msg36)

# Verificar resultado
print("\n=== VERIFICAÇÃO FINAL ===")
for id_num in [35, 36]:
    m = re.search(rf'id:\s*{id_num},.*?satTransf:\s*(\{{[^}}]+\}})', content, re.DOTALL)
    if m:
        print(f"ID {id_num} satTransf: {m.group(1)}")

with open(fem, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n=== CORREÇÕES ===")
for fix in fixes:
    print(f"  {fix}")

print("\nAgora rode:")
print('  cd C:\\Users\\Estacio\\Desktop\\redfairy')
print('  git add . && git commit -m "fix: femaleMatrix IDs 35/36 satTransf corrigido" && git push origin main')
