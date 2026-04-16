lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Remover o bloco fora da section
old_fora = """      </section>
      {/* Dupla linha vermelha + texto eritrograma após Terapêutica */}
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 2rem 1.5rem' }}>
        <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.6rem' }} />
        <p style={{ color:'#1F2937', fontSize:'0.92rem', fontWeight:600, textAlign:'center', margin:'0.4rem 0 0.3rem' }}>
          Para fazer uma avaliação você vai precisar de algumas informações do eritrograma:
        </p>
        <p style={{ color:'#6B7280', fontSize:'0.85rem', fontWeight:600, textAlign:'center', margin:'0 0 0.4rem' }}>
          Hemoglobina · VCM · RDW + Ferritina e Saturação da Transferrina
        </p>
        <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />
      </div>

      {/* COMO FUNCIONA */}"""

new_dentro = """      </section>

      {/* COMO FUNCIONA */}"""

# Inserir bloco dentro da section, após os cards
old_cards = """          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}"""

new_cards = """          </div>
          {/* Dupla linha vermelha + texto eritrograma */}
          <div style={{ marginTop:'2rem' }}>
            <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.6rem' }} />
            <p style={{ color:'#1F2937', fontSize:'0.92rem', fontWeight:600, textAlign:'center', margin:'0.4rem 0 0.3rem' }}>
              Para fazer uma avaliação você vai precisar de algumas informações do eritrograma:
            </p>
            <p style={{ color:'#6B7280', fontSize:'0.85rem', fontWeight:600, textAlign:'center', margin:'0 0 0.4rem' }}>
              Hemoglobina · VCM · RDW + Ferritina e Saturação da Transferrina
            </p>
            <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}"""

fixed = []
if old_fora in txt:
    txt = txt.replace(old_fora, new_dentro)
    fixed.append('OK: bloco removido de fora')
else:
    fixed.append('ERRO: bloco fora não encontrado')

if old_cards in txt:
    txt = txt.replace(old_cards, new_cards)
    fixed.append('OK: bloco inserido dentro da section')
else:
    fixed.append('ERRO: âncora cards não encontrada')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
