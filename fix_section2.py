lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = """        </div>
      {/* Dupla linha vermelha + texto eritrograma após Terapêutica */}"""

new = """        </div>
      </section>
      {/* Dupla linha vermelha + texto eritrograma após Terapêutica */}"""

if old in txt:
    txt = txt.replace(old, new)
    open(lp, 'w', encoding='utf-8').write(txt)
    print('OK: section fechada')
else:
    print('ERRO: trecho não encontrado')
