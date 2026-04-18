lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = "  .ind:hover { border-color: var(--cherry); color: var(--cherry); background: var(--cherry-bg); }"
new = "  .ind:hover { border-color: var(--border2); }"

if old in txt:
    txt = txt.replace(old, new)
    open(lp, 'w', encoding='utf-8').write(txt)
    print('OK: hover vermelho das indicações removido')
else:
    print('ERRO: .ind:hover não encontrado')
