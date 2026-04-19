auth = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'

with open(auth, encoding='utf-8') as f:
    txt = f.read()

# Encontrar e substituir o bloco handleDemoKey completo
start = txt.find('handleDemoKey(e) {')
end = txt.find('    window.addEventListener(\'keydown\', handleKey)', start)

old_block = txt[start:end]
print('Substituindo bloco:')
print(repr(old_block[:100]))

new_block = """handleDemoKey(e) {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return
      const entrarComoDemo = (sx, idade) => {
        e.preventDefault()
        const nomeDemo = sx === 'M'
          ? (idade <= 30 ? 'Paciente Demo Masculino Jovem' : 'Paciente Demo Masculino Sênior')
          : (idade <= 30 ? 'Paciente Demo Feminino Jovem' : 'Paciente Demo Feminino Sênior')
        const nascAno = new Date().getFullYear() - idade
        const perfil = {
          nome: nomeDemo,
          sexo: sx,
          data_nascimento: `${nascAno}-01-01`,
          cpf: '00000000000',
          celular: '71999999999',
        }
        onDemoEntrar && onDemoEntrar(perfil)
      }
      if (e.key === 'm' || e.key === 'M') entrarComoDemo('M', 20)
      if (e.key === 'b' || e.key === 'B') entrarComoDemo('M', 50)
      if (e.key === 'f' || e.key === 'F') entrarComoDemo('F', 20)
      if (e.key === 'g' || e.key === 'G') entrarComoDemo('F', 50)
    }
    """

txt = txt[:start] + new_block + txt[end:]

with open(auth, 'w', encoding='utf-8') as f:
    f.write(txt)

print('OK: handleDemoKey corrigido')
