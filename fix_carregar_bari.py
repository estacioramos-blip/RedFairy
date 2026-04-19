dash = 'C:/Users/Estacio/Desktop/redfairy/src/components/PatientDashboard.jsx'

with open(dash, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Bloco demo — adicionar verificação do flag
old_demo = """    if (demoPerfil) {
      setProfile(demoPerfil)
      setAvaliacoes([])
      setLoading(false)
      return
    }"""
new_demo = """    if (demoPerfil) {
      setProfile(demoPerfil)
      setAvaliacoes([])
      setLoading(false)
      if (localStorage.getItem('rf_flag') === 'bariatrica') {
        localStorage.removeItem('rf_flag')
        setTimeout(() => setShowOBAModal(true), 500)
      }
      return
    }"""

if old_demo in txt:
    txt = txt.replace(old_demo, new_demo)
    fixed.append('OK: flag bariátrico no bloco demo')
else:
    fixed.append('ERRO: bloco demo não encontrado')

# 2. Bloco real — após setProfile(prof), verificar flag
old_prof = "    setProfile(prof)\n    const { data: avals }"
new_prof = """    setProfile(prof)
    if (abrirOBA || localStorage.getItem('rf_flag') === 'bariatrica') {
      localStorage.removeItem('rf_flag')
      setTimeout(() => setShowOBAModal(true), 600)
    }
    const { data: avals }"""

if old_prof in txt:
    txt = txt.replace(old_prof, new_prof)
    fixed.append('OK: flag bariátrico no bloco real')
else:
    fixed.append('ERRO: setProfile(prof) não encontrado')

with open(dash, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
