filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

old = """      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'M', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }"""

new = """      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'M', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }"""

if old in txt:
    txt = txt.replace(old, new)
    open(filepath, 'w', encoding='utf-8').write(txt)
    print('OK: Ctrl+N → Ctrl+B')
else:
    print('ERRO: trecho nao encontrado')
