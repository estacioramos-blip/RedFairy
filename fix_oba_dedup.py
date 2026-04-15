calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

# Remover bloco duplicado
old = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }
    // Se bariatrica mas dadosOBAColetados já existe, continua normalmente

    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }
    // Se bariatrica mas dadosOBAColetados já existe, continua normalmente"""

new = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }"""

if old in txt:
    txt = txt.replace(old, new)
    print('OK: duplicata removida')
else:
    print('ERRO: duplicata não encontrada')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(txt)

print('Concluído.')
