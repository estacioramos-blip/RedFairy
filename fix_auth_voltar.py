filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# 1. AuthMedico recebe onVoltar
old1 = "function AuthMedico({ onConcluir }) {"
new1 = "function AuthMedico({ onConcluir, onVoltar }) {"

# 2. Adicionar botão Voltar no return do AuthMedico (antes do div principal)
old2 = '    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">\n      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-5">'
new2 = '    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 relative">\n      {onVoltar && (\n        <button onClick={onVoltar}\n          className="absolute top-4 left-4 text-white px-3 py-1 rounded-lg text-xs font-medium shadow transition-colors"\n          style={{ backgroundColor: \'#991b1b\' }}>\n          ← Voltar\n        </button>\n      )}\n      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-5">'

# 3. Passar onVoltar para AuthMedico no Calculator
old3 = "    return <AuthMedico onConcluir={(nome, crm) => {"
new3 = "    return <AuthMedico onVoltar={onVoltar} onConcluir={(nome, crm) => {"

fixed = []
for old, new, label in [(old1, new1, 'prop onVoltar'), (old2, new2, 'botão Voltar'), (old3, new3, 'passar onVoltar')]:
    if old in txt:
        txt = txt.replace(old, new)
        fixed.append(f'OK: {label}')
    else:
        fixed.append(f'ERRO: {label} nao encontrado')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print("Arquivo salvo.")
