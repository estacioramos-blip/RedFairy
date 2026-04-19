dash = 'C:/Users/Estacio/Desktop/redfairy/src/components/PatientDashboard.jsx'

with open(dash, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. No bloco demo — trocar setShowOBAModal por setTela e marcar bariatrica
old_demo = """      if (localStorage.getItem('rf_flag') === 'bariatrica') {
        localStorage.removeItem('rf_flag')
        setTimeout(() => setShowOBAModal(true), 500)
      }"""
new_demo = """      if (localStorage.getItem('rf_flag') === 'bariatrica') {
        localStorage.removeItem('rf_flag')
        setTimeout(() => {
          setTela('nova')
          setInputs(prev => ({ ...prev, bariatrica: true }))
        }, 300)
      }"""

if old_demo in txt:
    txt = txt.replace(old_demo, new_demo)
    fixed.append('OK: flag demo abre nova avaliacao com bariatrica marcado')
else:
    fixed.append('ERRO: bloco demo não encontrado')

# 2. No bloco real — trocar setShowOBAModal por setTela e marcar bariatrica
old_real = """    if (abrirOBA || localStorage.getItem('rf_flag') === 'bariatrica') {
      localStorage.removeItem('rf_flag')
      setTimeout(() => setShowOBAModal(true), 600)
    }"""
new_real = """    if (abrirOBA || localStorage.getItem('rf_flag') === 'bariatrica') {
      localStorage.removeItem('rf_flag')
      setTimeout(() => {
        setTela('nova')
        setInputs(prev => ({ ...prev, bariatrica: true }))
      }, 400)
    }"""

if old_real in txt:
    txt = txt.replace(old_real, new_real)
    fixed.append('OK: flag real abre nova avaliacao com bariatrica marcado')
else:
    fixed.append('ERRO: bloco real não encontrado')

with open(dash, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
