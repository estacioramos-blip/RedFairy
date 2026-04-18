lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = """                <p style={{ fontSize:'0.78rem', color:'var(--text-sec)', lineHeight:1.6, fontWeight:500, margin:0 }}>
                  Avalie o eritron e o metabolismo do ferro do seu paciente com precisão clínica com toques no seu celular, e o insira em um projeto de qualidade de vida.
                </p>"""
new = """                <p style={{ fontSize:'0.78rem', color:'var(--text-sec)', lineHeight:1.6, fontWeight:500, margin:0, textAlign:'justify' }}>
                  Avalie o eritron e o metabolismo do ferro do seu paciente com precisão clínica com toques no seu celular, e o insira em um projeto de qualidade de vida.
                </p>"""

old2 = """                <p style={{ fontSize:'0.78rem', color:'var(--text-sec)', lineHeight:1.6, fontWeight:500, margin:0 }}>
                  Com poucos dados de laboratório e contexto de vida, monitore a sua hemoglobina e receba orientações médicas ajustadas às suas necessidades. Viva mais e melhor!
                </p>"""
new2 = """                <p style={{ fontSize:'0.78rem', color:'var(--text-sec)', lineHeight:1.6, fontWeight:500, margin:0, textAlign:'justify' }}>
                  Com poucos dados de laboratório e contexto de vida, monitore a sua hemoglobina e receba orientações médicas ajustadas às suas necessidades. Viva mais e melhor!
                </p>"""

fixed = []
for o, n, label in [(old, new, 'médico'), (old2, new2, 'paciente')]:
    if o in txt:
        txt = txt.replace(o, n)
        fixed.append(f'OK: texto {label} justificado')
    else:
        fixed.append(f'ERRO: texto {label} não encontrado')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
