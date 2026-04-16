oba_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba_path, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Modal mais largo — maxWidth 560 → 800
old = "const CD = { background:'white', borderRadius:20, width:'100%', maxWidth:560, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', marginBottom:'2rem' }"
new = "const CD = { background:'white', borderRadius:20, width:'100%', maxWidth:800, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', marginBottom:'2rem' }"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: modal mais largo (800px)')
else: fixed.append('ERRO: CD maxWidth')

# 2. Especialistas em 2 colunas
old = "          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Especialistas que me acompanham:</label>\n          {ESPECIALISTAS.map(e => <CheckRow key={e} label={e} checked={form.especialistas.includes(e)} onClick={() => sf('especialistas', tog(form.especialistas, e))} />)}"
new = "          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Especialistas que me acompanham:</label>\n          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>\n            {ESPECIALISTAS.map(e => <CheckRow key={e} label={e} checked={form.especialistas.includes(e)} onClick={() => sf('especialistas', tog(form.especialistas, e))} />)}\n          </div>"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: especialistas 2 colunas')
else: fixed.append('ERRO: especialistas')

# 3. Fibromialgia em 2 colunas
old = "          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.5rem' }}>Marque os sintomas que apresenta com frequência:</p>\n          {STATUS_FIBROMIALGIA_OPS.map(op => (\n            <CheckRow key={op} label={op}\n              checked={form.status_fibromialgia.includes(op)}\n              onClick={() => sf('status_fibromialgia', tog(form.status_fibromialgia, op))} />\n          ))}"
new = "          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.5rem' }}>Marque os sintomas que apresenta com frequência:</p>\n          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>\n            {STATUS_FIBROMIALGIA_OPS.map(op => (\n              <CheckRow key={op} label={op}\n                checked={form.status_fibromialgia.includes(op)}\n                onClick={() => sf('status_fibromialgia', tog(form.status_fibromialgia, op))} />\n            ))}\n          </div>"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: fibromialgia 2 colunas')
else: fixed.append('ERRO: fibromialgia')

# 4. Vacinas COVID em 2 colunas
old = "          {['VACINA PFIZER', 'VACINA JANSSEN', 'VACINA ASTRAZENECA', 'VACINA CORONAVAC', 'NÃO TOMEI VACINA'].map(v => (\n            <CheckRow key={v} label={v}\n              checked={form.vacina_covid.includes(v)}\n              disabled={v !== 'NÃO TOMEI VACINA' && form.vacina_covid.includes('NÃO TOMEI VACINA') || v === 'NÃO TOMEI VACINA' && form.vacina_covid.length > 0 && !form.vacina_covid.includes('NÃO TOMEI VACINA')}\n              onClick={() => sf('vacina_covid', tog(form.vacina_covid, v))} />\n          ))}"
new = "          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>\n            {['VACINA PFIZER', 'VACINA JANSSEN', 'VACINA ASTRAZENECA', 'VACINA CORONAVAC', 'NÃO TOMEI VACINA'].map(v => (\n              <CheckRow key={v} label={v}\n                checked={form.vacina_covid.includes(v)}\n                disabled={v !== 'NÃO TOMEI VACINA' && form.vacina_covid.includes('NÃO TOMEI VACINA') || v === 'NÃO TOMEI VACINA' && form.vacina_covid.length > 0 && !form.vacina_covid.includes('NÃO TOMEI VACINA')}\n                onClick={() => sf('vacina_covid', tog(form.vacina_covid, v))} />\n            ))}\n          </div>"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: vacinas 2 colunas')
else: fixed.append('ERRO: vacinas')

# 5. Atividade física em 2 colunas
old = "          {ATIVIDADES.map(at => {\n            const sedMarcado = form.atividade_fisica.includes('SEDENTÁRIO')\n            const disabled = at !== 'SEDENTÁRIO' && sedMarcado\n            return <CheckRow key={at} label={at} checked={form.atividade_fisica.includes(at)} disabled={disabled} onClick={() => toggleAtividade(at)} />\n          })}"
new = "          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>\n            {ATIVIDADES.map(at => {\n              const sedMarcado = form.atividade_fisica.includes('SEDENTÁRIO')\n              const disabled = at !== 'SEDENTÁRIO' && sedMarcado\n              return <CheckRow key={at} label={at} checked={form.atividade_fisica.includes(at)} disabled={disabled} onClick={() => toggleAtividade(at)} />\n            })}\n          </div>"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: atividades 2 colunas')
else: fixed.append('ERRO: atividades')

# 6. Projetos de vida em 2 colunas
old = "          {PROJETOS.map(p => <CheckRow key={p} label={p} checked={form.projetos_vida.includes(p)} onClick={() => sf('projetos_vida', tog(form.projetos_vida, p))} />)}"
new = "          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>\n            {PROJETOS.map(p => <CheckRow key={p} label={p} checked={form.projetos_vida.includes(p)} onClick={() => sf('projetos_vida', tog(form.projetos_vida, p))} />)}\n          </div>"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: projetos 2 colunas')
else: fixed.append('ERRO: projetos')

# 7. Medicamentos em uso em 2 colunas
old = "          {MEDICAMENTOS.map(m => <CheckRow key={m} label={m} checked={form.medicamentos.includes(m)} onClick={() => sf('medicamentos', tog(form.medicamentos, m))} />)}"
new = "          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>\n            {MEDICAMENTOS.map(m => <CheckRow key={m} label={m} checked={form.medicamentos.includes(m)} onClick={() => sf('medicamentos', tog(form.medicamentos, m))} />)}\n          </div>"
if old in txt: txt = txt.replace(old, new); fixed.append('OK: medicamentos 2 colunas')
else: fixed.append('ERRO: medicamentos')

# 8. Medicamentos eritron em 2 colunas
old = """          {[
            { field: 'metformina',    label: 'Metformina',           sub: 'Reduz absorção de vitamina B12' },
            { field: 'ibp',           label: 'IBP (Omeprazol etc.)', sub: 'Pantoprazol, Omeprazol — reduz B12' },
            { field: 'tiroxina',      label: 'Tiroxina / T4',        sub: 'Hipotireoidismo — pode causar anemia' },
            { field: 'methotrexato',  label: 'Metotrexato',          sub: 'Antagonista do folato — causa macrocitose' },
            { field: 'hivTratamento', label: 'Trat. HIV / ARV',      sub: 'AZT e outros — podem causar macrocitose' },
          ].map(({ field, label, sub }) => (
            <CheckRow key={field}
              label={label + ' — ' + sub}
              checked={!!form[field]}
              onClick={() => sf(field, !form[field])} />
          ))}"""
new = """          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {[
              { field: 'metformina',    label: 'Metformina',           sub: 'Reduz absorção de B12' },
              { field: 'ibp',           label: 'IBP (Omeprazol etc.)', sub: 'Reduz B12' },
              { field: 'tiroxina',      label: 'Tiroxina / T4',        sub: 'Pode causar anemia' },
              { field: 'methotrexato',  label: 'Metotrexato',          sub: 'Antagonista do folato' },
              { field: 'hivTratamento', label: 'Trat. HIV / ARV',      sub: 'Macrocitose' },
            ].map(({ field, label, sub }) => (
              <CheckRow key={field}
                label={label + ' — ' + sub}
                checked={!!form[field]}
                onClick={() => sf(field, !form[field])} />
            ))}
          </div>"""
if old in txt: txt = txt.replace(old, new); fixed.append('OK: meds eritron 2 colunas')
else: fixed.append('ERRO: meds eritron')

# 9. Exames em 2 colunas (etapa 2)
old = """          {todosExames.filter(ex => !(examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && ex.key === 'ferritina_oba')).map(ex => (
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

new = """          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
            {todosExames.filter(ex => !(examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && ex.key === 'ferritina_oba')).map(ex => (
              <div key={ex.key} style={{ display:'flex', flexDirection:'column', background: ex.readOnly ? '#F9FAFB' : 'white', border:'1.5px solid #F3F4F6', borderRadius:8, padding:'0.5rem 0.7rem' }}>
                <span style={{ fontSize:'0.8rem', fontWeight:600, color: ex.readOnly ? '#9CA3AF' : '#374151' }}>{ex.label}</span>
                <span style={{ fontSize:'0.65rem', color:'#9CA3AF' }}>({ex.unit})</span>
                {ex.ref && <span style={{ fontSize:'0.62rem', color:'#6B7280', fontStyle:'italic' }}>V.R.: {ex.ref}</span>}
                {ex.hint && <span style={{ fontSize:'0.62rem', color:'#F97316' }}>{ex.hint}</span>}
                <input
                  style={{ marginTop:'0.4rem', width:'100%', border:'1.5px solid #E5E7EB', borderRadius:6, padding:'0.35rem 0.5rem', fontSize:'0.9rem', fontWeight:700, outline:'none', textAlign:'right', fontFamily:'inherit', background: ex.readOnly ? '#F0F0F0' : 'white', color: ex.readOnly ? '#6B7280' : '#111827', boxSizing:'border-box' }}
                  type="number" step="0.01" placeholder={ex.readOnly ? 'auto' : '—'}
                  readOnly={ex.readOnly}
                  value={exames[ex.key] || ''}
                  onChange={e => !ex.readOnly && handleExameChange(ex.key, e.target.value)} />
              </div>
            ))}
          </div>"""

if old in txt: txt = txt.replace(old, new); fixed.append('OK: exames 2 colunas')
else: fixed.append('ERRO: exames')

with open(oba_path, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
