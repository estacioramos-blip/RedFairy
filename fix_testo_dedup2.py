calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

item = '              <CheckboxCard name="testosterona" label="Testosterona / Anabolizante" sublabel="Uso exógeno — causa eritrocitose" checked={inputs.testosterona} onChange={handleChange} color="orange" />'

count = txt.count(item)
print(f'Ocorrências antes: {count}')

if count == 2:
    # Manter a primeira (Medicamentos), remover a segunda (Histórico)
    first = txt.find(item)
    second = txt.find(item, first + len(item))
    # Remover segunda ocorrência incluindo newline anterior
    txt = txt[:second-1] + txt[second + len(item):]
    print('OK: segunda ocorrência removida')
elif count == 1:
    print('OK: já existe só uma ocorrência')
else:
    print(f'AVISO: {count} ocorrências — verificar manualmente')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(txt)

print(f'Ocorrências após: {txt.count(item)}')
print('Concluído.')
