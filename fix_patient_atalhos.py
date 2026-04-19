dash = 'C:/Users/Estacio/Desktop/redfairy/src/components/PatientDashboard.jsx'

with open(dash, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# Adicionar useRef e atalhos após os imports/estados
old_useeffect = "  useEffect(() => { carregarDados() }, [])"
new_useeffect = """  useEffect(() => { carregarDados() }, [])

  useEffect(() => {
    function handleDemoKey(e) {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return
      const hoje = new Date().toISOString().split('T')[0]
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setInputs(p => ({ ...p, sexo:'M', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }))
        setResultado(null)
        setTela('nova')
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        setInputs(p => ({ ...p, sexo:'M', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }))
        setResultado(null)
        setTela('nova')
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setInputs(p => ({ ...p, sexo:'F', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }))
        setResultado(null)
        setTela('nova')
      }
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault()
        setInputs(p => ({ ...p, sexo:'F', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }))
        setResultado(null)
        setTela('nova')
      }
    }
    window.addEventListener('keydown', handleDemoKey)
    return () => window.removeEventListener('keydown', handleDemoKey)
  }, [])"""

if old_useeffect in txt:
    txt = txt.replace(old_useeffect, new_useeffect)
    fixed.append('OK: atalhos Ctrl adicionados ao PatientDashboard')
else:
    fixed.append('ERRO: âncora useEffect não encontrada')

# Adicionar indicador visual dos atalhos no header
old_header_title = '              <h1 className="text-xl font-bold">RedFairy</h1>\n              <p className="text-red-200 text-xs">Olá, {profile?.nome?.split(\' \')[0]}!</p>'
new_header_title = """              <h1 className="text-xl font-bold">RedFairy</h1>
              <p className="text-red-200 text-xs">Olá, {profile?.nome?.split(' ')[0]}!</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'1px', marginTop:'2px' }}>
                <span style={{ color:'rgba(252,165,165,0.7)', fontSize:'8px', fontFamily:'monospace' }}>Ctrl+M ♂20  Ctrl+B ♂50</span>
                <span style={{ color:'rgba(252,165,165,0.7)', fontSize:'8px', fontFamily:'monospace' }}>Ctrl+F ♀20  Ctrl+G ♀50</span>
              </div>"""

if old_header_title in txt:
    txt = txt.replace(old_header_title, new_header_title)
    fixed.append('OK: indicador atalhos adicionado no header')
else:
    fixed.append('ERRO: header title não encontrado')

with open(dash, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
