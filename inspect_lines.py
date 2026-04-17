lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

import re
# Encontrar todas as linhas vermelhas wine
matches = re.finditer(r"height:(\d+\.?\d*),\s*background:'#7B1E1E'", txt)
for m in matches:
    idx = m.start()
    print(f'height:{m.group(1)} — contexto: {repr(txt[idx-30:idx+60])}')
