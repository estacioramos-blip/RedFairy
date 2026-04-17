oba = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Substituir lista de ESPECIALISTAS
old_esp = """const ESPECIALISTAS = [
  'FAÇO ACOMPANHAMENTO COM O CIRURGIÃO',
  'SOU ACOMPANHADO POR UM CLÍNICO',
  'SOU ACOMPANHADO POR GASTROENTEROLOGISTA',
  'RECEBI ORIENTAÇÃO DE NUTRÓLOGO',
  'SOU ACOMPANHADO POR ENDOCRINOLOGISTA',
  'SOU ACOMPANHADO POR ANGIOLOGISTA',
  'SOU ACOMPANHADO POR CARDIOLOGISTA',
  'SOU ACOMPANHADO POR OUTRO ESPECIALISTA',
]"""

new_esp = """const ESPECIALISTAS = [
  'CIRURGIÃO',
  'CLÍNICO',
  'HEMATOLOGISTA',
  'GASTROENTEROLOGISTA',
  'NUTRÓLOGO',
  'ENDOCRINOLOGISTA',
  'CARDIOLOGISTA',
  'NEUROLOGISTA',
  'PSIQUIATRA',
  'OUTRO',
]"""

if old_esp in txt:
    txt = txt.replace(old_esp, new_esp)
    fixed.append('OK: especialistas simplificados')
else:
    fixed.append('ERRO: especialistas não encontrado')

# 2. Corrigir margem direita — maxWidth 800 com overflow hidden no CD
old_cd = "const CD = { background:'white', borderRadius:20, width:'100%', maxWidth:800, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', marginBottom:'2rem' }"
new_cd = "const CD = { background:'white', borderRadius:20, width:'100%', maxWidth:800, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', marginBottom:'2rem', boxSizing:'border-box' }"
if old_cd in txt:
    txt = txt.replace(old_cd, new_cd)
    fixed.append('OK: CD boxSizing corrigido')
else:
    fixed.append('ERRO: CD não encontrado')

# Corrigir OV padding para não vazar
old_ov = "const OV = { position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'1.5rem 1rem' }"
new_ov = "const OV = { position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'1.5rem 1rem', boxSizing:'border-box' }"
if old_ov in txt:
    txt = txt.replace(old_ov, new_ov)
    fixed.append('OK: OV boxSizing corrigido')
else:
    fixed.append('ERRO: OV não encontrado')

# Corrigir padding interno do modal
old_pad = "        <div style={{ padding:'1.5rem' }}>"
new_pad = "        <div style={{ padding:'1.5rem', boxSizing:'border-box', width:'100%', overflowX:'hidden' }}>"
if old_pad in txt:
    txt = txt.replace(old_pad, new_pad, 2)  # substitui nas 2 ocorrências (anamnese e exames)
    fixed.append('OK: padding interno corrigido')
else:
    fixed.append('ERRO: padding interno não encontrado')

# 3. Remover botão NUNCA USEI dos emagrecedores — deixar só JÁ USEI e ESTOU USANDO
old_em = "              {['JÁ USEI','NUNCA USEI','ESTOU USANDO'].map(op => ("
new_em = "              {['JÁ USEI','ESTOU USANDO'].map(op => ("
if old_em in txt:
    txt = txt.replace(old_em, new_em)
    fixed.append('OK: NUNCA USEI removido dos emagrecedores')
else:
    fixed.append('ERRO: emagrecedores botões não encontrado')

with open(oba, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
