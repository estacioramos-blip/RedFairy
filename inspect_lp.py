lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    lines = f.readlines()

print('=== Linhas 1096-1104 ===')
for i, line in enumerate(lines[1095:1104], 1096):
    print(f'  {i}: {repr(line)}')
