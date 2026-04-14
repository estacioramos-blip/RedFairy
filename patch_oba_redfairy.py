filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# 1. Adicionar examesRedFairy na assinatura da função
old1 = "export default function OBAModal({ sexo, cpf, idade, onConcluir, onFechar }) {"
new1 = "export default function OBAModal({ sexo, cpf, idade, examesRedFairy, onConcluir, onFechar }) {"

# 2. Substituir o bloco de exames na etapa 2 para mostrar campos RF read-only + demais editáveis
old2 = """          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#374151', marginBottom:'0.5rem' }}>Data dos exames</label>
          <input style={inp} type="date" value={dataExames} onChange={e => setDataExames(e.target.value)} />"""

new2 = """          {/* ── Exames já registrados no RedFairy — somente leitura ── */}
          {examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && (
            <div style={{ background:'#FEF2F2', border:'1.5px solid #DC2626', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
              <p style={{ fontSize:'0.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', marginBottom:'0.6rem' }}>
                🔒 Exames registrados na avaliação RedFairy — somente leitura
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                {[
                  { label:'Ferritina', value: examesRedFairy.ferritina, unit:'ng/mL' },
                  { label:'Hemoglobina', value: examesRedFairy.hemoglobina, unit:'g/dL' },
                  { label:'VCM', value: examesRedFairy.vcm, unit:'fL' },
                  { label:'RDW', value: examesRedFairy.rdw, unit:'%' },
                  { label:'Sat. Transferrina', value: examesRedFairy.satTransf, unit:'%' },
                  { label:'Data da coleta', value: examesRedFairy.dataColeta, unit:'' },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} style={{ background:'white', borderRadius:8, padding:'0.5rem 0.7rem', border:'1px solid #FECDD3' }}>
                    <p style={{ fontSize:'0.65rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', marginBottom:'0.2rem' }}>{f.label}</p>
                    <p style={{ fontSize:'0.9rem', fontWeight:800, color:'#DC2626' }}>{f.value} <span style={{ fontSize:'0.7rem', fontWeight:400, color:'#9CA3AF' }}>{f.unit}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#374151', marginBottom:'0.5rem' }}>Data dos exames</label>
          <input style={inp} type="date" value={dataExames} onChange={e => setDataExames(e.target.value)} />"""

if old1 in txt:
    txt = txt.replace(old1, new1)
    print("OK: prop examesRedFairy adicionada")
else:
    print("ERRO: assinatura nao encontrada")

if old2 in txt:
    txt = txt.replace(old2, new2)
    print("OK: bloco read-only inserido")
else:
    print("ERRO: trecho de data nao encontrado")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(txt)

print("Arquivo salvo.")
