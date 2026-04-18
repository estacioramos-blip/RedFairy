calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

# Login normal - onde salva medico_crm após login
for term in ["localStorage.setItem('medico_crm'", "storedCRM", "if (!medicoCRM)", "function AuthMedico"]:
    idx = txt.find(term)
    if idx >= 0:
        print(f'[{term}]')
        print(repr(txt[max(0,idx-30):idx+120]))
        print('---')
    else:
        print(f'NÃO ENCONTRADO: {term}')
        print('---')
