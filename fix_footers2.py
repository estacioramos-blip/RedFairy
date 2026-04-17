lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# ── 1. Footer Terapêutica — linha superior apenas ─────────────────────────────
old_ter = """          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}"""

new_ter = """          </div>
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

if old_ter in txt:
    txt = txt.replace(old_ter, new_ter)
    fixed.append('OK: footer Terapêutica com linha superior')
else:
    fixed.append('ERRO: âncora Terapêutica')

# ── 2. Footer Como Funciona — linha superior apenas ───────────────────────────
old_como = """              </div>
            )}
            {activeTab === 'paciente' && ("""

new_como = """              </div>
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

if old_como in txt:
    txt = txt.replace(old_como, new_como)
    fixed.append('OK: footer Como Funciona com linha superior')
else:
    fixed.append('ERRO: âncora Como Funciona')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
