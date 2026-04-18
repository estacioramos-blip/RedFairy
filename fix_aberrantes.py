calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# ── 1. Subtexto ferritina: "Não use ponto para valores superiores a 1000" ────
old_ferr = """              <LabInput label="Ferritina" unit="ng/mL" name="ferritina" reference={inputs.sexo === 'M' ? '24-336' : '25-150'} value={inputs.ferritina} onChange={handleChange} error={erros.ferritina} hint="Sem ponto ou vírgula. Ex: 1140" />"""
new_ferr = """              <LabInput label="Ferritina" unit="ng/mL" name="ferritina" reference={inputs.sexo === 'M' ? '24-336' : '25-150'} value={inputs.ferritina} onChange={handleChange} error={erros.ferritina} hint="Não use ponto para valores superiores a 1000. Ex: 1140" />"""
if old_ferr in txt:
    txt = txt.replace(old_ferr, new_ferr)
    fixed.append('OK: subtexto ferritina atualizado')
else:
    fixed.append('ERRO: LabInput ferritina não encontrado')

# ── 2. Arredondamento no sanitizarNumero ──────────────────────────────────────
old_san = """  function sanitizarNumero(valor) {
    if (!valor && valor !== 0) return valor;
    const str = String(valor).trim();
    // Remove ponto de milhar (ex: "1.000" → "1000", "1.500" → "1500")
    // Regra: ponto seguido de exatamente 3 dígitos é milhar
    const semMilhar = str.replace(/\\.(\\ d{3})(?!\\d)/g, '$1');
    // Vírgula como decimal → ponto (ex: "13,5" → "13.5")
    const comPontoDecimal = semMilhar.replace(',', '.');
    return comPontoDecimal;
  }"""

# Tentar encontrar sem escapes
idx = txt.find('function sanitizarNumero')
if idx >= 0:
    end = txt.find('\n  }', idx) + 4
    old_block = txt[idx-2:end]
    new_block = """  function sanitizarNumero(valor) {
    if (!valor && valor !== 0) return valor;
    const str = String(valor).trim();
    const semMilhar = str.replace(/\\.(?=\\d{3}(?!\\d))/g, '');
    const comPontoDecimal = semMilhar.replace(',', '.');
    const num = parseFloat(comPontoDecimal);
    if (!isNaN(num)) return String(Math.round(num));
    return comPontoDecimal;
  }"""
    txt = txt[:idx-2] + new_block + txt[end:]
    fixed.append('OK: sanitizarNumero com arredondamento')
else:
    fixed.append('ERRO: sanitizarNumero não encontrado')

# ── 3. Adicionar estado para alertas de valores aberrantes ────────────────────
old_erros = "  const [erros, setErros] = useState({});"
new_erros = "  const [erros, setErros] = useState({});\n  const [aberrantes, setAberrantes] = useState({});"
if old_erros in txt:
    txt = txt.replace(old_erros, new_erros)
    fixed.append('OK: estado aberrantes adicionado')
else:
    fixed.append('ERRO: estado erros não encontrado')

# ── 4. Lógica de detecção de aberrantes no handleChange ──────────────────────
old_handle = """  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const novoValor = name === 'cpf' ? formatarCPF(value) : (type === 'checkbox' ? checked : value);
    setInputs(prev => ({ ...prev, [name]: novoValor }));
    if (erros[name]) setErros(prev => ({ ...prev, [name]: null }));
    if (name === 'bariatrica') {
      if (!checked) setDadosOBAColetados(null);
    }
  }"""

new_handle = """  const LIMITES_ABERRANTE = {
    ferritina:   { min: 1,   max: 5000 },
    hemoglobina: { min: 4,   max: 22   },
    vcm:         { min: 50,  max: 140  },
    rdw:         { min: 8,   max: 30   },
    satTransf:   { min: 1,   max: 99   },
  };

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const novoValor = name === 'cpf' ? formatarCPF(value) : (type === 'checkbox' ? checked : value);
    setInputs(prev => ({ ...prev, [name]: novoValor }));
    if (erros[name]) setErros(prev => ({ ...prev, [name]: null }));
    if (name === 'bariatrica') {
      if (!checked) setDadosOBAColetados(null);
    }
    // Crítica de valor aberrante
    if (LIMITES_ABERRANTE[name] && value !== '') {
      const num = parseFloat(String(value).replace(',', '.'));
      const lim = LIMITES_ABERRANTE[name];
      if (!isNaN(num) && (num < lim.min || num > lim.max)) {
        setAberrantes(prev => ({ ...prev, [name]: true }));
      } else {
        setAberrantes(prev => ({ ...prev, [name]: false }));
      }
    }
  }"""

if old_handle in txt:
    txt = txt.replace(old_handle, new_handle)
    fixed.append('OK: handleChange com detecção de aberrantes')
else:
    fixed.append('ERRO: handleChange não encontrado')

# ── 5. Passar aberrante para LabInput ─────────────────────────────────────────
labs = [
    ('ferritina',   "reference={inputs.sexo === 'M' ? '24-336' : '25-150'} value={inputs.ferritina} onChange={handleChange} error={erros.ferritina} hint=\"Não use ponto para valores superiores a 1000. Ex: 1140\""),
    ('hemoglobina', "reference={inputs.sexo === 'M' ? '13.5-17.5' : '12-15.5'} value={inputs.hemoglobina} onChange={handleChange} error={erros.hemoglobina}"),
    ('vcm',         "reference=\"80-100\" value={inputs.vcm} onChange={handleChange} error={erros.vcm}"),
    ('rdw',         "reference=\"11.5-15\" value={inputs.rdw} onChange={handleChange} error={erros.rdw}"),
    ('satTransf',   "reference=\"20-50\" value={inputs.satTransf} onChange={handleChange} error={erros.satTransf}"),
]

for name, ref_part in labs:
    old_lab = f'<LabInput label="' + ('Ferritina' if name=='ferritina' else 'Hemoglobina' if name=='hemoglobina' else 'VCM' if name=='vcm' else 'RDW-CV' if name=='rdw' else 'Sat. Transferrina') + f'" unit="' + ('ng/mL' if name=='ferritina' else 'g/dL' if name=='hemoglobina' else 'fL' if name=='vcm' else '%' if name=='rdw' else '%') + f'" name="{name}" {ref_part} />'
    new_lab = old_lab.replace(' />', f' aberrante={{!!aberrantes["{name}"]}} />')
    if old_lab in txt:
        txt = txt.replace(old_lab, new_lab)
        fixed.append(f'OK: aberrante passado para {name}')
    else:
        fixed.append(f'ERRO: LabInput {name} não encontrado')

# ── 6. LabInput aceitar e exibir aberrante ────────────────────────────────────
old_labinput = """function LabInput({ label, unit, name, reference, value, onChange, error, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label} <span className="text-xs text-gray-400">({unit})</span>
      </label>
      <input type="text" inputMode="decimal" name={name} value={value} onChange={onChange} placeholder="0"
        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${error ? 'border-red-500' : 'border-gray-200'}`} />
      <p className="text-xs text-gray-400 mt-0.5">Ref: {reference}</p>
      {hint && <p className="text-xs text-orange-500 mt-0.5">{hint}</p>}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}"""

new_labinput = """function LabInput({ label, unit, name, reference, value, onChange, error, hint, aberrante }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label} <span className="text-xs text-gray-400">({unit})</span>
      </label>
      <input type="text" inputMode="decimal" name={name} value={value} onChange={onChange} placeholder="0"
        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${error ? 'border-red-500' : aberrante ? 'border-yellow-400' : 'border-gray-200'}`} />
      <p className="text-xs text-gray-400 mt-0.5">Ref: {reference}</p>
      {hint && <p className="text-xs text-orange-500 mt-0.5">{hint}</p>}
      {aberrante && <p className="text-xs font-bold text-yellow-600 mt-0.5">⚠ VALOR ABERRANTE — CONFIRME</p>}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}"""

if old_labinput in txt:
    txt = txt.replace(old_labinput, new_labinput)
    fixed.append('OK: LabInput com crítica de aberrante')
else:
    fixed.append('ERRO: LabInput não encontrado')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
