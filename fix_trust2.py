lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Corrigir número
old1 = '<span>17 variáveis clínicas</span>'
new1 = '<span>30 variáveis clínicas</span>'

# Centralizar trust
old2 = '<div className="trust">'
new2 = '<div className="trust" style={{ justifyContent:\'center\' }}>'

fixed = []
for old, new, label in [(old1, new1, '30 variáveis'), (old2, new2, 'trust centralizado')]:
    if old in txt:
        txt = txt.replace(old, new)
        fixed.append(f'OK: {label}')
    else:
        fixed.append(f'ERRO: {label}')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
