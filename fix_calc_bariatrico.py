calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# Adicionar campo bariatrica_medico ao inputs
old_inputs_bar = "    bariatrica: preFlag === 'bariatrica' || localStorage.getItem('rf_flag') === 'bariatrica',"
new_inputs_bar = "    bariatrica: preFlag === 'bariatrica' || localStorage.getItem('rf_flag') === 'bariatrica',\n    bariatrica_medico: false,"
if old_inputs_bar in txt:
    txt = txt.replace(old_inputs_bar, new_inputs_bar)
    fixed.append('OK: campo bariatrica_medico adicionado ao inputs')
else:
    fixed.append('ERRO: inputs bariatrica não encontrado')

# Adicionar checkbox no formulário, após o CPF
old_cpf_hint = '                <p className="text-xs text-orange-500 mt-0.5">Digite apenas os números, sem pontos ou hífen</p>'
new_cpf_hint = '''                <p className="text-xs text-orange-500 mt-0.5">Digite apenas os números, sem pontos ou hífen</p>
              </div>
              <div className="col-span-2">
                <label className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${inputs.bariatrica_medico ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  <input type="checkbox" name="bariatrica_medico" checked={inputs.bariatrica_medico} onChange={handleChange} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight">Paciente Bariátrico</p>
                    <p className="text-xs opacity-70 leading-tight mt-0.5">Encaminha para avaliação OBA no modo paciente</p>
                  </div>
                </label>'''
if old_cpf_hint in txt:
    txt = txt.replace(old_cpf_hint, new_cpf_hint)
    fixed.append('OK: checkbox Paciente Bariátrico adicionado')
else:
    fixed.append('ERRO: hint CPF não encontrado')

# Salvar bariatrica_medico na avaliação
old_insert = "        bariatrica: inputs.bariatrica,"
new_insert = "        bariatrica: inputs.bariatrica || inputs.bariatrica_medico,\n        bariatrica_medico: inputs.bariatrica_medico || false,"
if old_insert in txt:
    txt = txt.replace(old_insert, new_insert)
    fixed.append('OK: bariatrica_medico salvo na avaliação')
else:
    fixed.append('ERRO: insert bariatrica não encontrado')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
