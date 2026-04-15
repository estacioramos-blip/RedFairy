calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

item = '              <CheckboxCard name="testosterona" label="Uso de Testosterona" sublabel="Exógena ou anabolizante — eritrocitose" checked={inputs.testosterona} onChange={handleChange} color="orange" />'

count = txt.count(item)
print(f'Ocorrências "Uso de Testosterona": {count}')

item2 = '              <CheckboxCard name="testosterona" label="Testosterona / Anabolizante" sublabel="Uso exógeno — causa eritrocitose" checked={inputs.testosterona} onChange={handleChange} color="orange" />'

count2 = txt.count(item2)
print(f'Ocorrências "Testosterona / Anabolizante": {count2}')

# Manter apenas "Testosterona / Anabolizante" nos Medicamentos
# Remover "Uso de Testosterona" do Histórico Clínico
if count > 0:
    txt = txt.replace('\n' + item, '')
    if item in txt:
        txt = txt.replace(item, '')
    print('OK: "Uso de Testosterona" removido do Histórico Clínico')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(txt)

print('Concluído.')
