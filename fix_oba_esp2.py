oba = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Reduzir texto do checkbox
old = '"NÃO ESTOU SOB ACOMPANHAMENTO DE ESPECIALISTA"'
new = '"NÃO ESTOU SOB ACOMPANHAMENTO"'
if old in txt:
    txt = txt.replace(old, new)
    fixed.append('OK: texto checkbox reduzido')
else:
    fixed.append('ERRO: texto checkbox não encontrado')

# 2. Adicionar REUMATOLOGISTA e ORTOPEDISTA na lista
old_esp = """const ESPECIALISTAS = [
  'CIRURGIÃO',
  'CLÍNICO',
  'HEMATOLOGISTA',
  'GASTROENTEROLOGISTA',
  'NUTRÓLOGO',
  'ENDOCRINOLOGISTA',
  'CARDIOLOGISTA',
  'NEUROLOGISTA',
  'PSIQUIATRA',
  'OUTRO',
]"""
new_esp = """const ESPECIALISTAS = [
  'CIRURGIÃO',
  'CLÍNICO',
  'HEMATOLOGISTA',
  'GASTROENTEROLOGISTA',
  'NUTRÓLOGO',
  'ENDOCRINOLOGISTA',
  'CARDIOLOGISTA',
  'NEUROLOGISTA',
  'PSIQUIATRA',
  'REUMATOLOGISTA',
  'ORTOPEDISTA',
  'OUTRO',
]"""
if old_esp in txt:
    txt = txt.replace(old_esp, new_esp)
    fixed.append('OK: Reumatologista e Ortopedista adicionados')
else:
    fixed.append('ERRO: lista ESPECIALISTAS não encontrada')

with open(oba, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
