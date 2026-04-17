lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Todas as linhas vermelhas devem ter height:1.5 e borderRadius:1
# Verificar e corrigir variações
import re

# Substituir qualquer height diferente de 1.5 nas linhas vermelhas wine
count = 0
# Padrão: height:X, background:'#7B1E1E'
def fix_height(m):
    global count
    count += 1
    return "height:1.5, background:'#7B1E1E', borderRadius:1"

txt_new = re.sub(
    r"height:\d+\.?\d*,\s*background:'#7B1E1E',\s*borderRadius:\d+",
    fix_height,
    txt
)

print(f'Linhas vermelhas corrigidas: {count}')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt_new)

print('Concluído.')
