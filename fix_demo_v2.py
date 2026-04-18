calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Inicializar inputs já com os dados do localStorage
old_inputs_init = """  const [inputs, setInputs] = useState({
    cpf: '', sexo: 'M"""

new_inputs_init = """  const _demo = (() => { try { const d = localStorage.getItem('rf_demo_dados'); if (d) { localStorage.removeItem('rf_demo_dados'); return JSON.parse(d) } } catch(e) {} return null })()
  const _hoje = new Date().toISOString().split('T')[0]

  const [inputs, setInputs] = useState({
    cpf: '', sexo: _demo?.sexo || 'M"""

if old_inputs_init in txt:
    txt = txt.replace(old_inputs_init, new_inputs_init)
    fixed.append('OK: inputs inicializa com _demo')
else:
    fixed.append('ERRO: inputs init não encontrado')

# 2. Adicionar _demo nos campos de exame e bariatrica
# Hemoglobina
old_hb = "    hemoglobina: '', ferritina: '', vcm: '', rdw: '', satTransf: '',"
new_hb = "    hemoglobina: _demo?.hb || '', ferritina: _demo?.ferr || '', vcm: _demo?.vcm || '', rdw: _demo?.rdw || '', satTransf: _demo?.sat || '',"
if old_hb in txt:
    txt = txt.replace(old_hb, new_hb)
    fixed.append('OK: campos laboratoriais inicializados com _demo')
else:
    fixed.append('ERRO: campos lab não encontrados')

# dataColeta
old_data = "    dataColeta: '',"
new_data = "    dataColeta: _demo ? _hoje : '',"
if old_data in txt:
    txt = txt.replace(old_data, new_data)
    fixed.append('OK: dataColeta inicializada')
else:
    fixed.append('ERRO: dataColeta não encontrada')

# idade
old_idade = "    idade: '',"
new_idade = "    idade: _demo?.idade || '',"
if old_idade in txt:
    txt = txt.replace(old_idade, new_idade)
    fixed.append('OK: idade inicializada com _demo')
else:
    fixed.append('ERRO: idade não encontrada')

# bariatrica e bariatrica_medico
old_bar = "    bariatrica: preFlag === 'bariatrica' || localStorage.getItem('rf_flag') === 'bariatrica',\n    bariatrica_medico: false,"
new_bar = "    bariatrica: _demo?.bariatrica || preFlag === 'bariatrica' || localStorage.getItem('rf_flag') === 'bariatrica',\n    bariatrica_medico: _demo?.bariatrica || false,"
if old_bar in txt:
    txt = txt.replace(old_bar, new_bar)
    fixed.append('OK: bariatrica e bariatrica_medico inicializados com _demo')
else:
    fixed.append('ERRO: bariatrica init não encontrado')

# 3. Remover o useEffect que lia preDemoDados (agora desnecessário)
old_effect = """  useEffect(() => {
    if (preDemoDados) {
      const hoje = new Date().toISOString().split('T')[0]
      setInputs(prev => ({
        ...prev,
        sexo:       preDemoDados.sexo || prev.sexo,
        idade:      preDemoDados.idade || prev.idade,
        hemoglobina: preDemoDados.hb || '',
        ferritina:   preDemoDados.ferr || '',
        vcm:         preDemoDados.vcm || '',
        rdw:         preDemoDados.rdw || '',
        satTransf:   preDemoDados.sat || '',
        dataColeta:  hoje,
        bariatrica:  preDemoDados.bariatrica || prev.bariatrica,
        bariatrica_medico: preDemoDados.bariatrica || prev.bariatrica_medico,
      }))
    }
  }, [preDemoDados]);

  useEffect(() => {"""

new_effect = "  useEffect(() => {"

if old_effect in txt:
    txt = txt.replace(old_effect, new_effect)
    fixed.append('OK: useEffect preDemoDados removido')
else:
    fixed.append('ERRO: useEffect preDemoDados não encontrado')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
