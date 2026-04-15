oba_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba_path, encoding='utf-8') as f:
    txt = f.read()

old = """const EXAMES_BASE = [
  { key: 'leucocitos',     label: 'Leucócitos (Total)',       unit: '/uL' },
  { key: 'neutrofilos',    label: 'Neutrófilos Segmentados',  unit: '%' },
  { key: 'neutrofilos_ul', label: 'Neutrófilos',              unit: '/uL' },
  { key: 'plaquetas',      label: 'Plaquetas',                unit: 'mil/µL' },
  { key: 'ferritina_oba',  label: 'Ferritina',                unit: 'ng/mL' },
  { key: 'vitamina_b12',   label: 'Vitamina B12',             unit: 'pg/mL' },
  { key: 'vitamina_d',     label: 'Vitamina D',               unit: 'ng/mL' },
  { key: 'tsh',            label: 'TSH',                      unit: 'mUI/L' },
  { key: 'hb_glicada',     label: 'Hb Glicada',               unit: '%' },
  { key: 'glicemia',       label: 'Glicemia',                 unit: 'mg/dL' },
  { key: 'insulina',       label: 'Insulina',                 unit: 'µUI/mL' },
  { key: 'triglicerides',  label: 'Triglicérides',            unit: 'mg/dL' },
  { key: 'ast',            label: 'AST',                      unit: 'U/L' },
  { key: 'alt',            label: 'ALT',                      unit: 'U/L' },
  { key: 'gama_gt',        label: 'Gama-GT',                  unit: 'U/L' },
  { key: 'creatinina',     label: 'Creatinina',               unit: 'mg/dL' },
  { key: 'acido_urico',    label: 'Ácido Úrico',              unit: 'mg/dL' },
  { key: 'folatos',        label: 'Folatos',                  unit: 'ng/mL' },
  { key: 'zinco',          label: 'Zinco',                    unit: 'µg/dL' },
  { key: 'vitamina_a',     label: 'Vitamina A',               unit: 'µg/dL' },
  { key: 'vitamina_e',     label: 'Vitamina E',               unit: 'mg/L' },
  { key: 'tiamina',        label: 'Tiamina (B1)',             unit: 'nmol/L' },
  { key: 'selenio',        label: 'Selênio',                  unit: 'µg/L' },
  { key: 'vitamina_c',     label: 'Vitamina C',               unit: 'mg/dL' },
  { key: 'vitamina_k',     label: 'Vitamina K',               unit: 'ng/mL' },
  { key: 'niacina',        label: 'Niacina (B3)',             unit: 'µg/mL' },
  { key: 'testosterona',   label: 'Testosterona',             unit: 'ng/dL' },
]

const EXAMES_HOMEM_40 = [
  { key: 'psa_total', label: 'PSA Total', unit: 'ng/mL' },
  { key: 'ca199',     label: 'CA 19-9',   unit: 'U/mL' },
  { key: 'cea',       label: 'CEA',       unit: 'ng/mL' },
]

const EXAMES_MULHER_40 = [
  { key: 'cea',       label: 'CEA',       unit: 'ng/mL' },
  { key: 'estradiol', label: 'Estradiol', unit: 'pg/mL' },
]"""

new = """const EXAMES_BASE = [
  { key: 'leucocitos',     label: 'Leucócitos (Total)',       unit: '/uL',    ref: '4.000–11.000' },
  { key: 'neutrofilos',    label: 'Neutrófilos Segmentados',  unit: '%',      ref: '40–70%' },
  { key: 'neutrofilos_ul', label: 'Neutrófilos',              unit: '/uL',    ref: '1.800–7.700' },
  { key: 'plaquetas',      label: 'Plaquetas',                unit: 'mil/µL', ref: '150–400' },
  { key: 'ferritina_oba',  label: 'Ferritina',                unit: 'ng/mL',  ref: 'H: 24–336 / F: 25–150' },
  { key: 'vitamina_b12',   label: 'Vitamina B12',             unit: 'pg/mL',  ref: '300–900 (bari: >300)' },
  { key: 'vitamina_d',     label: 'Vitamina D 25-OH',         unit: 'ng/mL',  ref: '30–100 (bari: >30)' },
  { key: 'tsh',            label: 'TSH',                      unit: 'mUI/L',  ref: '0,4–4,5' },
  { key: 'hb_glicada',     label: 'Hb Glicada',               unit: '%',      ref: '<5,7%' },
  { key: 'glicemia',       label: 'Glicemia (jejum)',          unit: 'mg/dL',  ref: '70–99' },
  { key: 'insulina',       label: 'Insulina (jejum)',          unit: 'µUI/mL', ref: '2–15' },
  { key: 'triglicerides',  label: 'Triglicérides',            unit: 'mg/dL',  ref: '<150' },
  { key: 'ast',            label: 'AST (TGO)',                 unit: 'U/L',    ref: 'H: <40 / F: <32' },
  { key: 'alt',            label: 'ALT (TGP)',                 unit: 'U/L',    ref: 'H: <56 / F: <35' },
  { key: 'gama_gt',        label: 'Gama-GT',                  unit: 'U/L',    ref: 'H: <61 / F: <36' },
  { key: 'creatinina',     label: 'Creatinina',               unit: 'mg/dL',  ref: 'H: 0,7–1,2 / F: 0,5–1,0' },
  { key: 'acido_urico',    label: 'Ácido Úrico',              unit: 'mg/dL',  ref: 'H: 3,4–7,0 / F: 2,4–6,0' },
  { key: 'folatos',        label: 'Folatos séricos',           unit: 'ng/mL',  ref: '4,0–20,0' },
  { key: 'zinco',          label: 'Zinco sérico',              unit: 'µg/dL',  ref: '70–120' },
  { key: 'vitamina_a',     label: 'Vitamina A (Retinol)',      unit: 'µg/dL',  ref: '20–77' },
  { key: 'vitamina_e',     label: 'Vitamina E (Tocoferol)',    unit: 'mg/L',   ref: '5–18' },
  { key: 'tiamina',        label: 'Tiamina (B1)',              unit: 'nmol/L', ref: '70–180' },
  { key: 'selenio',        label: 'Selênio',                   unit: 'µg/L',   ref: '63–160' },
  { key: 'vitamina_c',     label: 'Vitamina C',                unit: 'mg/dL',  ref: '0,4–2,0' },
  { key: 'vitamina_k',     label: 'Vitamina K',                unit: 'ng/mL',  ref: '0,2–3,2' },
  { key: 'niacina',        label: 'Niacina (B3)',              unit: 'µg/mL',  ref: '0,5–8,9' },
  { key: 'testosterona',   label: 'Testosterona Total',        unit: 'ng/dL',  ref: 'H: 300–1.000 / F: 15–70' },
]

const EXAMES_HOMEM_40 = [
  { key: 'psa_total', label: 'PSA Total', unit: 'ng/mL', ref: '<4,0' },
  { key: 'ca199',     label: 'CA 19-9',   unit: 'U/mL',  ref: '<37' },
  { key: 'cea',       label: 'CEA',       unit: 'ng/mL', ref: 'H: <5,0 / F: <3,8' },
]

const EXAMES_MULHER_40 = [
  { key: 'cea',       label: 'CEA',       unit: 'ng/mL', ref: '<3,8' },
  { key: 'estradiol', label: 'Estradiol', unit: 'pg/mL', ref: 'varia por fase do ciclo' },
]"""

if old in txt:
    txt = txt.replace(old, new)
    print('OK: valores de referência adicionados ao EXAMES_BASE')
else:
    print('ERRO: EXAMES_BASE não encontrado')

# Agora exibir o ref abaixo de cada campo na renderização
old_render = """          {todosExames.filter(ex => !(examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && ex.key === 'ferritina_oba')).map(ex => (
            <div key={ex.key} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'0.5rem', alignItems:'center', marginBottom:'0.5rem', padding:'0.3rem 0', borderBottom:'1px solid #F3F4F6' }}>
              <div>
                <span style={{ fontSize:'0.85rem', fontWeight:600, color:'#374151' }}>{ex.label}</span>
                <span style={{ fontSize:'0.7rem', color:'#9CA3AF', marginLeft:'0.4rem' }}>({ex.unit})</span>
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

if old_render in txt:
    txt = txt.replace(old_render, new_render)
    print('OK: V.R. exibido abaixo de cada analito')
else:
    print('ERRO: renderização dos exames não encontrada')

with open(oba_path, 'w', encoding='utf-8') as f:
    f.write(txt)

print('Concluído.')
