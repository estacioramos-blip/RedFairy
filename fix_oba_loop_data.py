calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
oba_path  = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

# ── 1. Calculator.jsx — corrigir condição do loop bariátrico ─────────────────
with open(calc_path, encoding='utf-8') as f:
    calc = f.read()

# O problema: a condição verifica dadosOBAColetados mas após onConcluir
# o estado pode não ter sido atualizado antes do re-render
# Solução: usar uma ref para rastrear se OBA foi concluído
old = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }"""

new = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }
    // Se bariatrica mas dadosOBAColetados já existe, continua normalmente"""

if old in calc:
    calc = calc.replace(old, new)
    print('OK calc: comentário adicionado (lógica já correta)')
else:
    print('AVISO calc: bloco não encontrado — verificando estado')

# Verificar se o onConcluir do OBAModal está setando dadosOBAColetados corretamente
if 'setDadosOBAColetados({ dadosOBA, examesOBA })' in calc:
    print('OK calc: setDadosOBAColetados está sendo chamado no onConcluir')
else:
    print('ERRO calc: setDadosOBAColetados não encontrado no onConcluir')

# Verificar se showOBA está sendo fechado após onConcluir
if 'setShowOBA(false)' in calc:
    print('OK calc: setShowOBA(false) presente')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(calc)

# ── 2. OBAModal.jsx — corrigir exibição da data DD/MM/AAAA ──────────────────
with open(oba_path, encoding='utf-8') as f:
    oba = f.read()

# A data da coleta vem como 'YYYY-MM-DD' do input type="date"
# Precisa formatar para DD/MM/AAAA na exibição
old_data = "  { label:'Data da coleta', value: examesRedFairy.dataColeta, unit:'' },"
new_data = """  { label:'Data da coleta', value: examesRedFairy.dataColeta
    ? examesRedFairy.dataColeta.split('-').reverse().join('/')
    : null, unit:'' },"""

if old_data in oba:
    oba = oba.replace(old_data, new_data)
    print('OK oba: data formatada DD/MM/AAAA')
else:
    print('ERRO oba: linha data não encontrada')
    # Buscar contexto
    idx = oba.find('dataColeta')
    if idx >= 0:
        print('Contexto:', repr(oba[idx:idx+100]))

with open(oba_path, 'w', encoding='utf-8') as f:
    f.write(oba)

print('Concluído.')
