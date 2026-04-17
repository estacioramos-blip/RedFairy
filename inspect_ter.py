lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

idx = txt.find('terapeutica')
idx2 = txt.find('class="terapeutica"')
idx3 = txt.find('"terapeutica"')
print(f'terapeutica idx: {idx3}')

# Mostrar contexto após os cards
idx4 = txt.find('Gráfico multiparamétrico')
if idx4 >= 0:
    print('Contexto após cards:')
    print(repr(txt[idx4+50:idx4+300]))
