lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = 'Entra em Modo Paciente | Siga as Instruções'
new = 'Siga as Instruções'

if old in txt:
    txt = txt.replace(old, new)
    open(lp, 'w', encoding='utf-8').write(txt)
    print('OK: subtexto corrigido')
else:
    print('ERRO: subtexto não encontrado')
    # Mostrar o que tem no botão
    idx = txt.find('Sou Bariátrico')
    if idx >= 0:
        print(repr(txt[idx:idx+200]))
