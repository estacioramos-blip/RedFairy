calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
app_path  = 'C:/Users/Estacio/Desktop/redfairy/src/App.jsx'

# ── Calculator.jsx — aceitar prop modoDemo ────────────────────────────────
with open(calc_path, encoding='utf-8') as f:
    calc = f.read()

old = "export default function Calculator({ onVoltar }) {"
new = "export default function Calculator({ onVoltar, modoDemo }) {"

if old in calc:
    calc = calc.replace(old, new)
    print('OK: prop modoDemo adicionada')
else:
    print('ERRO: assinatura Calculator não encontrada')

# Modificar o useEffect para usar modoDemo
old_effect = """  useEffect(() => {
    const crm = localStorage.getItem('medico_crm')
    const nome = localStorage.getItem('medico_nome')
    setCadastrado(!!crm)
    setMedicoNome(nome || '')
    setMedicoCRM(crm || '')
  }, [])"""

new_effect = """  useEffect(() => {
    if (modoDemo) {
      setCadastrado(true)
      setMedicoNome('Dr. Demo RedFairy')
      setMedicoCRM('DEMO/BA')
      return
    }
    const crm = localStorage.getItem('medico_crm')
    const nome = localStorage.getItem('medico_nome')
    setCadastrado(!!crm)
    setMedicoNome(nome || '')
    setMedicoCRM(crm || '')
  }, [modoDemo])"""

if old_effect in calc:
    calc = calc.replace(old_effect, new_effect)
    print('OK: useEffect com modoDemo')
else:
    print('ERRO: useEffect não encontrado')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(calc)

# ── App.jsx — passar modoDemo={true} quando vier da LandingPage ──────────
with open(app_path, encoding='utf-8') as f:
    app = f.read()

old_calc = "      <Calculator key={calcKey} onVoltar={() => setModo('home')} />"
new_calc = "      <Calculator key={calcKey} onVoltar={() => setModo('home')} modoDemo={!localStorage.getItem('medico_crm')} />"

if old_calc in app:
    app = app.replace(old_calc, new_calc)
    print('OK: modoDemo passado no App')
else:
    print('ERRO: Calculator no App não encontrado')

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app)

print('Concluído.')
