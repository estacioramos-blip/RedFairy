lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Remover botão oba-home-btn da coluna direita do hero
old_oba_hero = """            <a href="#oba" className="oba-home-btn">
              <span className="oba-title">Projeto OBA</span>
              <span className="oba-sub">Otimizar o Bariátrico</span>
              <span className="oba-link">Saiba mais</span>
            </a>"""
if old_oba_hero in txt:
    txt = txt.replace(old_oba_hero, '')
    fixed.append('OK: botão OBA removido do hero')
else:
    fixed.append('ERRO: botão OBA no hero não encontrado')

# 2. Adicionar botão OBA centralizado no final da seção Indicações
old_ind_end = """        </div>
        </div>
      </section>

      {/* TERAPÊUTICA */}"""
new_ind_end = """        </div>
          <div style={{ display:'flex', justifyContent:'center', marginTop:'2rem' }}>
            <a href="#oba" className="oba-home-btn">
              <span className="oba-title">Projeto OBA</span>
              <span className="oba-sub">Otimizar o Bariátrico</span>
              <span className="oba-link">Saiba mais →</span>
            </a>
          </div>
        </div>
      </section>

      {/* TERAPÊUTICA */}"""
if old_ind_end in txt:
    txt = txt.replace(old_ind_end, new_ind_end)
    fixed.append('OK: botão OBA adicionado no final de Indicações')
else:
    fixed.append('ERRO: final de Indicações não encontrado')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
