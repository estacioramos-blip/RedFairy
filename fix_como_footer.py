lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

# O bloco está fora do div — mover para dentro
old = """              </div>

              <div style={{ margin:'1.5rem 0 0' }}>
                <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.8rem' }} />
                <p style={{ color:'#1F2937', fontSize:'0.95rem', fontWeight:600, textAlign:'center', margin:'0 0 0.2rem' }}>
                  O Programa de Afiliados RedFairy beneficia quem beneficia os seus pacientes.
                </p>
                <p style={{ color:'#6B7280', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', margin:'0.2rem 0 0', cursor:'pointer' }}
                   onClick={() => document.getElementById('acesso')?.scrollIntoView({ behavior:'smooth' })}>
                  CONHEÇA AS REGRAS
                </p>
              </div>
            )}
            {activeTab === 'paciente' && ("""

new = """                <div style={{ margin:'1.5rem 0 0' }}>
                  <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.8rem' }} />
                  <p style={{ color:'#1F2937', fontSize:'0.95rem', fontWeight:600, textAlign:'center', margin:'0 0 0.2rem' }}>
                    O Programa de Afiliados RedFairy beneficia quem beneficia os seus pacientes.
                  </p>
                  <p style={{ color:'#6B7280', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', margin:'0.2rem 0 0', cursor:'pointer' }}
                     onClick={() => document.getElementById('acesso')?.scrollIntoView({ behavior:'smooth' })}>
                    CONHEÇA AS REGRAS
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'paciente' && ("""

if old in txt:
    txt = txt.replace(old, new)
    open(lp, 'w', encoding='utf-8').write(txt)
    print('OK: footer movido para dentro do div medico')
else:
    print('ERRO: trecho não encontrado')
