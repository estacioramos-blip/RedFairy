import os

lp   = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'
app  = 'C:/Users/Estacio/Desktop/redfairy/src/App.jsx'
calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

fixed = []

# ── 1. LandingPage: botão Sou Bariátrico ──────────────────────────────────────
with open(lp, encoding='utf-8') as f:
    txt = f.read()

old_btn = "onClick={() => setShowOBA(true)}"
new_btn = "onClick={() => onModoMedico('bariatrica')}"

if old_btn in txt:
    txt = txt.replace(old_btn, new_btn)
    fixed.append('OK: botão Sou Bariátrico corrigido')
    with open(lp, 'w', encoding='utf-8') as f:
        f.write(txt)
else:
    fixed.append('ERRO: onClick setShowOBA não encontrado na LandingPage')

# ── 2. App.jsx: passar flag para Calculator via window ─────────────────────────
with open(app, encoding='utf-8') as f:
    txt = f.read()

old_app = "      onModoMedico={handleDemoMedico}"
new_app = "      onModoMedico={(flag) => { handleDemoMedico(); if (flag) window.__rfFlag = flag; }}"

if old_app in txt:
    txt = txt.replace(old_app, new_app)
    fixed.append('OK: App.jsx onModoMedico com flag')
    with open(app, 'w', encoding='utf-8') as f:
        f.write(txt)
else:
    fixed.append('ERRO: onModoMedico no App não encontrado')
    # Mostrar contexto
    idx = txt.find('onModoMedico')
    print('Contexto onModoMedico:', repr(txt[idx-20:idx+80]))

# ── 3. Calculator.jsx: preFlag ────────────────────────────────────────────────
with open(calc, encoding='utf-8') as f:
    txt = f.read()

# a) Adicionar preFlag ao useState do Calculator
old_cad = "  const [cadastrado, setCadastrado] = useState(null)\n  const [preFlag, setPreFlag] = useState(null)"
if old_cad in txt:
    fixed.append('OK: preFlag já existe no Calculator')
else:
    old_cad2 = "  const [cadastrado, setCadastrado] = useState(null)"
    new_cad2 = "  const [cadastrado, setCadastrado] = useState(null)\n  const [preFlag, setPreFlag] = useState(null)"
    if old_cad2 in txt:
        txt = txt.replace(old_cad2, new_cad2)
        fixed.append('OK: preFlag state adicionado')
    else:
        fixed.append('ERRO: useState cadastrado não encontrado')

# b) useEffect para ler window.__rfFlag
old_eff = "    // Pré-marcar flag vindo da LandingPage (ex: bariatrica)"
if old_eff in txt:
    fixed.append('OK: useEffect preFlag já existe')
else:
    old_eff2 = "    if (window.__rfFlag) {"
    if old_eff2 not in txt:
        # Inserir no useEffect existente antes do return de modoDemo
        old_ue = """    const crm = localStorage.getItem('medico_crm')
    const nome = localStorage.getItem('medico_nome')
    setCadastrado(!!crm)
    setMedicoNome(nome || '')
    setMedicoCRM(crm || '')
  }, [modoDemo])"""
        new_ue = """    const crm = localStorage.getItem('medico_crm')
    const nome = localStorage.getItem('medico_nome')
    setCadastrado(!!crm)
    setMedicoNome(nome || '')
    setMedicoCRM(crm || '')
    if (window.__rfFlag) { setPreFlag(window.__rfFlag); window.__rfFlag = null }
  }, [modoDemo])"""
        if old_ue in txt:
            txt = txt.replace(old_ue, new_ue)
            fixed.append('OK: useEffect lê window.__rfFlag')
        else:
            fixed.append('ERRO: useEffect modoDemo não encontrado')

# c) Passar preFlag para CalculatorForm
old_ret = "  return <CalculatorForm onVoltar={onVoltar} medicoNome={medicoNome} medicoCRM={medicoCRM} onLogout={handleLogout} />"
new_ret = "  return <CalculatorForm onVoltar={onVoltar} medicoNome={medicoNome} medicoCRM={medicoCRM} onLogout={handleLogout} preFlag={preFlag} />"
if old_ret in txt:
    txt = txt.replace(old_ret, new_ret)
    fixed.append('OK: preFlag passado para CalculatorForm')
elif "preFlag={preFlag}" in txt:
    fixed.append('OK: preFlag já está no return')
else:
    fixed.append('ERRO: return CalculatorForm não encontrado')

# d) CalculatorForm aceitar preFlag
old_cf = "function CalculatorForm({ onVoltar, medicoNome, medicoCRM, onLogout }) {"
new_cf = "function CalculatorForm({ onVoltar, medicoNome, medicoCRM, onLogout, preFlag }) {"
if old_cf in txt:
    txt = txt.replace(old_cf, new_cf)
    fixed.append('OK: CalculatorForm aceita preFlag')
elif "preFlag }" in txt or "preFlag}" in txt:
    fixed.append('OK: preFlag já está no CalculatorForm')
else:
    fixed.append('ERRO: CalculatorForm não encontrado')

# e) useEffect para aplicar preFlag nos inputs
if "if (preFlag === 'bariatrica')" in txt:
    fixed.append('OK: useEffect preFlag já existe no CalculatorForm')
else:
    old_res = "  const [resultado, setResultado] = useState(null);"
    new_res = """  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (preFlag === 'bariatrica') {
      setInputs(prev => ({ ...prev, bariatrica: true }))
    }
  }, [preFlag]);"""
    if old_res in txt:
        txt = txt.replace(old_res, new_res)
        fixed.append('OK: useEffect preFlag aplicado nos inputs')
    else:
        fixed.append('ERRO: useState resultado não encontrado')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
