calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

# Adicionar console.log no onConcluir para debug
old = """          onConcluir={(dadosOBA, examesOBA) => {
            const dados = { dadosOBA, examesOBA };
            dadosOBARef.current = dados;
            setDadosOBAColetados(dados);
            setShowOBA(false);
          }}"""

new = """          onConcluir={(dadosOBA, examesOBA) => {
            console.log('OBA onConcluir chamado', dadosOBA, examesOBA);
            const dados = { dadosOBA, examesOBA };
            dadosOBARef.current = dados;
            setDadosOBAColetados(dados);
            setShowOBA(false);
            console.log('dadosOBARef após set:', dadosOBARef.current);
          }}"""

if old in txt:
    txt = txt.replace(old, new)
    print('OK: console.log adicionado')
else:
    print('ERRO: onConcluir não encontrado')

# Também logar no handleSubmit
old2 = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }"""

new2 = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    console.log('handleSubmit bariatrica check:', inputs.bariatrica, 'ref:', dadosOBARef.current, 'state:', dadosOBAColetados);
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }"""

if old2 in txt:
    txt = txt.replace(old2, new2)
    print('OK: console.log no handleSubmit')
else:
    print('ERRO: handleSubmit check não encontrado')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(txt)

print('Concluído.')
