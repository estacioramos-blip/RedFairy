lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    lines = f.readlines()

print('=== Linhas 1088-1105 ===')
for i, line in enumerate(lines[1087:1105], 1088):
    print(f'  {i}: {repr(line.rstrip())}')
