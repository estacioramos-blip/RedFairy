# -*- coding: utf-8 -*-
# fix_id35_hb_final.py
# Corrige a hemoglobina malformada do ID 35 da femaleMatrix
# Execute em: C:\Users\Estacio\Desktop\redfairy\src\engine
# python fix_id35_hb_final.py

import os, re

dir_ = os.path.dirname(os.path.abspath(__file__))
fem = os.path.join(dir_, 'femaleMatrix.js')

with open(fem, 'r', encoding='utf-8') as f:
    content = f.read()

# Mostrar o que está no ID 35 agora
m = re.search(r'id:\s*35\b.{0,300}', content, re.DOTALL)
if m:
    print("ID 35 atual:")
    print(m.group()[:300])

# Corrigir qualquer variação malformada de hemoglobina no ID 35
# Substituir a linha inteira de hemoglobina do ID 35
content_new = re.sub(
    r'(id:\s*35,.*?hemoglobina:\s*\{)[^}]*(})',
    r'\1 min: 8.0, max: 12.4 \2',
    content,
    flags=re.DOTALL,
    count=1
)

if content_new == content:
    print("❌ Nada alterado — padrão não encontrado")
else:
    # Verificar resultado
    m2 = re.search(r'id:\s*35\b.{0,300}', content_new, re.DOTALL)
    if m2:
        print("\nID 35 corrigido:")
        print(m2.group()[:300])
    
    with open(fem, 'w', encoding='utf-8') as f:
        f.write(content_new)
    print("\n✅ femaleMatrix salva")

print("\nRode:")
print('  cd C:\\Users\\Estacio\\Desktop\\redfairy && git add . && git commit -m "fix: ID 35 femaleMatrix Hb min 8.0 max 12.4 definitivo" && git push origin main')
