auth_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'
dash_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/PatientDashboard.jsx'

fixed = []

# ── AuthPage.jsx: máscara DD/MM/AAAA ─────────────────────────────────────────
with open(auth_path, encoding='utf-8') as f:
    auth = f.read()

# Adicionar função formatarDataNascimento
old_fn = "  function formatarCPF(valor) {"
new_fn = """  function formatarDataNascimento(valor) {
    const digits = valor.replace(/\\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return digits.slice(0,2) + '/' + digits.slice(2)
    return digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4)
  }

  function formatarCPF(valor) {"""

if old_fn in auth:
    auth = auth.replace(old_fn, new_fn)
    fixed.append('OK: formatarDataNascimento adicionada')
else:
    fixed.append('ERRO: formatarCPF não encontrado')

# Aplicar máscara no input de data de nascimento
old_input = """                <input type="text" value={dataNascimento}
                  onChange={e => setDataNascimento(e.target.value)}
                  placeholder="DD/MM/AAAA" maxLength={10} inputMode="numeric"
                  className={inputClass} />"""
new_input = """                <input type="text" value={dataNascimento}
                  onChange={e => setDataNascimento(formatarDataNascimento(e.target.value))}
                  placeholder="DD/MM/AAAA" maxLength={10} inputMode="numeric"
                  className={inputClass} />"""

if old_input in auth:
    auth = auth.replace(old_input, new_input)
    fixed.append('OK: máscara data nascimento aplicada')
else:
    fixed.append('ERRO: input data nascimento não encontrado')

with open(auth_path, 'w', encoding='utf-8') as f:
    f.write(auth)

# ── PatientDashboard.jsx: bolinha iniciais + botão Sair ──────────────────────
with open(dash_path, encoding='utf-8') as f:
    dash = f.read()

old_header = """        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onVoltar}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <img src={logo} alt="RedFairy" className="w-8 h-8 object-contain"
              style={{ filter: 'brightness(10)' }} />
            <div>
              <h1 className="text-xl font-bold">RedFairy</h1>
              <p className="text-red-200 text-xs">Olá, {profile?.nome}!</p>
            </div>
          </div>
          <button onClick={() => setShowSobre(true)}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
            Sobre
          </button>
        </div>"""

new_header = """        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onVoltar}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <img src={logo} alt="RedFairy" className="w-8 h-8 object-contain"
              style={{ filter: 'brightness(10)' }} />
            <div>
              <h1 className="text-xl font-bold">RedFairy</h1>
              <p className="text-red-200 text-xs">Olá, {profile?.nome?.split(' ')[0]}!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile?.nome && (
              <div title={profile.nome}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-content-center flex-shrink-0"
                style={{ border: '2px solid rgba(255,255,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span className="text-red-700 font-black text-xs">
                  {profile.nome.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase()}
                </span>
              </div>
            )}
            <button onClick={handleLogout}
              className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
              Sair
            </button>
            <button onClick={() => setShowSobre(true)}
              className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
              Sobre
            </button>
          </div>
        </div>"""

if old_header in dash:
    dash = dash.replace(old_header, new_header)
    fixed.append('OK: bolinha iniciais + botão Sair adicionados')
else:
    fixed.append('ERRO: header PatientDashboard não encontrado')

with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(dash)

for msg in fixed:
    print(msg)
print('Concluído.')
