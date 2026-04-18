calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# Encontrar onde inserir a função — antes de qualquer função async de avaliar
import re
idx = txt.find('async function handleAvaliar')
if idx < 0:
    idx = txt.find('async function avaliar')
if idx < 0:
    # Procurar pela função que faz o insert de avaliacoes
    idx = txt.find("supabase.from('avaliacoes').insert")
    if idx >= 0:
        # Voltar até o início da função
        idx = txt.rfind('async function', 0, idx)

print(f'Índice encontrado: {idx}')
if idx >= 0:
    print(f'Contexto: {repr(txt[idx:idx+60])}')

    FUNC_AFILIADO = """  async function salvarAfiliado() {
    if (!afiliadoEndereco.trim() || !afiliadoPix.trim()) return;
    setAfiliadoSalvando(true);
    await supabase
      .from('medicos')
      .update({ endereco: afiliadoEndereco.trim(), pix_chave: afiliadoPix.trim() })
      .eq('crm', medicoCRM);
    setAfiliadoSalvando(false);
    setAfiliadoSalvo(true);
    setTimeout(() => setShowAfiliados(false), 1500);
  }

  """

    txt = txt[:idx] + FUNC_AFILIADO + txt[idx:]
    with open(calc, 'w', encoding='utf-8') as f:
        f.write(txt)
    fixed.append('OK: salvarAfiliado adicionado')
else:
    fixed.append('ERRO: ponto de inserção não encontrado')

for msg in fixed:
    print(msg)
print('Concluído.')
