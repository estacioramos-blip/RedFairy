calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Adicionar estado tipoConselho
old_state_cons = "  const [conselho, setConselho] = useState('')"
new_state_cons = """  const [tipoConselho, setTipoConselho] = useState('CRM')
  const [conselho, setConselho] = useState('')"""

if old_state_cons in txt:
    txt = txt.replace(old_state_cons, new_state_cons)
    fixed.append('OK: estado tipoConselho adicionado')
else:
    fixed.append('ERRO: estado conselho não encontrado')

# 2. Encontrar o input de conselho e adicionar select antes
old_cons_input = """    <input type="text" value={conselho} onChange={e => setConselho(formatarConselho(e.target.value))}\n                placeholder="Ex: 6302/BA ou CORE"""

# Pegar contexto completo
idx = txt.find('value={conselho} onChange={e => setConselho')
if idx >= 0:
    start = txt.rfind('<div>', 0, idx)
    end = txt.find('</div>', idx) + 6
    old_block = txt[start:end]
    print('Bloco encontrado:')
    print(repr(old_block[:200]))
else:
    print('Bloco não encontrado')

# 3. Substituir label + input de conselho
old_label_cons = '            <div>\n              <label className="block text-sm font-medium text-gray-600 mb-1">Número do Conselho'
idx2 = txt.find(old_label_cons)
print(f'\nLabel conselho idx: {idx2}')
if idx2 >= 0:
    end2 = txt.find('</div>', idx2) + 6
    print(repr(txt[idx2:end2]))
