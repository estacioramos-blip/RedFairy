calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Ao marcar bariatrica_medico, forçar bariatrica=true no handleChange
old_handle_bar = "    if (name === 'bariatrica') {\n      if (!checked) setDadosOBAColetados(null);\n    }"
new_handle_bar = """    if (name === 'bariatrica') {
      if (!checked) setDadosOBAColetados(null);
    }
    if (name === 'bariatrica_medico') {
      if (checked) setInputs(prev => ({ ...prev, bariatrica: true, bariatrica_medico: true }));
      else setInputs(prev => ({ ...prev, bariatrica_medico: false }));
    }"""

if old_handle_bar in txt:
    txt = txt.replace(old_handle_bar, new_handle_bar)
    fixed.append('OK: handleChange bariatrica_medico força bariatrica=true')
else:
    fixed.append('ERRO: handleChange bariatrica não encontrado')

# 2. Esconder CheckboxCard Bariátrica quando bariatrica_medico está marcado
old_bar_card = '              <CheckboxCard name="bariatrica" label="Bariátrica" sublabel="By-pass / Gastrectomia" checked={inputs.bariatrica} onChange={handleChange} color="amber" highlight={preFlag === \'bariatrica\'} />'
new_bar_card = "              {!inputs.bariatrica_medico && <CheckboxCard name=\"bariatrica\" label=\"Bariátrica\" sublabel=\"By-pass / Gastrectomia\" checked={inputs.bariatrica} onChange={handleChange} color=\"amber\" highlight={preFlag === 'bariatrica'} />}"

if old_bar_card in txt:
    txt = txt.replace(old_bar_card, new_bar_card)
    fixed.append('OK: CheckboxCard Bariátrica some quando bariatrica_medico marcado')
else:
    fixed.append('ERRO: CheckboxCard Bariátrica não encontrado')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
