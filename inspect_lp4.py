lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Contar ocorrências do bloco eritrograma
count = txt.count('Para fazer uma avaliação você vai precisar')
print(f'Ocorrências "eritrograma": {count}')

# Ver contexto terapêutica título
idx = txt.find('Orientações Terapêuticas')
if idx >= 0:
    print('\n=== Terapêutica título ===')
    print(repr(txt[idx-100:idx+200]))

# Ver contexto indicações título
idx2 = txt.find('"tag">Indicações')
if idx2 >= 0:
    print('\n=== Indicações título ===')
    print(repr(txt[idx2-50:idx2+200]))

# Ver reward-banner / linha como funciona
idx3 = txt.find('reward-banner')
idx4 = txt.find('Programa de Afiliados RedFairy')
print(f'\nreward-banner encontrado: {idx3 >= 0}')
print(f'texto afiliados encontrado: {idx4 >= 0}')
if idx4 >= 0:
    print(repr(txt[idx4-100:idx4+200]))
