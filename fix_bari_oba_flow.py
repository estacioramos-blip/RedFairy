app  = 'C:/Users/Estacio/Desktop/redfairy/src/App.jsx'
dash = 'C:/Users/Estacio/Desktop/redfairy/src/components/PatientDashboard.jsx'

fixed = []

# ── App.jsx: ao entrar no modo paciente, ler flag bariátrico ──────────────────
with open(app, encoding='utf-8') as f:
    txt = f.read()

# Quando sessão existe e há flag bariátrico, abrir OBAModal no PatientDashboard
old_render = """  if (modo === 'paciente') {
    if (demoPacientePerfil) return <PatientDashboard session={null} demoPerfil={demoPacientePerfil} onVoltar={() => { setModo('home'); setDemoPacientePerfil(null) }} />
    if (!session) return <AuthPage
      onLogin={() => {}}
      onVoltar={() => setModo('home')}
      onDemoEntrar={(perfil) => setDemoPacientePerfil(perfil)}
    />
    return <PatientDashboard session={session} onVoltar={() => setModo('home')} />
  }"""

new_render = """  if (modo === 'paciente') {
    if (demoPacientePerfil) return <PatientDashboard session={null} demoPerfil={demoPacientePerfil} onVoltar={() => { setModo('home'); setDemoPacientePerfil(null) }} />
    if (!session) return <AuthPage
      onLogin={() => {}}
      onVoltar={() => setModo('home')}
      onDemoEntrar={(perfil) => setDemoPacientePerfil(perfil)}
    />
    return <PatientDashboard session={session} onVoltar={() => setModo('home')} abrirOBA={!!localStorage.getItem('rf_flag')} />
  }"""

if old_render in txt:
    txt = txt.replace(old_render, new_render)
    fixed.append('OK: abrirOBA passado para PatientDashboard')
else:
    fixed.append('ERRO: render paciente não encontrado')

with open(app, 'w', encoding='utf-8') as f:
    f.write(txt)

# ── PatientDashboard: aceitar abrirOBA e abrir modal ─────────────────────────
with open(dash, encoding='utf-8') as f:
    dtxt = f.read()

# Aceitar prop abrirOBA
old_sig = "export default function PatientDashboard({ session, onVoltar, demoPerfil }) {"
new_sig = "export default function PatientDashboard({ session, onVoltar, demoPerfil, abrirOBA }) {"
if old_sig in dtxt:
    dtxt = dtxt.replace(old_sig, new_sig)
    fixed.append('OK: PatientDashboard aceita abrirOBA')
else:
    fixed.append('ERRO: assinatura PatientDashboard não encontrada')

# Adicionar estado showOBAModal se não existir
if 'showOBAModal' not in dtxt:
    old_state = "  const [showSobre, setShowSobre] = useState(false)"
    new_state = "  const [showSobre, setShowSobre] = useState(false)\n  const [showOBAModal, setShowOBAModal] = useState(false)"
    if old_state in dtxt:
        dtxt = dtxt.replace(old_state, new_state)
        fixed.append('OK: showOBAModal adicionado')
else:
    fixed.append('OK: showOBAModal já existe')

# No carregarDados, após carregar perfil real, verificar flag
old_carregar_end = """    setProfile(prof)"""
new_carregar_end = """    setProfile(prof)
    // Verificar flag bariátrico
    if (abrirOBA || localStorage.getItem('rf_flag') === 'bariatrica') {
      localStorage.removeItem('rf_flag')
      setTimeout(() => setShowOBAModal(true), 600)
    }"""

if old_carregar_end in dtxt and 'abrirOBA' not in dtxt:
    dtxt = dtxt.replace(old_carregar_end, new_carregar_end, 1)
    fixed.append('OK: flag bariátrico abre OBAModal após login')
else:
    fixed.append('AVISO: carregar já tem abrirOBA ou não encontrado')

# Também no modo demo
old_demo_end = """      setLoading(false)
      // Verificar flag bariátrico
      const flag = localStorage.getItem('rf_flag')
      if (flag === 'bariatrica') {
        localStorage.removeItem('rf_flag')
        setTimeout(() => setShowOBAModal(true), 500)
      }
      return"""
# Já deve estar lá do script anterior — verificar
if 'setTimeout(() => setShowOBAModal(true), 500)' in dtxt:
    fixed.append('OK: flag demo já configurado')

with open(dash, 'w', encoding='utf-8') as f:
    f.write(dtxt)

for msg in fixed:
    print(msg)
print('Concluído.')
