import re

# ── App.jsx ──────────────────────────────────────────────────────────────────
app_path = 'C:/Users/Estacio/Desktop/redfairy/src/App.jsx'
with open(app_path, encoding='utf-8') as f:
    app = f.read()

# Adicionar estado demoMode e contadores de clique
old_state = "  const [adminClicks, setAdminClicks] = useState(0)"
new_state = """  const [adminClicks, setAdminClicks] = useState(0)
  const [demoMedicoClicks, setDemoMedicoClicks] = useState(0)
  const [demoPacienteClicks, setDemoPacienteClicks] = useState(0)
  const [demoMedicoTimer, setDemoMedicoTimer] = useState(null)
  const [demoPacienteTimer, setDemoPacienteTimer] = useState(null)"""

# Adicionar funções demo antes do if (modo === 'calculadora')
old_calc = "  if (modo === 'calculadora') {"
new_calc = """  function handleDemoMedico() {
    const next = demoMedicoClicks + 1
    setDemoMedicoClicks(next)
    if (demoMedicoTimer) clearTimeout(demoMedicoTimer)
    if (next >= 5) {
      setDemoMedicoClicks(0)
      localStorage.setItem('medico_crm', 'DEMO/BA')
      localStorage.setItem('medico_nome', 'Dr. Demo RedFairy')
      setCalcKey(k => k + 1)
      setModo('calculadora')
      return
    }
    const t = setTimeout(() => setDemoMedicoClicks(0), 2000)
    setDemoMedicoTimer(t)
    setCalcKey(k => k + 1)
    setModo('calculadora')
  }

  function handleDemoPaciente() {
    const next = demoPacienteClicks + 1
    setDemoPacienteClicks(next)
    if (demoPacienteTimer) clearTimeout(demoPacienteTimer)
    if (next >= 5) {
      setDemoPacienteClicks(0)
      localStorage.setItem('medico_crm', 'DEMO/BA')
      localStorage.setItem('medico_nome', 'Dr. Demo RedFairy')
      setCalcKey(k => k + 1)
      setModo('calculadora')
      return
    }
    const t = setTimeout(() => setDemoPacienteClicks(0), 2000)
    setDemoPacienteTimer(t)
    setModo('paciente')
  }

  if (modo === 'calculadora') {"""

# Atualizar onModoMedico e onModoPaciente na LandingPage para usar handlers de demo
old_landing = """    <LandingPage
      onModoMedico={() => { setCalcKey(k => k + 1); setModo('calculadora') }}
      onModoPaciente={() => setModo('paciente')}
    />"""
new_landing = """    <LandingPage
      onModoMedico={handleDemoMedico}
      onModoPaciente={handleDemoPaciente}
    />"""

fixed_app = []
for old, new, label in [
    (old_state, new_state, 'estados demo'),
    (old_calc, new_calc, 'funções demo'),
    (old_landing, new_landing, 'LandingPage handlers'),
]:
    if old in app:
        app = app.replace(old, new)
        fixed_app.append(f'OK App: {label}')
    else:
        fixed_app.append(f'ERRO App: {label}')

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app)

for msg in fixed_app:
    print(msg)

# ── Calculator.jsx — atalhos Ctrl+M/N/F/G ────────────────────────────────────
calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
with open(calc_path, encoding='utf-8') as f:
    calc = f.read()

old_keydown = """    function handleKeyDown(e) {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key === 'F' || e.key === 'f') { e.preventDefault(); carregarDemo('F'); }
      if (e.key === 'M' || e.key === 'm') { e.preventDefault(); carregarDemo('M'); }
    }"""

new_keydown = """    function handleKeyDown(e) {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key === 'F' || e.key === 'f') { e.preventDefault(); carregarDemo('F'); }
      if (e.key === 'M' || e.key === 'm') { e.preventDefault(); carregarDemo('M'); }
    }
    function handleDemoKey(e) {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return;
      const hoje = new Date().toISOString().split('T')[0];
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'M', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'M', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'F', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'F', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
    }"""

old_listener = """    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);"""

new_listener = """    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleDemoKey);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleDemoKey);
    };"""

fixed_calc = []
for old, new, label in [
    (old_keydown, new_keydown, 'atalhos Ctrl+M/N/F/G'),
    (old_listener, new_listener, 'listeners'),
]:
    if old in calc:
        calc = calc.replace(old, new)
        fixed_calc.append(f'OK Calc: {label}')
    else:
        fixed_calc.append(f'ERRO Calc: {label}')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(calc)

for msg in fixed_calc:
    print(msg)

print("Concluído.")
