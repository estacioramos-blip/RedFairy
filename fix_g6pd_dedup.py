engine_path = 'C:/Users/Estacio/Desktop/redfairy/src/engine/decisionEngine.js'

with open(engine_path, encoding='utf-8') as f:
    txt = f.read()

# Contar ocorrências
count = txt.count('let g6pdAlerta = null')
print(f'Ocorrências de g6pdAlerta: {count}')

if count > 1:
    # Remover todas as ocorrências do bloco modificador G-6-PD
    bloco = """  // ── Modificador G-6-PD pós-matching ────────────────────────────────────
  let g6pdAlerta = null
  if (inputs.g6pd) {
    const idsHemoliticos = [77, 78, 79, 62, 63, 64]
    if (idsHemoliticos.includes(resultado.id)) {
      g6pdAlerta = 'DEFICIÊNCIA DE G-6-PD: O PADRÃO LABORATORIAL ATUAL É COMPATÍVEL COM CRISE HEMOLÍTICA. A G-6-PD É A CAUSA MAIS PROVÁVEL. IDENTIFICAR E ELIMINAR O GATILHO (MEDICAMENTO, INFECÇÃO OU ALIMENTO). MONITORAR LDH, BILIRRUBINAS E RETICULÓCITOS.'
    } else if (['green', 'yellow'].includes(resultado.color)) {
      g6pdAlerta = 'DEFICIÊNCIA DE G-6-PD: O ERITRON ESTÁ COMPENSADO NO MOMENTO, MAS O RISCO DE CRISE HEMOLÍTICA PERMANECE. EVITAR MEDICAMENTOS OXIDANTES (PRIMAQUINA, DAPSONA, NITROFURANTOÍNA, SULFAS) E INGESTÃO DE FAVA.'
    }
  }

  return {"""

# Remover todas as ocorrências
while 'let g6pdAlerta = null' in txt:
    idx = txt.find('  // ── Modificador G-6-PD')
    if idx == -1:
        # Tenta achar só o let
        idx = txt.find('  let g6pdAlerta = null')
        end = txt.find('\n  return {', idx)
        txt = txt[:idx] + '\n  return {' + txt[end + len('\n  return {'):]
        break
    end = txt.find('\n  return {', idx)
    txt = txt[:idx] + txt[end:]

print(f'Ocorrências após remoção: {txt.count("let g6pdAlerta = null")}')

# Inserir UMA vez antes do return
old_return = """  return {
    encontrado: true,
    id: resultado.id,
    label: resultado.label,"""

new_return = """  // ── Modificador G-6-PD pós-matching ────────────────────────────────────
  let g6pdAlerta = null
  if (inputs.g6pd) {
    const idsHemoliticos = [77, 78, 79, 62, 63, 64]
    if (idsHemoliticos.includes(resultado.id)) {
      g6pdAlerta = 'DEFICIÊNCIA DE G-6-PD: O PADRÃO LABORATORIAL ATUAL É COMPATÍVEL COM CRISE HEMOLÍTICA. A G-6-PD É A CAUSA MAIS PROVÁVEL. IDENTIFICAR E ELIMINAR O GATILHO (MEDICAMENTO, INFECÇÃO OU ALIMENTO). MONITORAR LDH, BILIRRUBINAS E RETICULÓCITOS.'
    } else if (['green', 'yellow'].includes(resultado.color)) {
      g6pdAlerta = 'DEFICIÊNCIA DE G-6-PD: O ERITRON ESTÁ COMPENSADO NO MOMENTO, MAS O RISCO DE CRISE HEMOLÍTICA PERMANECE. EVITAR MEDICAMENTOS OXIDANTES (PRIMAQUINA, DAPSONA, NITROFURANTOÍNA, SULFAS) E INGESTÃO DE FAVA.'
    }
  }

  return {
    encontrado: true,
    id: resultado.id,
    label: resultado.label,"""

if old_return in txt:
    txt = txt.replace(old_return, new_return)
    print('OK: bloco G-6-PD inserido uma vez')
else:
    print('ERRO: return não encontrado')

# Garantir g6pdAlerta no objeto retornado — apenas uma vez
count_ret = txt.count('g6pdAlerta,')
print(f'g6pdAlerta no retorno: {count_ret} vez(es)')
if count_ret == 0:
    txt = txt.replace(
        '    fraseHipermenorreia: fraseHiper,',
        '    fraseHipermenorreia: fraseHiper,\n    g6pdAlerta,'
    )
    print('OK: g6pdAlerta adicionado ao retorno')
elif count_ret > 1:
    # Deixar só um
    first = txt.find('    g6pdAlerta,')
    second = txt.find('    g6pdAlerta,', first + 1)
    while second != -1:
        txt = txt[:second] + txt[second + len('    g6pdAlerta,\n'):]
        second = txt.find('    g6pdAlerta,', first + 1)
    print('OK: duplicatas de g6pdAlerta removidas do retorno')

with open(engine_path, 'w', encoding='utf-8') as f:
    f.write(txt)

print('Concluído.')
