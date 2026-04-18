calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Adicionar estado tipoConselho
old_state = "  const [conselho, setConselho] = useState('')"
new_state = "  const [tipoConselho, setTipoConselho] = useState('CRM')\n  const [conselho, setConselho] = useState('')"
if old_state in txt:
    txt = txt.replace(old_state, new_state)
    fixed.append('OK: estado tipoConselho adicionado')
else:
    fixed.append('ERRO: estado conselho não encontrado')

# 2. Substituir bloco do input de conselho no CADASTRO (tem value={conselho})
old_cad = """<div>\n              <label className="block text-sm font-medium text-gray-600 mb-1">Número do Conselho/UF</label>\n              <input type="text" value={conselho} onChange={e => setConselho(formatarConselho(e.target.value))}"""

idx = txt.find(old_cad)
if idx >= 0:
    end = txt.find('</div>', idx) + 6
    old_block = txt[idx:end]
    new_block = """<div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Conselho</label>
              <select value={tipoConselho} onChange={e => setTipoConselho(e.target.value)} className={inputClass}>
                <option value="CRM">CRM — Medicina</option>
                <option value="COREN">COREN — Enfermagem</option>
                <option value="CREFITO">CREFITO — Fisioterapia</option>
                <option value="CRFA">CRFA — Fonoaudiologia</option>
                <option value="CRN">CRN — Nutrição</option>
                <option value="CRBio">CRBio — Biologia</option>
                <option value="CRF">CRF — Farmácia/Bioquímica</option>
                <option value="CRBM">CRBM — Biomedicina</option>
                <option value="CRO">CRO — Odontologia</option>
                <option value="CREF">CREF — Educação Física</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Número do Conselho/UF</label>
              <input type="text" value={conselho} onChange={e => setConselho(formatarConselho(e.target.value))}"""
    txt = txt[:idx] + new_block + txt[idx+len(old_cad):]
    fixed.append('OK: select tipo conselho adicionado no cadastro')
else:
    fixed.append('ERRO: bloco cadastro conselho não encontrado')

# 3. Usar tipoConselho no prefixo ao salvar
# A formatação atual usa o número diretamente — adicionar prefixo do tipo
old_conselho_limpo = "    const conselhoLimpo = conselho.trim().toUpperCase()\n    const celularDigits = celular.replace(/\\D/g, '')\n\n    if (!nome.trim()"
new_conselho_limpo = "    const conselhoLimpo = (tipoConselho + '-' + conselho.trim()).toUpperCase()\n    const celularDigits = celular.replace(/\\D/g, '')\n\n    if (!nome.trim()"
if old_conselho_limpo in txt:
    txt = txt.replace(old_conselho_limpo, new_conselho_limpo)
    fixed.append('OK: prefixo tipoConselho adicionado ao salvar')
else:
    fixed.append('ERRO: conselhoLimpo cadastro não encontrado')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
