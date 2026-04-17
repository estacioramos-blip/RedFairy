lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    lines = f.readlines()

print('=== Linhas 815-835 ===')
for i, line in enumerate(lines[814:835], 815):
    print(f'  {i}: {line.rstrip()}')
