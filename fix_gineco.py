oba = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba, encoding='utf-8') as f:
    txt = f.read()

old = "  'REUMATOLOGISTA',\n  'ORTOPEDISTA',\n  'OUTRO',\n]"
new = "  'REUMATOLOGISTA',\n  'ORTOPEDISTA',\n  'GINECOLOGISTA',\n  'OUTRO',\n]"

if old in txt:
    txt = txt.replace(old, new)
    open(oba, 'w', encoding='utf-8').write(txt)
    print('OK: Ginecologista adicionado')
else:
    print('ERRO: posição não encontrada')
