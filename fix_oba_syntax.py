oba_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba_path, encoding='utf-8') as f:
    txt = f.read()

# O erro é comentário JSX duplicado ou malformado: {/* ── EMAGRECEDORES ── */}}
# Corrigir chave dupla
old1 = '{/* ── EMAGRECEDORES ── */}}'
new1 = '{/* ── EMAGRECEDORES ── */}'

# Também pode estar assim (âncora duplicada do fix_meds_move)
old2 = """          {/* ── EMAGRECEDORES ── */}
          {/* ── EMAGRECEDORES ── */}"""
new2 = "          {/* ── EMAGRECEDORES ── */}"

fixed = []
for old, new, label in [
    (old1, new1, 'chave dupla EMAGRECEDORES'),
    (old2, new2, 'comentário EMAGRECEDORES duplicado'),
]:
    if old in txt:
        txt = txt.replace(old, new)
        fixed.append(f'OK: {label}')
    else:
        fixed.append(f'nao encontrado: {label}')

# Mostrar contexto da linha 730 para diagnóstico
lines = txt.split('\n')
start = max(0, 725)
end = min(len(lines), 735)
print('Contexto linhas 726-735:')
for i, line in enumerate(lines[start:end], start+1):
    print(f'  {i}: {line}')

with open(oba_path, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
