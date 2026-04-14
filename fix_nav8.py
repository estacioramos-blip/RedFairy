filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

old = "  body { font-family: 'DM Sans', -apple-system, sans-serif; color: var(--text); background: var(--white); line-height: 1.65; overflow-x: hidden; -webkit-font-smoothing: antialiased; }"
new = "  body { font-family: 'DM Sans', -apple-system, sans-serif; color: var(--text); background: var(--white); line-height: 1.65; overflow-x: hidden; -webkit-font-smoothing: antialiased; scrollbar-gutter: stable; }"

if old in txt:
    txt = txt.replace(old, new)
    open(filepath, 'w', encoding='utf-8').write(txt)
    print('OK: scrollbar-gutter adicionado')
else:
    print('ERRO: trecho nao encontrado')
