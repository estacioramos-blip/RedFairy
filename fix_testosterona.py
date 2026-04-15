import re

# ── 1. Calculator.jsx — adicionar checkbox Testosterona ───────────────────────
calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
with open(calc_path, encoding='utf-8') as f:
    calc = f.read()

# Adicionar no estado inicial dos inputs
old_state = "tiroxina: false, hidroxiureia: false, anticonvulsivante: false,"
new_state = "tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false,"

# Adicionar no handleLimpar
old_limpar = "tiroxina: false, hidroxiureia: false, anticonvulsivante: false, methotrexato: false, hivTratamento: false, metformina: false, ibp: false"
new_limpar = "tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false, methotrexato: false, hivTratamento: false, metformina: false, ibp: false"

# Adicionar CheckboxCard após HIV/ARV
old_card = '<CheckboxCard name="hivTratamento" label="Trat. HIV / ARV" sublabel="Antirretrovirais" checked={inputs.hivTratamento} onChange={handleChange} color="purple" />'
new_card = old_card + '\n              <CheckboxCard name="testosterona" label="Testosterona / Anabolizante" sublabel="Uso exógeno — causa eritrocitose" checked={inputs.testosterona} onChange={handleChange} color="orange" />'

fixed = []
for old, new, label in [
    (old_state, new_state, 'estado testosterona'),
    (old_limpar, new_limpar, 'handleLimpar testosterona'),
    (old_card, new_card, 'CheckboxCard testosterona'),
]:
    if old in calc:
        calc = calc.replace(old, new)
        fixed.append(f'OK: {label}')
    else:
        fixed.append(f'ERRO: {label}')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(calc)

for msg in fixed:
    print(msg)

# ── 2. decisionEngine.js — comentário testosterona ───────────────────────────
engine_path = 'C:/Users/Estacio/Desktop/redfairy/src/engine/decisionEngine.js'
with open(engine_path, encoding='utf-8') as f:
    engine = f.read()

old_hiv = """  if (inputs.hivTratamento) {
    comentarios.push({ titulo: 'ANTIRRETROVIRAIS (HIV)', texto: 'ALGUNS ANTIRRETROVIRAIS, ESPECIALMENTE ZIDOVUDINA (AZT), INIBEM A SÍNTESE DE DNA ERITROIDE E PRODUZEM MACROCITOSE E ANEMIA. O GRAU DE MACROCITOSE PODE SER USADO COMO MARCADOR INDIRETO DE ADESÃO AO TRATAMENTO. MONITORAR HEMOGRAMA E DISCUTIR AJUSTE DO ESQUEMA COM O INFECTOLOGISTA SE ANEMIA GRAVE.' });
  }"""

new_hiv = old_hiv + """
  if (inputs.testosterona) {
    comentarios.push({ titulo: 'TESTOSTERONA / ANABOLIZANTE', texto: 'O USO EXÓGENO DE TESTOSTERONA OU ANABOLIZANTES ESTIMULA A ERITROPOESE E PODE PRODUZIR ERITROCITOSE (HEMOGLOBINA E HEMATÓCRITO ELEVADOS), AUMENTANDO O RISCO DE TROMBOSE, AVC E INFARTO. SE A HEMOGLOBINA ESTIVER ELEVADA, A TESTOSTERONA EXÓGENA É A CAUSA MAIS PROVÁVEL EM HOMENS EM USO DESSA MEDICAÇÃO. SANGRIAS PERIÓDICAS PODEM SER NECESSÁRIAS PARA CONTROLE. MONITORAR HEMOGRAMA, HEMATÓCRITO E PSA A CADA 3-6 MESES.' });
  }"""

if old_hiv in engine:
    engine = engine.replace(old_hiv, new_hiv)
    print('OK: comentário testosterona adicionado ao decisionEngine')
else:
    print('ERRO: âncora HIV não encontrada no decisionEngine')

with open(engine_path, 'w', encoding='utf-8') as f:
    f.write(engine)

print('Concluído.')
