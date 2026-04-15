calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

# Remover o bloco duplicado que foi inserido duas vezes
# O bloco correto está APÓS Transfundido — remover a segunda ocorrência de cada campo

duplicatas = [
    '              <CheckboxCard name="anemiaPrevia" label="Anemia Crônica / Prévia" sublabel="Diagnóstico anterior de anemia" checked={inputs.anemiaPrevia} onChange={handleChange} color="red" />',
    '              <CheckboxCard name="sideropenia" label="Deficiência de Ferro" sublabel="Histórico de ferritina baixa" checked={inputs.sideropenia} onChange={handleChange} color="orange" />',
    '              <CheckboxCard name="sobrecargaFerro" label="Excesso de Ferro / Hemocromatose" sublabel="Histórico de ferritina alta" checked={inputs.sobrecargaFerro} onChange={handleChange} color="orange" />',
    '              <CheckboxCard name="hbAlta" label="Hemoglobina Alta / Policitemia" sublabel="Histórico de Hb elevada ou sangrias" checked={inputs.hbAlta} onChange={handleChange} color="red" />',
    '              <CheckboxCard name="doadorSangue" label="Doador de Sangue" sublabel="Doações frequentes" checked={inputs.doadorSangue} onChange={handleChange} color="red" />',
    '              <CheckboxCard name="celiaco" label="Celíaco" sublabel="Doença celíaca — má absorção" checked={inputs.celiaco} onChange={handleChange} color="yellow" />',
    '              <CheckboxCard name="g6pd" label="Deficiência de G-6-PD" sublabel="Favismo — risco de hemólise" checked={inputs.g6pd} onChange={handleChange} color="purple" />',
]

for item in duplicatas:
    count = txt.count(item)
    if count > 1:
        # Remover todas exceto a primeira
        first = txt.find(item)
        rest = txt[first + len(item):]
        rest = rest.replace('\n' + item, '').replace(item, '')
        txt = txt[:first + len(item)] + rest
        print(f'OK: removida duplicata de {item[30:65].strip()}')
    elif count == 1:
        print(f'OK (sem duplicata): {item[30:65].strip()}')
    else:
        print(f'ERRO nao encontrado: {item[30:65].strip()}')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(txt)

print('Concluído.')
