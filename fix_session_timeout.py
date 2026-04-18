calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Ao fazer login, salvar timestamp no localStorage
old_login_save = "    localStorage.setItem('medico_crm', conselhoLimpo)\n    localStorage.setItem('medico_nome', nome.trim())"
new_login_save = """    localStorage.setItem('medico_crm', conselhoLimpo)
    localStorage.setItem('medico_nome', nome.trim())
    localStorage.setItem('medico_login_at', Date.now().toString())"""

if old_login_save in txt:
    txt = txt.replace(old_login_save, new_login_save)
    fixed.append('OK: timestamp login salvo no cadastro')
else:
    fixed.append('ERRO: localStorage cadastro não encontrado')

# 2. Ao fazer login normal (não cadastro), também salvar timestamp
old_login_normal = "    localStorage.setItem('medico_crm', medicoCRM)\n    localStorage.setItem('medico_nome', medico.nome)"
new_login_normal = """    localStorage.setItem('medico_crm', medicoCRM)
    localStorage.setItem('medico_nome', medico.nome)
    localStorage.setItem('medico_login_at', Date.now().toString())"""

if old_login_normal in txt:
    txt = txt.replace(old_login_normal, new_login_normal)
    fixed.append('OK: timestamp login salvo no login normal')
else:
    fixed.append('ERRO: localStorage login normal não encontrado')

# 3. Adicionar estado sessaoExpirada e verificação no useEffect inicial
old_crm_read = "    const storedCRM  = localStorage.getItem('medico_crm')"
new_crm_read = """    // Verificar timeout de sessão (8 horas)
    const loginAt = localStorage.getItem('medico_login_at')
    const OITO_HORAS = 8 * 60 * 60 * 1000
    if (loginAt && Date.now() - parseInt(loginAt) > OITO_HORAS) {
      localStorage.removeItem('medico_crm')
      localStorage.removeItem('medico_nome')
      localStorage.removeItem('medico_login_at')
      setSessaoExpirada(true)
      return
    }

    const storedCRM  = localStorage.getItem('medico_crm')"""

if old_crm_read in txt:
    txt = txt.replace(old_crm_read, new_crm_read)
    fixed.append('OK: verificação timeout adicionada no useEffect')
else:
    fixed.append('ERRO: storedCRM não encontrado')

# 4. Adicionar estado sessaoExpirada
old_medico_nome = "  const [medicoNome, setMedicoNome] = useState('')"
new_medico_nome = """  const [medicoNome, setMedicoNome] = useState('')
  const [sessaoExpirada, setSessaoExpirada] = useState(false)"""

if old_medico_nome in txt:
    txt = txt.replace(old_medico_nome, new_medico_nome)
    fixed.append('OK: estado sessaoExpirada adicionado')
else:
    fixed.append('ERRO: medicoNome state não encontrado')

# 5. Mostrar mensagem de sessão expirada na tela de login
old_login_tela = "  if (!medicoCRM) return <AuthMedico"
new_login_tela = """  if (!medicoCRM) return <AuthMedico sessaoExpirada={sessaoExpirada}"""

if old_login_tela in txt:
    txt = txt.replace(old_login_tela, new_login_tela)
    fixed.append('OK: sessaoExpirada passada para AuthMedico')
else:
    fixed.append('ERRO: AuthMedico return não encontrado')

# 6. AuthMedico aceitar e exibir mensagem
old_auth_sig = "function AuthMedico({ onConcluir }) {"
new_auth_sig = "function AuthMedico({ onConcluir, sessaoExpirada }) {"
if old_auth_sig in txt:
    txt = txt.replace(old_auth_sig, new_auth_sig)
    fixed.append('OK: AuthMedico aceita sessaoExpirada')
else:
    fixed.append('ERRO: AuthMedico signature não encontrada')

# 7. Exibir aviso na tela de login
old_login_aviso = "        {/* Abas login / cadastro */}"
new_login_aviso = """        {sessaoExpirada && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-2 text-center">
            <p className="text-amber-800 text-sm font-semibold">⏱ Sua sessão expirou.</p>
            <p className="text-amber-700 text-xs mt-0.5">Faça login novamente para continuar.</p>
          </div>
        )}

        {/* Abas login / cadastro */}"""

if old_login_aviso in txt:
    txt = txt.replace(old_login_aviso, new_login_aviso)
    fixed.append('OK: aviso sessão expirada adicionado na tela de login')
else:
    fixed.append('ERRO: âncora abas login não encontrada')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
