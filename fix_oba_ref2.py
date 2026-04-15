calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

# Adicionar uma ref para rastrear dados OBA de forma síncrona
old_ref = "  const logoClickTimer = useRef(null);"
new_ref = """  const logoClickTimer = useRef(null);
  const dadosOBARef = useRef(null);"""

# Atualizar onConcluir do OBAModal para também setar a ref
old_concluir = """          onConcluir={(dadosOBA, examesOBA) => {
            setDadosOBAColetados({ dadosOBA, examesOBA });
            setShowOBA(false);
          }}"""
new_concluir = """          onConcluir={(dadosOBA, examesOBA) => {
            const dados = { dadosOBA, examesOBA };
            dadosOBARef.current = dados;
            setDadosOBAColetados(dados);
            setShowOBA(false);
          }}"""

# Corrigir condição no handleSubmit para usar a ref
old_check = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }
    // Se bariatrica mas dadosOBAColetados já existe, continua normalmente"""
new_check = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }"""

# Usar dadosOBARef.current no handleSubmit como fallback
old_dados = """      if (dadosOBAColetados) {
        dadosOBA  = dadosOBAColetados.dadosOBA;
        examesOBA = dadosOBAColetados.examesOBA;"""
new_dados = """      const obaDisponivel = dadosOBAColetados || dadosOBARef.current;
      if (obaDisponivel) {
        dadosOBA  = obaDisponivel.dadosOBA;
        examesOBA = obaDisponivel.examesOBA;"""

fixed = []
for old, new, label in [
    (old_ref,      new_ref,      'ref dadosOBARef'),
    (old_concluir, new_concluir, 'onConcluir com ref'),
    (old_check,    new_check,    'handleSubmit com ref'),
    (old_dados,    new_dados,    'uso da ref no submit'),
]:
    if old in txt:
        txt = txt.replace(old, new)
        fixed.append(f'OK: {label}')
    else:
        fixed.append(f'ERRO: {label}')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
