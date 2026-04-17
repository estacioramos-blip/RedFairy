calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Inicializar inputs já com bariatrica=true se preFlag for bariatrica
old_inputs = """  const [inputs, setInputs] = useState({
    cpf: '', sexo: 'M', idade: '', dataColeta: '',
    ferritina: '', hemoglobina: '', vcm: '', rdw: '', satTransf: '',
    bariatrica: false,"""

new_inputs = """  const [inputs, setInputs] = useState({
    cpf: '', sexo: 'M', idade: '', dataColeta: '',
    ferritina: '', hemoglobina: '', vcm: '', rdw: '', satTransf: '',
    bariatrica: preFlag === 'bariatrica',"""

if old_inputs in txt:
    txt = txt.replace(old_inputs, new_inputs)
    fixed.append('OK: inputs inicializa bariatrica com preFlag')
else:
    fixed.append('ERRO: inputs inicialização não encontrada')

# 2. Adicionar destaque visual no CheckboxCard da bariátrica
old_card = """              <CheckboxCard name="bariatrica" label="Bariátrica" sublabel="By-pass / Gastrectomia" checked={inputs.bariatrica} onChange={handleChange} color="amber" />"""
new_card = """              <CheckboxCard name="bariatrica" label="Bariátrica" sublabel="By-pass / Gastrectomia" checked={inputs.bariatrica} onChange={handleChange} color="amber" highlight={preFlag === 'bariatrica'} />"""

if old_card in txt:
    txt = txt.replace(old_card, new_card)
    fixed.append('OK: highlight adicionado ao CheckboxCard bariátrica')
else:
    fixed.append('ERRO: CheckboxCard bariátrica não encontrado')

# 3. CheckboxCard aceitar prop highlight e mostrar contorno vermelho
old_cc = """function CheckboxCard({ name, label, sublabel, checked, onChange, color }) {
  return (
    <label className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? colorMap[color] : 'border-gray-200 bg-gray-50 text-gray-600'}`}>"""

new_cc = """function CheckboxCard({ name, label, sublabel, checked, onChange, color, highlight }) {
  return (
    <label className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? colorMap[color] : 'border-gray-200 bg-gray-50 text-gray-600'}`}
      style={highlight && !checked ? { borderColor:'#7B1E1E', boxShadow:'0 0 0 2px rgba(123,30,30,0.3)' } : highlight && checked ? { borderColor:'#7B1E1E', boxShadow:'0 0 0 3px rgba(123,30,30,0.4)' } : {}}>"""

if old_cc in txt:
    txt = txt.replace(old_cc, new_cc)
    fixed.append('OK: CheckboxCard com highlight')
else:
    fixed.append('ERRO: CheckboxCard não encontrado')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
