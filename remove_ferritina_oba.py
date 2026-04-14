filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# Substituir o loop de exames para filtrar ferritina_oba quando vem do RedFairy
old = "          {todosExames.map(ex => ("
new = "          {todosExames.filter(ex => !(examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && ex.key === 'ferritina_oba')).map(ex => ("

if old in txt:
    txt = txt.replace(old, new)
    open(filepath, 'w', encoding='utf-8').write(txt)
    print('OK: ferritina_oba removida da lista editável')
else:
    print('ERRO: trecho não encontrado')
