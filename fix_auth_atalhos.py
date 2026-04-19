auth = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'

with open(auth, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# Substituir o useEffect do atalho secreto existente para incluir M/B/F/G
old_atalho = """  useEffect(() => {
    function handleKey(e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setCpf('00000000000')
        setAvaliacoesPendentes(0)
        setEtapa('cadastro')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])"""

new_atalho = """  useEffect(() => {
    function handleKey(e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setCpf('00000000000')
        setAvaliacoesPendentes(0)
        setEtapa('cadastro')
      }
    }
    function handleDemoKey(e) {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return
      const preencherCadastro = (sx, idade) => {
        e.preventDefault()
        setCpf('00000000000')
        setNome(sx === 'M' ? 'Paciente Demo Masculino' : 'Paciente Demo Feminino')
        setSexo(sx)
        setDataNascimento(() => {
          const ano = new Date().getFullYear() - idade
          return `01/01/${ano}`
        })
        setCelular('(71) 99999-9999')
        setEmail(`demo${sx.toLowerCase()}${idade}@redfairy.bio`)
        setEmailConfirm(`demo${sx.toLowerCase()}${idade}@redfairy.bio`)
        setSenha('demo1234')
        setSenhaConfirm('demo1234')
        setAvaliacoesPendentes(0)
        setEtapa('cadastro')
      }
      if (e.key === 'm' || e.key === 'M') preencherCadastro('M', 20)
      if (e.key === 'b' || e.key === 'B') preencherCadastro('M', 50)
      if (e.key === 'f' || e.key === 'F') preencherCadastro('F', 20)
      if (e.key === 'g' || e.key === 'G') preencherCadastro('F', 50)
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('keydown', handleDemoKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keydown', handleDemoKey)
    }
  }, [])"""

if old_atalho in txt:
    txt = txt.replace(old_atalho, new_atalho)
    fixed.append('OK: atalhos Ctrl+M/B/F/G adicionados ao AuthPage')
else:
    fixed.append('ERRO: useEffect atalho não encontrado')

# Adicionar indicador visual dos atalhos na tela de CPF
old_cpf_hint = '              <p className="text-gray-500 text-xs mt-1">Verificamos se seu médico já fez uma avaliação para você</p>'
new_cpf_hint = """              <p className="text-gray-500 text-xs mt-1">Verificamos se seu médico já fez uma avaliação para você</p>
            </div>
            <div style={{ position:'absolute', bottom:8, right:12, display:'flex', flexDirection:'column', gap:1 }}>
              <span style={{ color:'rgba(156,163,175,0.6)', fontSize:'8px', fontFamily:'monospace' }}>Ctrl+M ♂20  Ctrl+B ♂50</span>
              <span style={{ color:'rgba(156,163,175,0.6)', fontSize:'8px', fontFamily:'monospace' }}>Ctrl+F ♀20  Ctrl+G ♀50</span>"""

if old_cpf_hint in txt:
    txt = txt.replace(old_cpf_hint, new_cpf_hint)
    fixed.append('OK: indicador atalhos adicionado na tela CPF')
else:
    fixed.append('AVISO: indicador não adicionado — posição não encontrada')

with open(auth, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
