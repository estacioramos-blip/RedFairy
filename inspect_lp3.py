lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()
    lines = txt.split('\n')

print('=== Linhas 770-820 ===')
for i, line in enumerate(lines[769:820], 770):
    print(f'  {i}: {line}')
