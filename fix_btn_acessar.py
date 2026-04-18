lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = """n onClick={onModoMedico} style={{ background:'#7B1E1E', color:'white', border:'none', borderRadius:7, padding:'7px 12px', fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>\n                      Acessar RedFairy completo →\n                    </button>"""

# Encontrar a posição exata
idx = txt.find("Acessar RedFairy completo")
if idx < 0:
    print('ERRO: texto não encontrado')
else:
    # Pegar contexto exato
    start = txt.rfind('<button', 0, idx)
    end = txt.find('</button>', idx) + len('</button>')
    old_btn = txt[start:end]
    print('Trecho encontrado:')
    print(repr(old_btn))

    new_btn = """<button onClick={() => {
                        const hb   = document.getElementById('rf-hb2')?.value
                        const ferr = document.getElementById('rf-ferr2')?.value
                        const vcm  = document.getElementById('rf-vcm2')?.value
                        const rdw  = document.getElementById('rf-rdw2')?.value
                        const sat  = document.getElementById('rf-sat2')?.value
                        const sexo = document.getElementById('rf-sexo')?.value
                        const idade= document.getElementById('rf-idade')?.value
                        const bari = document.getElementById('rf2-bariatrica')?.checked
                        const dados = { hb, ferr, vcm, rdw, sat, sexo, idade, bariatrica: bari }
                        localStorage.setItem('rf_demo_dados', JSON.stringify(dados))
                        if (bari) localStorage.setItem('rf_flag', 'bariatrica')
                        onModoMedico()
                      }} style={{ background:'#7B1E1E', color:'white', border:'none', borderRadius:7, padding:'7px 12px', fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                        Acessar RedFairy completo →
                      </button>"""

    txt = txt[:start] + new_btn + txt[end:]
    with open(lp, 'w', encoding='utf-8') as f:
        f.write(txt)
    print('OK: botão atualizado')
