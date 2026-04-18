lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# Fechar menu em todos os links de navegação
replacements = [
    ('          <a href="#filosofia" onClick={() => setShowFilosofia(true)}>Filosofia</a>',
     '          <a href="#filosofia" onClick={() => { setShowFilosofia(true); setNavOpen(false) }}>Filosofia</a>'),
    ('          <a href="#como-funciona">Como funciona</a>',
     '          <a href="#como-funciona" onClick={() => setNavOpen(false)}>Como funciona</a>'),
    ('          <a href="#indicacoes">Indicações</a>',
     '          <a href="#indicacoes" onClick={() => setNavOpen(false)}>Indicações</a>'),
    ('          <a href="#avaliar">Avaliar</a>',
     '          <a href="#avaliar" onClick={() => setNavOpen(false)}>Avaliar</a>'),
    ('          <a href="#oba">Projeto OBA</a>',
     '          <a href="#oba" onClick={() => setNavOpen(false)}>Projeto OBA</a>'),
    ('          <button className="btn-sm btn-wine" onClick={onModoMedico}>Acessar</button>',
     '          <button className="btn-sm btn-wine" onClick={() => { onModoMedico(); setNavOpen(false) }}>Acessar</button>'),
]

for old, new in replacements:
    if old in txt:
        txt = txt.replace(old, new)
        fixed.append(f'OK: {old[:40].strip()}...')
    else:
        fixed.append(f'ERRO: {old[:40].strip()}...')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
