oba_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba_path, encoding='utf-8') as f:
    txt = f.read()

# Linha 752: botão "Agora não" que chama onFechar
old = '<button style={btnS} onClick={onFechar}>Agora não</button>'
new = '<button style={btnS} onClick={onFechar}>← Voltar</button>'

if old in txt:
    txt = txt.replace(old, new)
    open(oba_path, 'w', encoding='utf-8').write(txt)
    print('OK: botão Agora não → Voltar')
else:
    print('ERRO: botão não encontrado')
