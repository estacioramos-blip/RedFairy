calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Login normal — salvar timestamp
old_login = "    localStorage.setItem('medico_crm', medico.crm)\n    localStorage.setItem('medico_nome', medico.nome || '')\n    onConcluir"
new_login = "    localStorage.setItem('medico_crm', medico.crm)\n    localStorage.setItem('medico_nome', medico.nome || '')\n    localStorage.setItem('medico_login_at', Date.now().toString())\n    onConcluir"
if old_login in txt:
    txt = txt.replace(old_login, new_login)
    fixed.append('OK: timestamp login normal salvo')
else:
    fixed.append('ERRO: login normal não encontrado')

# 2. Verificação timeout — no useEffect que carrega médico
old_carregar = "  function carregarMedico() {\n      if (!medicoCRM) return;"
new_carregar = """  function carregarMedico() {
      // Verificar timeout de sessão (8 horas)
      const loginAt = localStorage.getItem('medico_login_at')
      const OITO_HORAS = 8 * 60 * 60 * 1000
      if (loginAt && Date.now() - parseInt(loginAt) > OITO_HORAS) {
        localStorage.removeItem('medico_crm')
        localStorage.removeItem('medico_nome')
        localStorage.removeItem('medico_login_at')
        setSessaoExpirada(true)
        return
      }
      if (!medicoCRM) return;"""
if old_carregar in txt:
    txt = txt.replace(old_carregar, new_carregar)
    fixed.append('OK: verificação timeout adicionada')
else:
    fixed.append('ERRO: carregarMedico não encontrado')

# 3. AuthMedico aceitar sessaoExpirada e onVoltar
old_auth = "function AuthMedico({ onConcluir, onVoltar }) {"
new_auth = "function AuthMedico({ onConcluir, onVoltar, sessaoExpirada }) {"
if old_auth in txt:
    txt = txt.replace(old_auth, new_auth)
    fixed.append('OK: AuthMedico aceita sessaoExpirada')
else:
    fixed.append('ERRO: AuthMedico signature não encontrada')

# 4. Passar sessaoExpirada para AuthMedico — procurar o return com AuthMedico
old_return_auth = "<AuthMedico sessaoExpirada={sessaoExpirada}"
if old_return_auth not in txt:
    # Encontrar onde AuthMedico é chamado
    idx = txt.find('<AuthMedico')
    if idx >= 0:
        end = txt.find('/>', idx) + 2
        old_call = txt[idx:end]
        new_call = old_call.replace('<AuthMedico', '<AuthMedico sessaoExpirada={sessaoExpirada}')
        txt = txt.replace(old_call, new_call)
        fixed.append('OK: sessaoExpirada passada para AuthMedico')
    else:
        fixed.append('ERRO: chamada AuthMedico não encontrada')
else:
    fixed.append('OK: sessaoExpirada já passada')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
