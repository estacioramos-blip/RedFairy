auth_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'
calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

for path, label in [(auth_path, 'AuthPage'), (calc_path, 'Calculator')]:
    with open(path, encoding='utf-8') as f:
        txt = f.read()
    idx = txt.find('function TermosModal')
    if idx >= 0:
        print(f'=== {label} — TermosModal ===')
        print(repr(txt[idx:idx+200]))
    else:
        print(f'ERRO: TermosModal não encontrado em {label}')
    print()
