calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Adicionar estado showAfiliados e dados afiliado
old_state = "  const [resultado, setResultado] = useState(null);"
new_state = """  const [resultado, setResultado] = useState(null);
  const [showAfiliados, setShowAfiliados] = useState(false);
  const [afiliadoEndereco, setAfiliadoEndereco] = useState('');
  const [afiliadoPix, setAfiliadoPix] = useState('');
  const [afiliadoSalvando, setAfiliadoSalvando] = useState(false);
  const [afiliadoSalvo, setAfiliadoSalvo] = useState(false);"""

if old_state in txt:
    txt = txt.replace(old_state, new_state)
    fixed.append('OK: estados modal afiliados adicionados')
else:
    fixed.append('ERRO: estado resultado não encontrado')

# 2. Após salvar avaliação, verificar se é primeira e mostrar modal
old_insert = "      await supabase.from('avaliacoes').insert({"
new_insert = """      // Verificar se é primeira avaliação do médico
      const { count: totalAvals } = await supabase
        .from('avaliacoes')
        .select('*', { count: 'exact', head: true })
        .eq('medico_crm', medicoCRM)
      if ((totalAvals || 0) === 0) {
        // Verificar se já tem endereco e pix cadastrados
        const { data: medDados } = await supabase
          .from('medicos')
          .select('endereco, pix_chave')
          .eq('crm', medicoCRM)
          .single()
        if (!medDados?.endereco || !medDados?.pix_chave) {
          setTimeout(() => setShowAfiliados(true), 1200)
        }
      }

      await supabase.from('avaliacoes').insert({"""

if old_insert in txt:
    txt = txt.replace(old_insert, new_insert)
    fixed.append('OK: trigger modal afiliados após primeira avaliação')
else:
    fixed.append('ERRO: insert avaliacoes não encontrado')

# 3. Adicionar função salvarAfiliado
old_handle_avaliar = "  async function handleAvaliar() {"
new_handle_avaliar = """  async function salvarAfiliado() {
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

  async function handleAvaliar() {"""

if old_handle_avaliar in txt:
    txt = txt.replace(old_handle_avaliar, new_handle_avaliar)
    fixed.append('OK: função salvarAfiliado adicionada')
else:
    fixed.append('ERRO: handleAvaliar não encontrado')

# 4. Adicionar modal no JSX — antes do return do CalculatorForm
old_return_jsx = "  return (\n    <div className=\"min-h-screen bg-gray-50\">"
new_return_jsx = """  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── MODAL PROGRAMA DE AFILIADOS ── */}
      {showAfiliados && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-700 px-6 py-5">
              <p className="text-white text-xs uppercase tracking-widest opacity-80 mb-1">Bem-vindo ao</p>
              <h2 className="text-white text-xl font-bold">Programa de Afiliados Patrocinado</h2>
              <p className="text-red-200 text-xs mt-1">RedFairy — Versão 1.0</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                Para participar do <strong>Programa de Afiliados Patrocinado</strong> de RedFairy e receber os benefícios previstos, precisamos do seu <strong>endereço com CEP</strong> e da sua <strong>chave Pix</strong>.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Endereço completo com CEP</label>
                  <textarea
                    value={afiliadoEndereco}
                    onChange={e => setAfiliadoEndereco(e.target.value)}
                    placeholder="Rua, número, bairro, cidade, estado, CEP"
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Chave Pix</label>
                  <input
                    type="text"
                    value={afiliadoPix}
                    onChange={e => setAfiliadoPix(e.target.value)}
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                🔒 Entre seus dados tranquilamente. Você está em um servidor seguro, e não existe a possibilidade de uso inadequado dessas informações.
              </p>
              {afiliadoSalvo ? (
                <p className="text-green-600 text-sm font-bold text-center">✅ Dados salvos! Bem-vindo ao Programa de Afiliados!</p>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={salvarAfiliado}
                    disabled={afiliadoSalvando || !afiliadoEndereco.trim() || !afiliadoPix.trim()}
                    className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
                    {afiliadoSalvando ? 'Salvando...' : 'Salvar e participar →'}
                  </button>
                  <button
                    onClick={() => setShowAfiliados(false)}
                    className="w-full text-gray-400 text-xs hover:text-gray-600 transition-colors py-1">
                    Preencher depois
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}"""

if old_return_jsx in txt:
    txt = txt.replace(old_return_jsx, new_return_jsx)
    fixed.append('OK: modal afiliados adicionado ao JSX')
else:
    fixed.append('ERRO: return JSX não encontrado')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
