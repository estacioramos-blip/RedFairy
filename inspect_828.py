lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    lines = f.readlines()

print('=== Linhas 823-845 ===')
for i, line in enumerate(lines[822:845], 823):
    print(f'  {i}: {repr(line.rstrip())}')
