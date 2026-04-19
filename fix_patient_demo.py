app  = 'C:/Users/Estacio/Desktop/redfairy/src/App.jsx'
auth = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'

fixed = []

# ── App.jsx: adicionar estado demoPaciente e passar para PatientDashboard ─────
with open(app, encoding='utf-8') as f:
    txt = f.read()

# Adicionar estado demoPacientePerfil
old_state = "  const [demoPacienteTimer, setDemoPacienteTimer] = useState(null)"
new_state = "  const [demoPacienteTimer, setDemoPacienteTimer] = useState(null)\n  const [demoPacientePerfil, setDemoPacientePerfil] = useState(null)"
if old_state in txt:
    txt = txt.replace(old_state, new_state)
    fixed.append('OK: estado demoPacientePerfil adicionado')
else:
    fixed.append('ERRO: estado demoPacienteTimer não encontrado')

# Atualizar render do modo paciente para aceitar demo
old_paciente_render = """  if (modo === 'paciente') {
    if (!session) return <AuthPage onLogin={() => {}} onVoltar={() => setModo('home')} />
    return <PatientDashboard session={session} onVoltar={() => setModo('home')} />
  }"""

new_paciente_render = """  if (modo === 'paciente') {
    if (demoPacientePerfil) return <PatientDashboard session={null} demoPerfil={demoPacientePerfil} onVoltar={() => { setModo('home'); setDemoPacientePerfil(null) }} />
    if (!session) return <AuthPage
      onLogin={() => {}}
      onVoltar={() => setModo('home')}
      onDemoEntrar={(perfil) => setDemoPacientePerfil(perfil)}
    />
    return <PatientDashboard session={session} onVoltar={() => setModo('home')} />
  }"""

if old_paciente_render in txt:
    txt = txt.replace(old_paciente_render, new_paciente_render)
    fixed.append('OK: render paciente aceita demo')
else:
    fixed.append('ERRO: render paciente não encontrado')

with open(app, 'w', encoding='utf-8') as f:
    f.write(txt)

# ── AuthPage.jsx: ao pressionar Ctrl+M/B/F/G chamar onDemoEntrar ──────────────
with open(auth, encoding='utf-8') as f:
    atxt = f.read()

# Atualizar assinatura do AuthPage para receber onDemoEntrar
old_sig = "export default function AuthPage({ onVoltar }) {"
new_sig = "export default function AuthPage({ onVoltar, onDemoEntrar }) {"
if old_sig in atxt:
    atxt = atxt.replace(old_sig, new_sig)
    fixed.append('OK: AuthPage aceita onDemoEntrar')
else:
    fixed.append('ERRO: assinatura AuthPage não encontrada')

# Substituir entrarComoDemo para chamar onDemoEntrar
old_entrar = """      const entrarComoDemo = (sx, idade) => {
        e.preventDefault()
        // Entrar direto sem cadastro/login
        const nomeDemo = sx === 'M'
          ? (idade <= 30 ? 'Paciente Demo Masculino Jovem' : 'Paciente Demo Masculino Sênior')
          : (idade <= 30 ? 'Paciente Demo Feminino Jovem' : 'Paciente Demo Feminino Sênior')
        const nascAno = new Date().getFullYear() - idade
        const demoSession = {
          user: { id: `demo-${sx}-${idade}` },
          _demo: true,
          _perfil: {
            nome: nomeDemo,
            sexo: sx,
            data_nascimento: `${nascAno}-01-01`,
            cpf: '00000000000',
            celular: '71999999999',
          }
        }
        localStorage.setItem('rf_patient_demo', JSON.stringify(demoSession._perfil))
        onConcluir && onConcluir(demoSession)
      }"""

new_entrar = """      const entrarComoDemo = (sx, idade) => {
        e.preventDefault()
        const nomeDemo = sx === 'M'
          ? (idade <= 30 ? 'Paciente Demo Masculino Jovem' : 'Paciente Demo Masculino Sênior')
          : (idade <= 30 ? 'Paciente Demo Feminino Jovem' : 'Paciente Demo Feminino Sênior')
        const nascAno = new Date().getFullYear() - idade
        const perfil = {
          nome: nomeDemo,
          sexo: sx,
          data_nascimento: `${nascAno}-01-01`,
          cpf: '00000000000',
          celular: '71999999999',
        }
        onDemoEntrar && onDemoEntrar(perfil)
      }"""

if old_entrar in atxt:
    atxt = atxt.replace(old_entrar, new_entrar)
    fixed.append('OK: entrarComoDemo chama onDemoEntrar')
else:
    fixed.append('ERRO: entrarComoDemo não encontrado')

with open(auth, 'w', encoding='utf-8') as f:
    f.write(atxt)

# ── PatientDashboard: aceitar demoPerfil ──────────────────────────────────────
dash = 'C:/Users/Estacio/Desktop/redfairy/src/components/PatientDashboard.jsx'
with open(dash, encoding='utf-8') as f:
    dtxt = f.read()

old_dash_sig = "export default function PatientDashboard({ session, onVoltar }) {"
new_dash_sig = "export default function PatientDashboard({ session, onVoltar, demoPerfil }) {"
if old_dash_sig in dtxt:
    dtxt = dtxt.replace(old_dash_sig, new_dash_sig)
    fixed.append('OK: PatientDashboard aceita demoPerfil')
else:
    fixed.append('ERRO: assinatura PatientDashboard não encontrada')

# Usar demoPerfil no carregarDados
old_carregar = """  async function carregarDados() {
    setLoading(true)
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    if (!prof) {
      await supabase.auth.signOut()
      onVoltar()
      return
    }
    setProfile(prof)"""

new_carregar = """  async function carregarDados() {
    setLoading(true)
    if (demoPerfil) {
      setProfile(demoPerfil)
      setAvaliacoes([])
      setLoading(false)
      return
    }
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    if (!prof) {
      await supabase.auth.signOut()
      onVoltar()
      return
    }
    setProfile(prof)"""

if old_carregar in dtxt:
    dtxt = dtxt.replace(old_carregar, new_carregar)
    fixed.append('OK: carregarDados usa demoPerfil')
else:
    fixed.append('ERRO: carregarDados não encontrado')

with open(dash, 'w', encoding='utf-8') as f:
    f.write(dtxt)

for msg in fixed:
    print(msg)
print('Concluído.')
