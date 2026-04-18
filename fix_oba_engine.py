filepath = 'C:/Users/Estacio/Desktop/redfairy/src/engine/obaEngine.js'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# Corrigir referência a 'suger' que não existe no escopo de buildModEritron
# Deve ser 'examesSuger' que é passado como parâmetro

old = """    alertas.push({ nivel: MODERADO, texto: `FERRITINA MUITO ELEVADA: ${ferrOBA} ng/mL — AVALIAR SOBRECARGA DE FERRO E INFLAMAÇÃO CRÔNICA.` })
    suger.push('SATURAÇÃO DA TRANSFERRINA (AVALIAR SOBRECARGA DE FERRO)')
    suger.push('AVALIAÇÃO COM HEPATOLOGISTA')"""

new = """    alertas.push({ nivel: MODERADO, texto: `FERRITINA MUITO ELEVADA: ${ferrOBA} ng/mL — AVALIAR SOBRECARGA DE FERRO E INFLAMAÇÃO CRÔNICA.` })"""

# Também corrigir assinatura de buildModEritron para receber examesSuger
old2 = "function buildModEritron(eritron, dadosOBA, mesesPos, disab, tipoCir) {"
new2 = "function buildModEritron(eritron, dadosOBA, examesOBA, mesesPos, disab, tipoCir, alertas, examesSuger) {"

# E a chamada de buildModEritron
old3 = "  const modEritron = buildModEritron(resultadoEritron, dadosOBA, mesesPos, disab, tipoCir)"
new3 = "  const modEritron = buildModEritron(resultadoEritron, dadosOBA, examesOBA, mesesPos, disab, tipoCir, alertas, examesSuger)"

# Corrigir referência a examesOBA dentro de buildModEritron (era ferrOBA que usava ex.ferritina_oba)
# O parâmetro examesOBA já existe mas não era passado
old4 = "  const ferrOBA = parseFloat(examesOBA?.ferritina_oba)"
new4 = "  const ferrOBA = parseFloat(examesOBA?.ferritina_oba)"  # já correto se recebermos examesOBA

fixed = []
for old, new, label in [
    (old2, new2, 'assinatura buildModEritron'),
    (old3, new3, 'chamada buildModEritron'),
    (old, new, 'remover suger inválido'),
]:
    if old in txt:
        txt = txt.replace(old, new)
        fixed.append(f'OK: {label}')
    else:
        fixed.append(f'ERRO: {label}')

# Agora adicionar de volta as pushes corretamente com examesSuger
old_push = "    alertas.push({ nivel: MODERADO, texto: `FERRITINA MUITO ELEVADA: ${ferrOBA} ng/mL — AVALIAR SOBRECARGA DE FERRO E INFLAMAÇÃO CRÔNICA.` })"
new_push = """    alertas.push({ nivel: MODERADO, texto: `FERRITINA MUITO ELEVADA: ${ferrOBA} ng/mL — AVALIAR SOBRECARGA DE FERRO E INFLAMAÇÃO CRÔNICA.` })
    examesSuger.push('SATURAÇÃO DA TRANSFERRINA (AVALIAR SOBRECARGA DE FERRO)')
    examesSuger.push('AVALIAÇÃO COM HEPATOLOGISTA')"""

if old_push in txt:
    txt = txt.replace(old_push, new_push)
    fixed.append('OK: pushes corrigidos com examesSuger')
else:
    fixed.append('ERRO: push não encontrado')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print("Concluído.")
