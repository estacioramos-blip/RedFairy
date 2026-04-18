lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Remover o parágrafo hero-desc atual
old_desc = """            <p className="hero-desc">
              Avalie o eritron e o metabolismo do ferro com precisão clínica. Com apenas alguns dados
              laboratoriais e de contexto de vida, monitore a evolução da sua hemoglobina e receba
              orientações terapêuticas ajustadas às suas necessidades. Viva melhor para viver mais!
            </p>"""
if old_desc in txt:
    txt = txt.replace(old_desc, '')
    fixed.append('OK: hero-desc removido')
else:
    fixed.append('ERRO: hero-desc não encontrado')

# 2. Substituir os dois botões para adicionar subtexto abaixo de cada um
old_btns = """            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1rem', width:'100%' }}>
              <button className="btn btn-primary" onClick={onModoMedico} style={{ flexDirection:"column", gap:"0.05rem", height:60, justifyContent:"center", alignItems:"center", display:"flex", width:'100%' }}>
                <span>Sou Médico</span>
                <span style={{ fontSize:"0.6rem", fontWeight:700, letterSpacing:"1.5px", opacity:0.7 }}>PROFISSIONAIS DE SAÚDE</span>
              </button>
              <button className="btn btn-secondary" onClick={onModoPaciente} style={{ height:60, justifyContent:"center", alignItems:"center", display:"flex", width:'100%' }}>Sou Paciente</button>
            </div>"""

new_btns = """            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.5rem', width:'100%' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                <button className="btn btn-primary" onClick={onModoMedico} style={{ flexDirection:"column", gap:"0.05rem", height:60, justifyContent:"center", alignItems:"center", display:"flex", width:'100%' }}>
                  <span>Sou Médico</span>
                  <span style={{ fontSize:"0.6rem", fontWeight:700, letterSpacing:"1.5px", opacity:0.7 }}>PROFISSIONAIS DE SAÚDE</span>
                </button>
                <p style={{ fontSize:'0.78rem', color:'var(--text-sec)', lineHeight:1.6, fontWeight:500, margin:0 }}>
                  Avalie o eritron e o metabolismo do ferro do seu paciente com precisão clínica com toques no seu celular, e o insira em um projeto de qualidade de vida.
                </p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                <button className="btn btn-secondary" onClick={onModoPaciente} style={{ height:60, justifyContent:"center", alignItems:"center", display:"flex", width:'100%' }}>Sou Paciente</button>
                <p style={{ fontSize:'0.78rem', color:'var(--text-sec)', lineHeight:1.6, fontWeight:500, margin:0 }}>
                  Com poucos dados de laboratório e contexto de vida, monitore a sua hemoglobina e receba orientações médicas ajustadas às suas necessidades. Viva mais e melhor!
                </p>
              </div>
            </div>"""

if old_btns in txt:
    txt = txt.replace(old_btns, new_btns)
    fixed.append('OK: botões com subtextos adicionados')
else:
    fixed.append('ERRO: botões não encontrados')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
