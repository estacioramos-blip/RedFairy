filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# 1. Adicionar estado de cliques na fada
old_state = "  const htbTimer = useRef(null)"
new_state = """  const htbTimer = useRef(null)
  const [fadaClicks, setFadaClicks] = useState(0)
  const fadaTimer = useRef(null)"""

# 2. Adicionar função de clique na fada
old_func = "  function onHtbEnter() {"
new_func = """  function handleFadaClick() {
    const next = fadaClicks + 1
    setFadaClicks(next)
    if (fadaTimer.current) clearTimeout(fadaTimer.current)
    if (next >= 5) {
      setFadaClicks(0)
      // Entra direto na calculadora em modo demo
      localStorage.setItem('medico_crm', 'DEMO/BA')
      localStorage.setItem('medico_nome', 'Dr. Demo RedFairy')
      onModoMedico()
      return
    }
    fadaTimer.current = setTimeout(() => setFadaClicks(0), 2000)
  }

  function onHtbEnter() {"""

# 3. Adicionar onClick na fada grande
old_fada = '            <div className="fairy-showcase">\n              <img src={logo} alt="RedFairy — A Fada Vermelha" />'
new_fada = '            <div className="fairy-showcase" onClick={handleFadaClick} style={{ cursor:\'pointer\' }}>\n              <img src={logo} alt="RedFairy — A Fada Vermelha" />'

fixed = []
for old, new, label in [
    (old_state, new_state, 'estado fadaClicks'),
    (old_func, new_func, 'função handleFadaClick'),
    (old_fada, new_fada, 'onClick na fada'),
]:
    if old in txt:
        txt = txt.replace(old, new)
        fixed.append(f'OK: {label}')
    else:
        fixed.append(f'ERRO: {label}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print("Concluído.")
