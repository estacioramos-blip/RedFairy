lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = 'ENTRA EM MODO PACIENTE'
new = 'SIGA AS INSTRUÇÕES'

if old in txt:
    txt = txt.replace(old, new)
    open(lp, 'w', encoding='utf-8').write(txt)
    print('OK: texto alterado')
else:
    print('ERRO: texto não encontrado')
