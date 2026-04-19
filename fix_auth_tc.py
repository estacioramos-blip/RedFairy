auth = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'

with open(auth, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# Adicionar setAceitoTC(true) no preencherCadastro
old_preencher = """        setAvaliacoesPendentes(0)
        setEtapa('cadastro')
      }"""
new_preencher = """        setAceitoTC(true)
        setAvaliacoesPendentes(0)
        setEtapa('cadastro')
      }"""

if old_preencher in txt:
    txt = txt.replace(old_preencher, new_preencher)
    fixed.append('OK: setAceitoTC(true) adicionado')
else:
    fixed.append('ERRO: preencherCadastro não encontrado')

with open(auth, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
