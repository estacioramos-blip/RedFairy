calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
with open(calc_path, encoding='utf-8') as f:
    calc = f.read()

# 1. No handleSubmit, se bariátrico e sem dados OBA → abrir OBAModal e parar
old = """  async function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return; }"""

new = """  async function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return; }

    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }"""

if old in calc:
    calc = calc.replace(old, new)
    print('OK: fluxo bariátrico via handleSubmit')
else:
    print('ERRO: handleSubmit não encontrado')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(calc)
print('Concluído.')
