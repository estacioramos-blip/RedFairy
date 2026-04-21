"""
fase3_parte2.py

FASE 3 PARTE 2 — Componentes visuais:

  1. CORRECAO: useEffect da Parte 1 estava escrevendo em form.data_exames
     mas o campo real e um state separado 'dataExames' com setDataExames.
     Corrigir para usar setDataExames.

  2. Inserir BANNER ROSA com texto educativo antes do label 'Data dos exames'
     (texto revisado do Dr. Ramos).

  3. Inserir CHECKBOX 'Tenho exames da mesma data do eritron' conectado
     ao state form.temExamesMesmaData.

  4. Inserir CLASSIFICACAO VISUAL INLINE dentro do render de cada exame:
     bolinha colorida + texto (NORMAL / LIMITROFE / ALTERADO alto/baixo).

  5. Inserir BANNER DE TELECONSULTA antes dos botoes, se houver
     qualquer exame classificado como 'alterado'.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/OBAModal.jsx")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 1. Corrigir useEffect da Parte 1 (setForm -> setDataExames)
# ═════════════════════════════════════════════════════════════════════
ancora_1 = """  // Fase 3: quando marca 'Tenho exames da mesma data', pre-preenche data_exames
  useEffect(() => {
    if (form.temExamesMesmaData && examesRedFairy?.dataColeta && !form.data_exames) {
      setForm(prev => ({ ...prev, data_exames: examesRedFairy.dataColeta }))
    }
  }, [form.temExamesMesmaData, examesRedFairy])"""

novo_1 = """  // Fase 3: quando marca 'Tenho exames da mesma data', pre-preenche dataExames
  useEffect(() => {
    if (form.temExamesMesmaData && examesRedFairy?.dataColeta && !dataExames) {
      setDataExames(examesRedFairy.dataColeta)
    }
  }, [form.temExamesMesmaData, examesRedFairy])"""

if "setDataExames(examesRedFairy.dataColeta)" in src:
    print("AVISO 1: useEffect ja foi corrigido.")
elif ancora_1 in src:
    src = src.replace(ancora_1, novo_1, 1)
    print("OK 1: useEffect corrigido para usar setDataExames.")
else:
    print("ERRO 1: ancora do useEffect Fase 3 nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 2. Inserir banner educativo + checkbox antes do label "Data dos exames"
# ═════════════════════════════════════════════════════════════════════
ancora_2 = """          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#374151', marginBottom:'0.5rem' }}>Data dos exames</label>
          <input style={inp} type="date" value={dataExames} onChange={e => setDataExames(e.target.value)} />"""

# Novo bloco: banner educativo + checkbox + label/input data (com data pre-preenchida se checkbox marcado)
novo_2 = """          {/* Fase 3: banner educativo + checkbox de exames da mesma data */}
          {examesRedFairy && examesRedFairy.dataColeta && (
            <div style={{ background:'#FDF2F8', border:'1.5px solid #F9A8D4', borderRadius:10, padding:'0.9rem 1rem', marginBottom:'1rem' }}>
              <p style={{ color:'#831843', fontSize:'0.8rem', lineHeight:'1.5', marginBottom:'0.8rem' }}>
                Se, na data em que você realizou o hemograma inicial, também fez alguns desses exames,
                pode inserir os resultados na plataforma. De todo modo, é recomendável repetir ou
                complementar os exames em cerca de duas semanas, e, se desejar, podemos emitir a
                solicitação médica mediante o pagamento de uma pequena taxa. Isso costuma valer muito
                a pena, pois economiza tempo, reduz custos de deslocamento e evita a necessidade de
                uma nova consulta presencial apenas para esse fim. Se preferir, a plataforma também
                poderá disponibilizar uma teleconsulta médica, especialmente caso os exames apresentem
                alterações mais significativas.
              </p>
              <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                <input
                  type="checkbox"
                  checked={form.temExamesMesmaData}
                  onChange={e => sf('temExamesMesmaData', e.target.checked)}
                  style={{ width:'1.1rem', height:'1.1rem', accentColor:'#DB2777' }}
                />
                <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#831843' }}>
                  Tenho exames da mesma data do eritron ({examesRedFairy.dataColeta.split('-').reverse().join('/')})
                </span>
              </label>
            </div>
          )}

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#374151', marginBottom:'0.5rem' }}>Data dos exames</label>
          <input style={inp} type="date" value={dataExames} onChange={e => setDataExames(e.target.value)} />"""

if "Tenho exames da mesma data do eritron" in src:
    print("AVISO 2: banner educativo ja existe.")
elif ancora_2 in src:
    src = src.replace(ancora_2, novo_2, 1)
    print("OK 2: banner educativo + checkbox inseridos.")
else:
    print("ERRO 2: ancora do label 'Data dos exames' nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 3. Classificacao visual inline dentro do render de cada exame
# ═════════════════════════════════════════════════════════════════════
# Vamos inserir logo apos o 'aberrantesOBA[ex.key] && ...' (linha ~592)
ancora_3 = """                {aberrantesOBA[ex.key] && <span style={{ fontSize:'0.62rem', fontWeight:700, color:'#CA8A04', marginTop:'0.2rem' }}>⚠ VALOR ABERRANTE — CONFIRME</span>}
              </div>"""

novo_3 = """                {aberrantesOBA[ex.key] && <span style={{ fontSize:'0.62rem', fontWeight:700, color:'#CA8A04', marginTop:'0.2rem' }}>⚠ VALOR ABERRANTE — CONFIRME</span>}
                {/* Fase 3: classificacao automatica do valor */}
                {(() => {
                  const cl = classificarValor(ex.key, exames[ex.key], { bariatrica: true })
                  if (!cl) return null
                  const cores = {
                    normal:    { fundo:'#F0FDF4', borda:'#BBF7D0', texto:'#166534', rotulo:'NORMAL' },
                    limitrofe: { fundo:'#FEFCE8', borda:'#FDE68A', texto:'#92400E', rotulo:'LIMÍTROFE' },
                    alterado:  { fundo:'#FFF1F2', borda:'#FECDD3', texto:'#9F1239', rotulo:'ALTERADO' },
                  }[cl.nivel]
                  const seta = cl.direcao === 'alto' ? ' ↑' : cl.direcao === 'baixo' ? ' ↓' : ''
                  return (
                    <span style={{ display:'inline-block', marginTop:'0.25rem', fontSize:'0.6rem', fontWeight:700, background:cores.fundo, border:`1px solid ${cores.borda}`, color:cores.texto, padding:'0.1rem 0.4rem', borderRadius:6 }}>
                      {cores.rotulo}{seta}
                    </span>
                  )
                })()}
              </div>"""

if "classificarValor(ex.key, exames[ex.key]" in src:
    print("AVISO 3: classificacao visual ja existe.")
elif ancora_3 in src:
    src = src.replace(ancora_3, novo_3, 1)
    print("OK 3: classificacao visual inline adicionada.")
else:
    print("ERRO 3: ancora de VALOR ABERRANTE nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 4. Banner de teleconsulta antes do botao Concluir
# ═════════════════════════════════════════════════════════════════════
ancora_4 = """          <button style={btnP} onClick={salvarExames} disabled={loading}>
            {loading ? 'Salvando...' : 'Concluir e ir para a Avaliação →'}
          </button>"""

novo_4 = """          {/* Fase 3: banner de teleconsulta se houver algum exame alterado */}
          {(() => {
            const temAlterado = todosExames.some(ex => {
              const cl = classificarValor(ex.key, exames[ex.key], { bariatrica: true })
              return cl && cl.nivel === 'alterado'
            })
            if (!temAlterado) return null
            return (
              <div style={{ background:'#FFF1F2', border:'1.5px solid #FCA5A5', borderRadius:10, padding:'0.9rem 1rem', margin:'1rem 0' }}>
                <p style={{ color:'#9F1239', fontSize:'0.85rem', fontWeight:700, marginBottom:'0.4rem' }}>
                  🩺 Alguns exames apresentam alterações significativas.
                </p>
                <p style={{ color:'#7F1D1D', fontSize:'0.78rem', lineHeight:'1.5' }}>
                  A plataforma pode disponibilizar uma teleconsulta médica para discussão desses
                  resultados. Fale com seu médico assistente ou solicite a teleconsulta após finalizar
                  esta avaliação.
                </p>
              </div>
            )
          })()}

          <button style={btnP} onClick={salvarExames} disabled={loading}>
            {loading ? 'Salvando...' : 'Concluir e ir para a Avaliação →'}
          </button>"""

if "banner de teleconsulta" in src:
    print("AVISO 4: banner de teleconsulta ja existe.")
elif ancora_4 in src:
    src = src.replace(ancora_4, novo_4, 1)
    print("OK 4: banner de teleconsulta inserido.")
else:
    print("ERRO 4: ancora do botao Concluir nao encontrada.")
    sys.exit(1)

ARQ.write_text(src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FASE 3 PARTE 2 APLICADA!")
print("=" * 60)
print(f"Arquivo: {ARQ}")
print()
print("Alteracoes:")
print("  1. useEffect corrigido (setDataExames em vez de setForm)")
print("  2. Banner rosa educativo com texto completo")
print("  3. Checkbox 'Tenho exames da mesma data do eritron'")
print("  4. Classificacao visual inline (NORMAL / LIMITROFE / ALTERADO)")
print("  5. Banner de teleconsulta quando ha exames alterados")
print()
print("Fluxo agora:")
print("  - Paciente ve banner rosa com texto educativo")
print("  - Se tem exames da mesma data -> marca checkbox -> data pre-preenchida")
print("  - Digita valores -> classificacao aparece automaticamente")
print("  - Se tem ALTERADO -> banner de teleconsulta aparece no fim")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: Fase 3 parte 2 - banner educativo + classificacao visual" && git push origin main')
