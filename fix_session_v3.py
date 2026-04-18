calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

old = "carregarMedico() {\n      if (!medicoCRM) return;"
new = """carregarMedico() {
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

if old in txt:
    txt = txt.replace(old, new)
    open(calc, 'w', encoding='utf-8').write(txt)
    print('OK: verificação timeout adicionada no carregarMedico')
else:
    print('ERRO: âncora não encontrada')
