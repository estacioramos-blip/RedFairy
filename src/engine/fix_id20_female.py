# RedFairy — Corrigir ID 20 femaleMatrix: hemoglobina min 13.5 → 12.0
import os

dir_ = os.path.dirname(os.path.abspath(__file__))
fem  = os.path.join(dir_, 'femaleMatrix.js')

with open(fem, 'r', encoding='utf-8') as f:
    content = f.read()

# Localizar o ID 20 da femaleMatrix e corrigir apenas a hemoglobina
# O padrão é único pois só existe um id: 20 com alcoolista: true
old = """    id: 20,
    label: "ALCOOLISMO — MACROCITOSE SEM ANEMIA",
    color: "yellow",
    conditions: {
      ferritina:   { min: 24,  max: 400  },
      hemoglobina: { min: 13.5,max: 17.5 },"""

new = """    id: 20,
    label: "ALCOOLISMO — MACROCITOSE SEM ANEMIA",
    color: "yellow",
    conditions: {
      ferritina:   { min: 24,  max: 400  },
      hemoglobina: { min: 12.0,max: 15.5 },"""

if old in content:
    content = content.replace(old, new)
    print("OK femaleMatrix ID 20: hemoglobina 13.5-17.5 -> 12.0-15.5")
else:
    print("NAO ENCONTRADO — verificar manualmente")

with open(fem, 'w', encoding='utf-8') as f:
    f.write(content)
print("Salvo.")
print('\ngit add . && git commit -m "fix: femaleMatrix ID20 hemoglobina corrigida" && git push origin main')
