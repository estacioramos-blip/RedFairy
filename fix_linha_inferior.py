lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = """              <p style={{ color:'#9CA3AF', fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', margin:'0.2rem 0 0.3rem' }}>
                VÁLIDO PARA PROFISSIONAIS DE SAÚDE COM REGISTRO EM CONSELHO
              </p>
              <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />
            </div>"""

new = """              <p style={{ color:'#9CA3AF', fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', margin:'0.2rem 0 0.3rem' }}>
                VÁLIDO PARA PROFISSIONAIS DE SAÚDE COM REGISTRO EM CONSELHO
              </p>
            </div>"""

if old in txt:
    txt = txt.replace(old, new)
    open(lp, 'w', encoding='utf-8').write(txt)
    print('OK: linha inferior removida')
else:
    print('ERRO: trecho não encontrado')
