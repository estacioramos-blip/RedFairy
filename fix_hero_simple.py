lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Remover fairy-showcase (fada flutuante)
old_fairy = """            <div className="fairy-showcase" onClick={handleFadaClick} style={{ cursor:'pointer' }}>
              <img src={logo} alt="RedFairy — A Fada Vermelha" />
            </div>"""
if old_fairy in txt:
    txt = txt.replace(old_fairy, '')
    fixed.append('OK: fada removida')
else:
    fixed.append('ERRO: fairy-showcase não encontrado')

# 2. Remover fairy-quote (texto do ferro/hemoglobina)
old_quote = """            {/* fairy-quote: retângulo branco simples, sem hover */}
            <div className="fairy-quote">
              <p>O Ferro em você veio das estrelas, é dele o vermelho do seu sangue — a sua potência.</p>
              <p className="question">Cuide da sua Hemoglobina, ela é a sua vida.</p>
            </div>"""
if old_quote in txt:
    txt = txt.replace(old_quote, '')
    fixed.append('OK: fairy-quote removido')
else:
    # tentar sem comentário
    old_quote2 = """            <div className="fairy-quote">
              <p>O Ferro em você veio das estrelas, é dele o vermelho do seu sangue — a sua potência.</p>
              <p className="question">Cuide da sua Hemoglobina, ela é a sua vida.</p>
            </div>"""
    if old_quote2 in txt:
        txt = txt.replace(old_quote2, '')
        fixed.append('OK: fairy-quote removido (sem comentário)')
    else:
        fixed.append('ERRO: fairy-quote não encontrado')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
