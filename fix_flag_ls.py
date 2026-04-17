calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
app  = 'C:/Users/Estacio/Desktop/redfairy/src/App.jsx'

with open(app, encoding='utf-8') as f:
    txt = f.read()

# App: salvar flag no localStorage antes de mudar modo
old = "      onModoMedico={(flag) => { handleDemoMedico(); if (flag) window.__rfFlag = flag; }}"
new = "      onModoMedico={(flag) => { if (flag) localStorage.setItem('rf_flag', flag); handleDemoMedico(); }}"
if old in txt:
    txt = txt.replace(old, new)
    open(app, 'w', encoding='utf-8').write(txt)
    print('OK: App usa localStorage para flag')
else:
    print('ERRO: App onModoMedico não encontrado')

with open(calc, encoding='utf-8') as f:
    txt = f.read()

# Calculator: ler flag do localStorage no useEffect
old_ue = "    if (window.__rfFlag) { setPreFlag(window.__rfFlag); window.__rfFlag = null }"
new_ue = "    const flag = localStorage.getItem('rf_flag'); if (flag) { setPreFlag(flag); localStorage.removeItem('rf_flag') }"
if old_ue in txt:
    txt = txt.replace(old_ue, new_ue)
    print('OK: Calculator lê flag do localStorage')
else:
    print('ERRO: useEffect flag não encontrado')

# CalculatorForm: ler flag diretamente do localStorage no useState inicial
old_init = "    bariatrica: preFlag === 'bariatrica',"
new_init = "    bariatrica: preFlag === 'bariatrica' || localStorage.getItem('rf_flag') === 'bariatrica',"
if old_init in txt:
    txt = txt.replace(old_init, new_init)
    print('OK: inputs init lê localStorage também')
else:
    print('ERRO: inputs init não encontrado')

open(calc, 'w', encoding='utf-8').write(txt)
print('Concluído.')
