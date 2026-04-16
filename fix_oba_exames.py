oba_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba_path, encoding='utf-8') as f:
    txt = f.read()

# 1. Adicionar hint e ref em Leucócitos e Plaquetas no EXAMES_BASE
old = """  { key: 'leucocitos',     label: 'Leucócitos (Total)',       unit: '/uL',    ref: '4.000–11.000' },
  { key: 'neutrofilos',    label: 'Neutrófilos Segmentados',  unit: '%',      ref: '40–70%' },
  { key: 'neutrofilos_ul', label: 'Neutrófilos',              unit: '/uL',    ref: '1.800–7.700' },
  { key: 'plaquetas',      label: 'Plaquetas',                unit: 'mil/µL', ref: '150–400' },"""

new = """  { key: 'leucocitos',     label: 'Leucócitos (Total)',       unit: '/uL',    ref: '4.000–11.000', hint: 'Sem ponto ou vírgula. Ex: 7500' },
  { key: 'neutrofilos',    label: 'Neutrófilos Segmentados',  unit: '%',      ref: '40–70%' },
  { key: 'neutrofilos_ul', label: 'Neutrófilos (calculado)',  unit: '/uL',    ref: '1.800–7.700', readOnly: true },
  { key: 'plaquetas',      label: 'Plaquetas',                unit: 'x1000/µL', ref: '150–400', hint: 'Ex: 250 = 250.000/µL' },"""

if old in txt:
    txt = txt.replace(old, new)
    print('OK: hints e readOnly adicionados')
else:
    print('ERRO: EXAMES_BASE leucocitos não encontrado')

# 2. Calcular neutrófilos_ul automaticamente quando leucócitos ou neutrófilos% mudam
old_setexames = "  const [exames, setExames] = useState(Object.fromEntries(todosExames.map(e => [e.key, ''])))"
new_setexames = """  const [exames, setExames] = useState(Object.fromEntries(todosExames.map(e => [e.key, ''])))

  function handleExameChange(key, value) {
    setExames(prev => {
      const novo = { ...prev, [key]: value }
      // Calcular neutrófilos absolutos automaticamente
      const leuco = parseFloat(key === 'leucocitos' ? value : prev.leucocitos)
      const neutPct = parseFloat(key === 'neutrofilos' ? value : prev.neutrofilos)
      if (!isNaN(leuco) && !isNaN(neutPct) && leuco > 0 && neutPct > 0) {
        novo.neutrofilos_ul = Math.round(leuco * neutPct / 100).toString()
      }
      return novo
    })
  }"""

if old_setexames in txt:
    txt = txt.replace(old_setexames, new_setexames)
    print('OK: handleExameChange com cálculo automático')
else:
    print('ERRO: useState exames não encontrado')

# 3. Atualizar renderização para usar handleExameChange, hint e readOnly
old_render = """          {todosExames.filter(ex => !(examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && ex.key === 'ferritina_oba')).map(ex => (
            <div key={ex.key} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'0.5rem', alignItems:'center', marginBottom:'0.5rem', padding:'0.3rem 0', borderBottom:'1px solid #F3F4F6' }}>
              <div>
                <span style={{ fontSize:'0.85rem', fontWeight:600, color:'#374151' }}>{ex.label}</span>
                <span style={{ fontSize:'0.7rem', color:'#9CA3AF', marginLeft:'0.4rem' }}>({ex.unit})</span>
                {ex.ref && <p style={{ fontSize:'0.68rem', color:'#6B7280', margin:'0.1rem 0 0', fontStyle:'italic' }}>V.R.: {ex.ref}</p>}
              </div>
              <input
                style={{ width:90, border:'1.5px solid #E5E7EB', borderRadius:6, padding:'0.4rem 0.6rem', fontSize:'0.85rem', outline:'none', textAlign:'right', fontFamily:'inherit' }}
                type="number" step="0.01" placeholder="—"
                value={exames[ex.key] || ''}
                onChange={e => setExames(p => ({ ...p, [ex.key]: e.target.value }))} />
            </div>
          ))}"""

new_render = """          {todosExames.filter(ex => !(examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && ex.key === 'ferritina_oba')).map(ex => (
            <div key={ex.key} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'0.5rem', alignItems:'center', marginBottom:'0.5rem', padding:'0.3rem 0', borderBottom:'1px solid #F3F4F6' }}>
              <div>
                <span style={{ fontSize:'0.85rem', fontWeight:600, color: ex.readOnly ? '#9CA3AF' : '#374151' }}>{ex.label}</span>
                <span style={{ fontSize:'0.7rem', color:'#9CA3AF', marginLeft:'0.4rem' }}>({ex.unit})</span>
                {ex.ref && <p style={{ fontSize:'0.68rem', color:'#6B7280', margin:'0.1rem 0 0', fontStyle:'italic' }}>V.R.: {ex.ref}</p>}
                {ex.hint && <p style={{ fontSize:'0.68rem', color:'#F97316', margin:'0.1rem 0 0' }}>{ex.hint}</p>}
              </div>
              <input
                style={{ width:90, border:'1.5px solid #E5E7EB', borderRadius:6, padding:'0.4rem 0.6rem', fontSize:'0.85rem', outline:'none', textAlign:'right', fontFamily:'inherit', background: ex.readOnly ? '#F9FAFB' : 'white', color: ex.readOnly ? '#6B7280' : 'inherit' }}
                type="number" step="0.01" placeholder={ex.readOnly ? 'auto' : '—'}
                readOnly={ex.readOnly}
                value={exames[ex.key] || ''}
                onChange={e => !ex.readOnly && handleExameChange(ex.key, e.target.value)} />
            </div>
          ))}"""

if old_render in txt:
    txt = txt.replace(old_render, new_render)
    print('OK: renderização atualizada')
else:
    print('ERRO: renderização não encontrada')

with open(oba_path, 'w', encoding='utf-8') as f:
    f.write(txt)

print('Concluído.')
