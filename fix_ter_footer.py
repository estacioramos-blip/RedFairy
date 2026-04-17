lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = "          </div>\n\n\n        </div>\n      </section>\n\n      {/* COMO FUNCIONA */}"

new = """          </div>
          <div style={{ marginTop:'2rem', padding:'0 0 0.5rem' }}>
            <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.8rem' }} />
            <p style={{ color:'#1F2937', fontSize:'0.92rem', fontWeight:600, textAlign:'center', margin:'0 0 0.3rem' }}>
              Para fazer uma avaliação você vai precisar de algumas informações do eritrograma:
            </p>
            <p style={{ color:'#6B7280', fontSize:'0.85rem', fontWeight:600, textAlign:'center', margin:0 }}>
              Hemoglobina · VCM · RDW + Ferritina e Saturação da Transferrina
            </p>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}"""

if old in txt:
    txt = txt.replace(old, new)
    open(lp, 'w', encoding='utf-8').write(txt)
    print('OK: footer Terapêutica inserido')
else:
    print('ERRO: âncora não encontrada')
    print('Contexto real:', repr(txt[txt.find('cada paciente.</p></div>')+24:txt.find('COMO FUNCIONA')+20]))
