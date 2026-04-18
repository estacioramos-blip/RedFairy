lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = '      <section className="filosofia" id="filosofia">'
new = '      <section className="filosofia" id="filosofia" style={{ display: navOpen || window.location.hash === \'#filosofia\' ? \'block\' : \'none\' }}>'

# Abordagem mais robusta: usar estado
# Adicionar estado showFilosofia
old_state = "  const [navOpen,     setNavOpen]     = useState(false)"
new_state = "  const [navOpen,     setNavOpen]     = useState(false)\n  const [showFilosofia, setShowFilosofia] = useState(false)"

fixed = []

if old_state in txt:
    txt = txt.replace(old_state, new_state)
    fixed.append('OK: estado showFilosofia adicionado')
else:
    fixed.append('ERRO: estado navOpen não encontrado')

# Esconder a section com o estado
old_sec = '      <section className="filosofia" id="filosofia">'
new_sec = '      <section className="filosofia" id="filosofia" style={{ display: showFilosofia ? \'block\' : \'none\' }}>'
if old_sec in txt:
    txt = txt.replace(old_sec, new_sec)
    fixed.append('OK: section filosofia com display condicional')
else:
    fixed.append('ERRO: section filosofia não encontrada')

# Link do menu para mostrar a seção ao clicar
old_link = '          <a href="#filosofia">Filosofia</a>'
new_link = '          <a href="#filosofia" onClick={() => setShowFilosofia(true)}>Filosofia</a>'
if old_link in txt:
    txt = txt.replace(old_link, new_link)
    fixed.append('OK: link menu Filosofia com onClick')
else:
    fixed.append('ERRO: link Filosofia no menu não encontrado')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
