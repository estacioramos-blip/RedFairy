calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

old = "    cpf: '', sexo: _demo?.sexo || 'M', idade: '', dataColeta: '',\n    ferritina: '', hemoglobina: '', vcm: '', rdw: '', satTransf: '',"
new = "    cpf: '', sexo: _demo?.sexo || 'M', idade: _demo?.idade || '', dataColeta: _demo ? new Date().toISOString().split('T')[0] : '',\n    ferritina: _demo?.ferr || '', hemoglobina: _demo?.hb || '', vcm: _demo?.vcm || '', rdw: _demo?.rdw || '', satTransf: _demo?.sat || '',"

if old in txt:
    txt = txt.replace(old, new)
    open(calc, 'w', encoding='utf-8').write(txt)
    fixed.append('OK: campos lab, idade e dataColeta preenchidos com _demo')
else:
    fixed.append('ERRO: linha de inputs não encontrada')

for msg in fixed:
    print(msg)
print('Concluído.')
