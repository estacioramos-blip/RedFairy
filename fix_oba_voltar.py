calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

# 1. Remover abertura automática do OBA ao marcar checkbox
old1 = """    if (name === 'bariatrica') {
      if (checked) setShowOBA(true);
      else setDadosOBAColetados(null);
    }"""
new1 = """    if (name === 'bariatrica') {
      if (!checked) setDadosOBAColetados(null);
    }"""

# Também pode estar na versão anterior sem o if checked
old1b = """    if (name === 'bariatrica') {
      if (!checked) setDadosOBAColetados(null);
      if (checked) setShowOBA(true);
    }"""
new1b = """    if (name === 'bariatrica') {
      if (!checked) setDadosOBAColetados(null);
    }"""

fixed = []
for old, new, label in [
    (old1,  new1,  'abertura automática OBA v1'),
    (old1b, new1b, 'abertura automática OBA v2'),
]:
    if old in txt:
        txt = txt.replace(old, new)
        fixed.append(f'OK: {label}')
    else:
        fixed.append(f'nao encontrado: {label}')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)

# 2. Adicionar botão Voltar no OBAModal
oba_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba_path, encoding='utf-8') as f:
    oba = f.read()

# Procurar o botão Cancelar ou Fechar no OBAModal e adicionar Voltar
# Geralmente está no rodapé do modal
old_fechar = """        <button type="button" onClick={onFechar}"""
new_fechar = """        <button type="button" onClick={onFechar}
          style={{ background:'#991b1b', color:'white', border:'none', borderRadius:8, padding:'0.5rem 1.2rem', fontWeight:700, fontSize:'0.8rem', cursor:'pointer' }}>
          ← Voltar
        </button>
        <button type="button" onClick={onFechar}"""

# Tenta encontrar o padrão do botão de fechar/cancelar
if old_fechar in oba:
    # Só adicionar se ainda não tem Voltar
    if '← Voltar' not in oba:
        oba = oba.replace(old_fechar, new_fechar, 1)
        print('OK: botão Voltar adicionado no OBAModal')
    else:
        print('OK: botão Voltar já existe no OBAModal')
else:
    # Tentar outra âncora — botão de navegação anterior
    print('AVISO: padrão botão fechar não encontrado, buscando alternativa')
    idx = oba.find('onFechar')
    if idx >= 0:
        print(f'  onFechar encontrado em posição {idx}')
        print(f'  contexto: {repr(oba[idx-50:idx+100])}')

with open(oba_path, 'w', encoding='utf-8') as f:
    f.write(oba)

print('Concluído.')
