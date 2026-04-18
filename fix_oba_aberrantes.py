oba = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# ── 1. Adicionar "NÃO ESTOU SOB ACOMPANHAMENTO" como primeiro especialista ───
old_esp_label = "          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Especialistas que me acompanham:</label>\n          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>\n            {ESPECIALISTAS.map(e => <CheckRow key={e} label={e} checked={form.especialistas.includes(e)} onClick={() => sf('especialistas', tog(form.especialistas, e))} />)}\n          </div>"

new_esp_label = """          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Especialistas que me acompanham:</label>
          <CheckRow
            label="NÃO ESTOU SOB ACOMPANHAMENTO DE ESPECIALISTA"
            checked={form.semEspecialista}
            onClick={() => sf('semEspecialista', !form.semEspecialista)}
          />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem', marginTop:'0.4rem' }}>
            {ESPECIALISTAS.map(e => (
              <CheckRow key={e} label={e}
                checked={form.especialistas.includes(e)}
                disabled={form.semEspecialista}
                onClick={() => !form.semEspecialista && sf('especialistas', tog(form.especialistas, e))} />
            ))}
          </div>"""

if old_esp_label in txt:
    txt = txt.replace(old_esp_label, new_esp_label)
    fixed.append('OK: campo sem especialista adicionado')
else:
    fixed.append('ERRO: especialistas label não encontrado')

# Adicionar semEspecialista ao estado inicial do form
old_form_state = "    ganhou_peso_apos: false, fez_plasma_argonio: false,"
new_form_state = "    ganhou_peso_apos: false, fez_plasma_argonio: false, semEspecialista: false,"
if old_form_state in txt:
    txt = txt.replace(old_form_state, new_form_state)
    fixed.append('OK: semEspecialista no estado inicial')
else:
    fixed.append('ERRO: estado inicial form não encontrado')

# ── 2. Limites aberrantes para os exames OBA ─────────────────────────────────
LIMITES = {
    'leucocitos':    (500,   20000),
    'neutrofilos':   (1,     99),
    'plaquetas':     (10,    1000),
    'ferritina_oba': (1,     5000),
    'vitamina_b12':  (50,    2000),
    'vitamina_d':    (1,     200),
    'tsh':           (0.01,  50),
    'hb_glicada':    (3,     20),
    'glicemia':      (30,    600),
    'insulina':      (0.5,   200),
    'triglicerides': (20,    2000),
    'ast':           (5,     1000),
    'alt':           (5,     1000),
    'gama_gt':       (5,     1000),
    'creatinina':    (0.3,   15),
    'acido_urico':   (1,     20),
    'folatos':       (1,     50),
    'zinco':         (20,    300),
    'vitamina_a':    (5,     200),
    'vitamina_e':    (1,     50),
    'tiamina':       (10,    500),
    'selenio':       (10,    400),
    'vitamina_c':    (0.1,   10),
    'vitamina_k':    (0.05,  15),
    'niacina':       (0.1,   30),
    'testosterona':  (5,     2000),
    'psa_total':     (0,     100),
    'ca199':         (0,     500),
    'estradiol':     (5,     5000),
    'cea':           (0,     100),
}

limites_js = '{\n' + ',\n'.join(
    f"    '{k}': {{ min:{v[0]}, max:{v[1]} }}"
    for k, v in LIMITES.items()
) + '\n  }'

# Adicionar estado aberrantesOBA e função de verificação
old_exames_state = "  const [dataExames, setDataExames] = useState('')"
new_exames_state = f"""  const LIMITES_OBA = {limites_js}

  const [dataExames, setDataExames] = useState('')
  const [aberrantesOBA, setAberrantesOBA] = useState({{}})

  function handleExameChangeOBA(key, value) {{
    handleExameChange(key, value)
    if (value !== '') {{
      const num = parseFloat(value)
      const lim = LIMITES_OBA[key]
      if (lim && !isNaN(num)) {{
        setAberrantesOBA(prev => ({{ ...prev, [key]: num < lim.min || num > lim.max }}))
      }}
    }} else {{
      setAberrantesOBA(prev => ({{ ...prev, [key]: false }}))
    }}
  }}"""

if old_exames_state in txt:
    txt = txt.replace(old_exames_state, new_exames_state)
    fixed.append('OK: estado e função aberrantesOBA adicionados')
else:
    fixed.append('ERRO: dataExames state não encontrado')

# ── 3. Substituir onChange dos inputs de exame para usar handleExameChangeOBA ─
old_input_exame = "                onChange={e => !ex.readOnly && handleExameChange(ex.key, e.target.value)} />"
new_input_exame = "                onChange={e => !ex.readOnly && handleExameChangeOBA(ex.key, e.target.value)} />"
if old_input_exame in txt:
    txt = txt.replace(old_input_exame, new_input_exame)
    fixed.append('OK: inputs exame usando handleExameChangeOBA')
else:
    fixed.append('ERRO: onChange exame não encontrado')

# ── 4. Mostrar crítica aberrante abaixo do campo de exame ─────────────────────
old_exame_div = """              <div key={ex.key} style={{ display:'flex', flexDirection:'column', background: ex.readOnly ? '#F9FAFB' : 'white', border:'1.5px solid #F3F4F6', borderRadius:8, padding:'0.5rem 0.7rem' }}>
                <span style={{ fontSize:'0.8rem', fontWeight:600, color: ex.readOnly ? '#9CA3AF' : '#374151' }}>{ex.label}</span>
                <span style={{ fontSize:'0.65rem', color:'#9CA3AF' }}>({ex.unit})</span>
                {ex.ref && <span style={{ fontSize:'0.62rem', color:'#6B7280', fontStyle:'italic' }}>V.R.: {ex.ref}</span>}
                {ex.hint && <span style={{ fontSize:'0.62rem', color:'#F97316' }}>{ex.hint}</span>}
                <input
                  style={{ marginTop:'0.4rem', width:'100%', border:'1.5px solid #E5E7EB', borderRadius:6, padding:'0.35rem 0.5rem', fontSize:'0.9rem', fontWeight:700, outline:'none', textAlign:'right', fontFamily:'inherit', background: ex.readOnly ? '#F0F0F0' : 'white', color: ex.readOnly ? '#6B7280' : '#111827', boxSizing:'border-box' }}
                  type="number" step="0.01" placeholder={ex.readOnly ? 'auto' : '—'}
                  readOnly={ex.readOnly}
                  value={exames[ex.key] || ''}
                  onChange={e => !ex.readOnly && handleExameChangeOBA(ex.key, e.target.value)} />
              </div>"""

new_exame_div = """              <div key={ex.key} style={{ display:'flex', flexDirection:'column', background: ex.readOnly ? '#F9FAFB' : 'white', border: aberrantesOBA[ex.key] ? '1.5px solid #EAB308' : '1.5px solid #F3F4F6', borderRadius:8, padding:'0.5rem 0.7rem' }}>
                <span style={{ fontSize:'0.8rem', fontWeight:600, color: ex.readOnly ? '#9CA3AF' : '#374151' }}>{ex.label}</span>
                <span style={{ fontSize:'0.65rem', color:'#9CA3AF' }}>({ex.unit})</span>
                {ex.ref && <span style={{ fontSize:'0.62rem', color:'#6B7280', fontStyle:'italic' }}>V.R.: {ex.ref}</span>}
                {ex.hint && <span style={{ fontSize:'0.62rem', color:'#F97316' }}>{ex.hint}</span>}
                <input
                  style={{ marginTop:'0.4rem', width:'100%', border:'1.5px solid #E5E7EB', borderRadius:6, padding:'0.35rem 0.5rem', fontSize:'0.9rem', fontWeight:700, outline:'none', textAlign:'right', fontFamily:'inherit', background: ex.readOnly ? '#F0F0F0' : 'white', color: ex.readOnly ? '#6B7280' : '#111827', boxSizing:'border-box' }}
                  type="number" step="0.01" placeholder={ex.readOnly ? 'auto' : '—'}
                  readOnly={ex.readOnly}
                  value={exames[ex.key] || ''}
                  onChange={e => !ex.readOnly && handleExameChangeOBA(ex.key, e.target.value)} />
                {aberrantesOBA[ex.key] && <span style={{ fontSize:'0.62rem', fontWeight:700, color:'#CA8A04', marginTop:'0.2rem' }}>⚠ VALOR ABERRANTE — CONFIRME</span>}
              </div>"""

if old_exame_div in txt:
    txt = txt.replace(old_exame_div, new_exame_div)
    fixed.append('OK: crítica aberrante nos campos de exame')
else:
    fixed.append('ERRO: div exame não encontrada')

with open(oba, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
