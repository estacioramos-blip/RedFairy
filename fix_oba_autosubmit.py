calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

# Após onConcluir, chamar handleSubmit com os dados diretamente
old = """          onConcluir={(dadosOBA, examesOBA) => {
            console.log('OBA onConcluir chamado', dadosOBA, examesOBA);
            const dados = { dadosOBA, examesOBA };
            dadosOBARef.current = dados;
            setDadosOBAColetados(dados);
            setShowOBA(false);
            console.log('dadosOBARef após set:', dadosOBARef.current);
          }}"""

new = """          onConcluir={(dadosOBA, examesOBA) => {
            const dados = { dadosOBA, examesOBA };
            dadosOBARef.current = dados;
            setDadosOBAColetados(dados);
            setShowOBA(false);
            // Chamar avaliação automaticamente com os dados OBA recém coletados
            setTimeout(() => {
              document.getElementById('btn-avaliar-paciente')?.click();
            }, 100);
          }}"""

if old in txt:
    txt = txt.replace(old, new)
    print('OK: auto-submit após onConcluir')
else:
    print('ERRO: onConcluir não encontrado')

# Adicionar id no botão Avaliar Paciente
old_btn = '              Avaliar Paciente'
new_btn = '              Avaliar Paciente'

old_btn2 = """            <button type="submit" className="flex-1 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-md text-base">
              Avaliar Paciente
            </button>"""
new_btn2 = """            <button id="btn-avaliar-paciente" type="submit" className="flex-1 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-md text-base">
              Avaliar Paciente
            </button>"""

if old_btn2 in txt:
    txt = txt.replace(old_btn2, new_btn2)
    print('OK: id adicionado no botão Avaliar')
else:
    print('ERRO: botão Avaliar não encontrado')

# Remover console.logs do handleSubmit
old_log = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    console.log('handleSubmit bariatrica check:', inputs.bariatrica, 'ref:', dadosOBARef.current, 'state:', dadosOBAColetados);
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {"""
new_log = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {"""

if old_log in txt:
    txt = txt.replace(old_log, new_log)
    print('OK: console.log removido')
else:
    print('AVISO: console.log não encontrado')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(txt)

print('Concluído.')
