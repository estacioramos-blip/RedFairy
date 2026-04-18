lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# Texto médico: fonte menor + vermelho escuro
old_med = """                <p style={{ fontSize:'0.88rem', color:'var(--text-sec)', lineHeight:1.6, fontWeight:700, margin:0, textAlign:'justify' }}>
                  Avalie o eritron e o metabolismo do ferro do seu paciente com precisão clínica com toques no seu celular, e o insira em um projeto de qualidade de vida.
                </p>"""
new_med = """                <p style={{ fontSize:'0.78rem', color:'#7B1E1E', lineHeight:1.6, fontWeight:700, margin:0, textAlign:'justify' }}>
                  Avalie o eritron e o metabolismo do ferro do seu paciente com precisão clínica com toques no seu celular, e o insira em um projeto de qualidade de vida.
                </p>"""

# Texto paciente: fonte menor + preto
old_pac = """                <p style={{ fontSize:'0.88rem', color:'var(--text-sec)', lineHeight:1.6, fontWeight:700, margin:0, textAlign:'justify' }}>
                  Com poucos exames e informações de vida, monitore a sua hemoglobina e receba orientações médicas ajustadas ao que você precisa. Viva mais e melhor!
                </p>"""
new_pac = """                <p style={{ fontSize:'0.78rem', color:'#1F2937', lineHeight:1.6, fontWeight:700, margin:0, textAlign:'justify' }}>
                  Com poucos exames e informações de vida, monitore a sua hemoglobina e receba orientações médicas ajustadas ao que você precisa. Viva mais e melhor!
                </p>"""

for o, n, label in [(old_med, new_med, 'médico'), (old_pac, new_pac, 'paciente')]:
    if o in txt:
        txt = txt.replace(o, n)
        fixed.append(f'OK: texto {label} ajustado')
    else:
        fixed.append(f'ERRO: texto {label} não encontrado')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
