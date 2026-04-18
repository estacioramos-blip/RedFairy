calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

# Ver onde médico é salvo/lido
for term in ['medico', 'crm', 'supabase.from', 'insert', 'update']:
    idx = txt.lower().find(term)
    while idx >= 0:
        trecho = txt[max(0,idx-20):idx+100]
        if 'supabase' in trecho.lower() or 'from(' in trecho.lower():
            print(f'[{term}] {repr(trecho)}')
            print('---')
            break
        idx = txt.lower().find(term, idx+1)
