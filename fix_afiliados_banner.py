calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Adicionar estado showAfiliadosBanner
old_state = "  const [showAfiliados, setShowAfiliados] = useState(false);"
new_state = """  const [showAfiliados, setShowAfiliados] = useState(false);
  const [showAfiliadosBanner, setShowAfiliadosBanner] = useState(false);"""

if old_state in txt:
    txt = txt.replace(old_state, new_state)
    fixed.append('OK: estado showAfiliadosBanner adicionado')
else:
    fixed.append('ERRO: estado showAfiliados não encontrado')

# 2. Atualizar trigger — se não for primeira avaliação mas também não tem dados, mostrar banner
old_trigger = """      if ((totalAvals || 0) === 0) {
        // Verificar se já tem endereco e pix cadastrados
        const { data: medDados } = await supabase
          .from('medicos')
          .select('endereco, pix_chave')
          .eq('crm', medicoCRM)
          .single()
        if (!medDados?.endereco || !medDados?.pix_chave) {
          setTimeout(() => setShowAfiliados(true), 1200)
        }
      }"""

new_trigger = """      // Verificar se já tem endereco e pix cadastrados
      const { data: medDados } = await supabase
        .from('medicos')
        .select('endereco, pix_chave')
        .eq('crm', medicoCRM)
        .single()
      if (!medDados?.endereco || !medDados?.pix_chave) {
        if ((totalAvals || 0) === 0) {
          // Primeira avaliação — modal completo
          setTimeout(() => setShowAfiliados(true), 1200)
        } else {
          // Avaliações seguintes — banner menor
          setTimeout(() => setShowAfiliadosBanner(true), 1200)
        }
      }"""

if old_trigger in txt:
    txt = txt.replace(old_trigger, new_trigger)
    fixed.append('OK: trigger atualizado com lógica de banner')
else:
    fixed.append('ERRO: trigger não encontrado')

# 3. Adicionar banner no JSX após o modal completo
old_modal_end = """      {/* ── MODAL PROGRAMA DE AFILIADOS ── */}
      {showAfiliados && ("""

new_modal_end = """      {/* ── BANNER AFILIADOS (avaliações seguintes) ── */}
      {showAfiliadosBanner && !showAfiliados && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-red-700 px-5 py-3 flex items-center justify-between">
              <p className="text-white font-bold text-sm">🎯 Programa de Afiliados RedFairy</p>
              <button onClick={() => setShowAfiliadosBanner(false)} className="text-red-200 hover:text-white text-lg font-bold">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-gray-700 text-sm leading-relaxed">
                Você ainda não faz parte do <strong>Programa de Afiliados Patrocinado</strong>. Gostaria de entrar agora e receber os benefícios previstos?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAfiliadosBanner(false); setShowAfiliados(true) }}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                  Sim, quero participar →
                </button>
                <button
                  onClick={() => setShowAfiliadosBanner(false)}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm rounded-xl transition-colors">
                  Agora não
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PROGRAMA DE AFILIADOS ── */}
      {showAfiliados && ("""

if old_modal_end in txt:
    txt = txt.replace(old_modal_end, new_modal_end)
    fixed.append('OK: banner afiliados adicionado ao JSX')
else:
    fixed.append('ERRO: âncora modal afiliados não encontrada')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
