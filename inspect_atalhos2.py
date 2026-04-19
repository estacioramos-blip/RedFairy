calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
dash = 'C:/Users/Estacio/Desktop/redfairy/src/components/PatientDashboard.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

# Pegar bloco completo dos atalhos
idx = txt.find('Ctrl+M')
start = txt.rfind('<div', 0, idx)
end = txt.find('</div>', idx) + 6
print('=== ATALHOS NO CALCULATOR ===')
print(repr(txt[start:end+200]))

with open(dash, encoding='utf-8') as f:
    dtxt = f.read()

# Ver header do PatientDashboard
idx2 = dtxt.find('<header')
end2 = dtxt.find('</header>', idx2) + 9
print('\n=== HEADER PATIENTDASHBOARD ===')
print(repr(dtxt[idx2:end2]))
