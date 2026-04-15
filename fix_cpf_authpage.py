filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# 1. Adicionar função formatarCPF antes do handleCPF
old1 = "  async function handleCPF() {"
new1 = """  function formatarCPF(valor) {
    const digits = valor.replace(/\\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0,3) + '.' + digits.slice(3);
    if (digits.length <= 9) return digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6);
    return digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6,9) + '-' + digits.slice(9);
  }

  async function handleCPF() {"""

# 2. Atualizar o onChange do campo CPF para usar formatarCPF
old2 = "                onChange={e => { setCpf(e.target.value); setErro('') }}"
new2 = "                onChange={e => { setCpf(formatarCPF(e.target.value)); setErro('') }}"

# 3. Atualizar placeholder e hint
old3 = '                placeholder="000.000.000-00" maxLength={14} inputMode="numeric"'
new3 = '                placeholder="000.000.000-00" maxLength={14} inputMode="numeric"'

fixed = []
for old, new, label in [(old1, new1, 'função formatarCPF'), (old2, new2, 'onChange CPF')]:
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
