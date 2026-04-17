lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Encontrar e substituir toda a seção EXPERIMENTE AGORA
old = """      {/* EXPERIMENTE AGORA */}
      <section id="avaliar" style={{ background:'var(--dark-bg)', padding:'5.5rem 2rem' }}>
        <div className="container">
          <div className="center reveal" style={{ marginBottom:'2.5rem' }}>
            <span className="tag" style={{ color:'var(--cherry-light)' }}>Experimente Agora</span>
            <h2 className="stitle" style={{ color:'white' }}>Faça uma avaliação gratuita</h2>
            <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'1rem', margin:'0 auto', maxWidth:580 }}>Insira os dados laboratoriais e obtenha o diagnóstico. Sem cadastro.</p>
          </div>"""

# Verificar se a seção existe com esse exato início
if old in txt:
    print('OK: seção encontrada')
else:
    # tentar alternativa
    idx = txt.find('Experimente Agora')
    print(f'Seção não encontrada como esperado. Índice de "Experimente Agora": {idx}')
    print(repr(txt[idx-100:idx+200]))
