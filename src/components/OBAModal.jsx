import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'

const ETAPAS = ['anamnese', 'exames', 'concluido']

const TIPOS_CIRURGIA = ['Y DE ROUX', 'FOBI-CAPELLA', 'SLEEVE', 'BANDA GÁSTRICA AJUSTÁVEL', 'NÃO SEI']

const ATIVIDADES = ['SEDENTÁRIO', 'CAMINHADAS', 'ACADEMIA', 'ACADEMIA COM PERSONAL', 'HIDROGINÁSTICA', 'FISIOTERAPIA', 'PRÁTICA ESPORTIVA']

const PROJETOS = [
  'QUERO MANTER O PESO ATUAL',
  'PRETENDO FAZER CIRURGIA PLÁSTICA',
  'PRETENDO FAZER REABILITAÇÃO',
  'PRETENDO MELHORAR MINHA AUTOESTIMA',
  'PRETENDO TER FILHO',
  'PRETENDO UM EMPREGO NOVO',
  'PRETENDO ABRIR UM NEGÓCIO',
  'PRETENDO ESTUDAR',
  'PRETENDO MANTER A MINHA ATIVIDADE FÍSICA',
  'PRETENDO AUMENTAR A MINHA ATIVIDADE FÍSICA',
  'PRETENDO PRATICAR UM ESPORTE',
  'PRETENDO VIAJAR MAIS',
  'PRETENDO AJUDAR OUTRAS PESSOAS',
]

const EXAMES = [
  { key: 'neutrofilos',   label: 'Neutrófilos',     unit: '%' },
  { key: 'plaquetas',     label: 'Plaquetas',        unit: 'mil/µL' },
  { key: 'ferritina_oba', label: 'Ferritina',        unit: 'ng/mL' },
  { key: 'vitamina_b12',  label: 'Vitamina B12',     unit: 'pg/mL' },
  { key: 'vitamina_d',    label: 'Vitamina D',       unit: 'ng/mL' },
  { key: 'tsh',           label: 'TSH',              unit: 'mUI/L' },
  { key: 'hb_glicada',    label: 'Hb Glicada',       unit: '%' },
  { key: 'glicemia',      label: 'Glicemia',         unit: 'mg/dL' },
  { key: 'triglicerides', label: 'Triglicérides',    unit: 'mg/dL' },
  { key: 'ast',           label: 'AST',              unit: 'U/L' },
  { key: 'alt',           label: 'ALT',              unit: 'U/L' },
  { key: 'gama_gt',       label: 'Gama-GT',          unit: 'U/L' },
  { key: 'folatos',       label: 'Folatos',          unit: 'ng/mL' },
  { key: 'zinco',         label: 'Zinco',            unit: 'µg/dL' },
  { key: 'vitamina_a',    label: 'Vitamina A',       unit: 'µg/dL' },
  { key: 'vitamina_e',    label: 'Vitamina E',       unit: 'mg/L' },
  { key: 'tiamina',       label: 'Tiamina (B1)',     unit: 'nmol/L' },
  { key: 'selenio',       label: 'Selênio',          unit: 'µg/L' },
  { key: 'vitamina_c',    label: 'Vitamina C',       unit: 'mg/dL' },
  { key: 'vitamina_k',    label: 'Vitamina K',       unit: 'ng/mL' },
  { key: 'niacina',       label: 'Niacina (B3)',     unit: 'µg/mL' },
]

export default function OBAModal({ sexo, cpf, onConcluir, onFechar }) {
  const [etapa, setEtapa] = useState('anamnese')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const saudacao = sexo === 'F' ? 'Bem-vinda' : 'Bem-vindo'

  // Anamnese
  const [form, setForm] = useState({
    tempo_pos_cirurgia: '',
    tipo_cirurgia: '',
    peso_antes: '',
    peso_atual: '',
    acompanhamento: '',
    atividade_fisica: [],
    cirurgia_plastica: null,
    projetos_vida: [],
    meta_peso: '',
    meta_kg: '',
  })

  // Exames
  const [exames, setExames] = useState(
    Object.fromEntries(EXAMES.map(e => [e.key, '']))
  )

  function toggleArray(arr, val) {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  function setField(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  const pesoAntes = parseFloat(form.peso_antes)
  const pesoAtual = parseFloat(form.peso_atual)
  const kgPerdidos = (!isNaN(pesoAntes) && !isNaN(pesoAtual)) ? pesoAntes - pesoAtual : null

  async function salvarEAvancar() {
    setErro('')
    if (!form.tempo_pos_cirurgia) { setErro('Informe o tempo pós-cirurgia.'); return }
    if (!form.tipo_cirurgia) { setErro('Selecione o tipo de cirurgia.'); return }
    if (!form.acompanhamento) { setErro('Selecione a opção de acompanhamento.'); return }

    setLoading(true)
    const { error } = await supabase.from('oba_anamnese').insert({
      cpf: cpf || null,
      sexo,
      tempo_pos_cirurgia: form.tempo_pos_cirurgia,
      tipo_cirurgia: form.tipo_cirurgia,
      peso_antes: pesoAntes || null,
      peso_atual: pesoAtual || null,
      kg_perdidos: kgPerdidos || null,
      acompanhamento: form.acompanhamento,
      atividade_fisica: form.atividade_fisica,
      cirurgia_plastica: form.cirurgia_plastica,
      projetos_vida: form.projetos_vida,
      meta_peso: form.meta_peso,
      meta_kg: form.meta_kg ? parseFloat(form.meta_kg) : null,
      // exames — salvos na próxima etapa
      ...Object.fromEntries(EXAMES.map(e => [e.key, exames[e.key] ? parseFloat(exames[e.key]) : null]))
    })
    setLoading(false)

    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }
    setEtapa('exames')
  }

  async function salvarExamesEConcluir() {
    setLoading(true)
    // Atualiza apenas os exames se já tiver registro, senão insere
    // Simples: inserir novo registro de exames com cpf
    await supabase.from('oba_anamnese').insert({
      cpf: cpf || null,
      sexo,
      ...Object.fromEntries(EXAMES.map(e => [e.key, exames[e.key] ? parseFloat(exames[e.key]) : null]))
    })
    setLoading(false)
    onConcluir()
  }

  const s = {
    overlay: { position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'1.5rem 1rem' },
    card: { background:'white', borderRadius:20, width:'100%', maxWidth:560, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', marginBottom:'2rem' },
    header: { background:'linear-gradient(135deg, #7B1E1E, #DC2626)', padding:'1.5rem', borderRadius:'20px 20px 0 0', display:'flex', alignItems:'center', gap:'1rem' },
    title: { color:'white', fontSize:'1.4rem', fontWeight:800, margin:0 },
    subtitle: { color:'rgba(255,255,255,0.75)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px', marginTop:'0.2rem' },
    body: { padding:'1.5rem' },
    label: { display:'block', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'#6B7280', marginBottom:'0.5rem', marginTop:'1.2rem' },
    input: { width:'100%', border:'1.5px solid #E5E7EB', borderRadius:8, padding:'0.65rem 0.9rem', fontSize:'0.92rem', outline:'none', fontFamily:'inherit' },
    checkRow: (active) => ({ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem', borderRadius:8, border:`1.5px solid ${active ? '#DC2626' : '#E5E7EB'}`, background: active ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', marginBottom:'0.4rem', fontSize:'0.85rem', fontWeight: active ? 700 : 500, color: active ? '#7B1E1E' : '#374151', transition:'all 0.15s' }),
    radioRow: (active) => ({ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem', borderRadius:8, border:`1.5px solid ${active ? '#DC2626' : '#E5E7EB'}`, background: active ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', marginBottom:'0.4rem', fontSize:'0.85rem', fontWeight: active ? 700 : 500, color: active ? '#7B1E1E' : '#374151', transition:'all 0.15s' }),
    btn: { width:'100%', background:'#7B1E1E', color:'white', border:'none', borderRadius:10, padding:'0.9rem', fontSize:'1rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginTop:'1.5rem' },
    btnSec: { width:'100%', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:10, padding:'0.7rem', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginTop:'0.5rem' },
    exameRow: { display:'grid', gridTemplateColumns:'1fr auto', gap:'0.5rem', alignItems:'center', marginBottom:'0.6rem' },
    exameLabel: { fontSize:'0.85rem', fontWeight:600, color:'#374151' },
    exameUnit: { fontSize:'0.7rem', color:'#9CA3AF' },
    exameInput: { width:90, border:'1.5px solid #E5E7EB', borderRadius:6, padding:'0.4rem 0.6rem', fontSize:'0.85rem', outline:'none', textAlign:'right', fontFamily:'inherit' },
  }

  return (
    <div style={s.overlay} onClick={onFechar}>
      <div style={s.card} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <img src={logo} alt="OBA" style={{ width:48, height:48, objectFit:'contain', filter:'brightness(10)' }} />
          <div>
            <h2 style={s.title}>{saudacao} ao Projeto OBA!</h2>
            <p style={s.subtitle}>Otimizar o Bariátrico</p>
          </div>
        </div>

        <div style={s.body}>
          <div style={{ background:'#FEF2F2', border:'1px solid #FECDD3', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'0.5rem' }}>
            <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', fontWeight:700, marginBottom:'0.3rem' }}>O bariátrico é um paciente complexo.</p>
            <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'#9B2C2C' }}>Precisamos de mais informações para cuidar de você. Marque as caixinhas e preencha os campos:</p>
          </div>

          {/* ── ETAPA ANAMNESE ── */}
          {etapa === 'anamnese' && (
            <div>
              {/* 1. Tempo pós-cirurgia */}
              <label style={s.label}>1. Tempo pós-cirurgia</label>
              <input style={s.input} placeholder="Ex: 2 anos e 3 meses" value={form.tempo_pos_cirurgia} onChange={e => setField('tempo_pos_cirurgia', e.target.value)} />

              {/* 2. Tipo de cirurgia */}
              <label style={s.label}>2. Tipo de cirurgia</label>
              {TIPOS_CIRURGIA.map(t => (
                <div key={t} style={s.radioRow(form.tipo_cirurgia === t)} onClick={() => setField('tipo_cirurgia', t)}>
                  <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${form.tipo_cirurgia === t ? '#DC2626' : '#D1D5DB'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {form.tipo_cirurgia === t && <div style={{ width:8, height:8, borderRadius:'50%', background:'#DC2626' }} />}
                  </div>
                  {t}
                </div>
              ))}

              {/* 3+4. Pesos */}
              <label style={s.label}>3. Peso antes da cirurgia (kg)</label>
              <input style={s.input} type="number" placeholder="Ex: 120" value={form.peso_antes} onChange={e => setField('peso_antes', e.target.value)} />

              <label style={s.label}>4. Peso atual (kg)</label>
              <input style={s.input} type="number" placeholder="Ex: 78" value={form.peso_atual} onChange={e => setField('peso_atual', e.target.value)} />

              {kgPerdidos !== null && kgPerdidos > 0 && (
                <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'0.6rem 0.9rem', marginTop:'0.5rem' }}>
                  <p style={{ color:'#166534', fontSize:'0.85rem', fontWeight:700 }}>✓ Você perdeu {kgPerdidos.toFixed(1)} kg</p>
                </div>
              )}

              {/* 5. Acompanhamento */}
              <label style={s.label}>5. Acompanhamento médico</label>
              {[
                'FAÇO ACOMPANHAMENTO MÉDICO E REPOSIÇÕES',
                'FIZ ACOMPANHAMENTO MAS PAREI',
                'NÃO FIZ ACOMPANHAMENTO NEM REPOSIÇÕES',
                'NÃO FAÇO ACOMPANHAMENTO MÉDICO',
              ].map(op => (
                <div key={op} style={s.radioRow(form.acompanhamento === op)} onClick={() => setField('acompanhamento', op)}>
                  <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${form.acompanhamento === op ? '#DC2626' : '#D1D5DB'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {form.acompanhamento === op && <div style={{ width:8, height:8, borderRadius:'50%', background:'#DC2626' }} />}
                  </div>
                  {op}
                </div>
              ))}

              {/* 6. Atividade física */}
              <label style={s.label}>6. Sua atividade física (marque todas que faz)</label>
              {ATIVIDADES.map(at => (
                <div key={at} style={s.checkRow(form.atividade_fisica.includes(at))} onClick={() => setField('atividade_fisica', toggleArray(form.atividade_fisica, at))}>
                  <input type="checkbox" readOnly checked={form.atividade_fisica.includes(at)} style={{ width:15, height:15, flexShrink:0 }} />
                  {at}
                </div>
              ))}

              {/* 7. Cirurgia plástica */}
              <label style={s.label}>7. Cirurgia plástica pós-bariátrica</label>
              <div style={{ display:'flex', gap:'0.8rem' }}>
                {[['Sim', true], ['Não', false]].map(([lbl, val]) => (
                  <div key={lbl} style={{ ...s.radioRow(form.cirurgia_plastica === val), flex:1, justifyContent:'center' }} onClick={() => setField('cirurgia_plastica', val)}>
                    <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${form.cirurgia_plastica === val ? '#DC2626' : '#D1D5DB'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {form.cirurgia_plastica === val && <div style={{ width:8, height:8, borderRadius:'50%', background:'#DC2626' }} />}
                    </div>
                    {lbl}
                  </div>
                ))}
              </div>

              {/* 8. Projeto de vida */}
              <label style={s.label}>8. Projeto de vida (marque todos que se aplicam)</label>

              {/* Meta de peso */}
              <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.4rem' }}>
                {['QUERO MANTER O PESO ATUAL', 'QUERO PERDER', 'QUERO GANHAR'].map(op => (
                  <div key={op} style={{ ...s.radioRow(form.meta_peso === op), flex:1, fontSize:'0.75rem', textAlign:'center', justifyContent:'center' }} onClick={() => setField('meta_peso', op)}>
                    <div style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${form.meta_peso === op ? '#DC2626' : '#D1D5DB'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {form.meta_peso === op && <div style={{ width:7, height:7, borderRadius:'50%', background:'#DC2626' }} />}
                    </div>
                    {op}
                  </div>
                ))}
              </div>
              {(form.meta_peso === 'QUERO PERDER' || form.meta_peso === 'QUERO GANHAR') && (
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.6rem' }}>
                  <input style={{ ...s.input, width:100 }} type="number" placeholder="kg" value={form.meta_kg} onChange={e => setField('meta_kg', e.target.value)} />
                  <span style={{ fontSize:'0.85rem', color:'#6B7280' }}>kg</span>
                </div>
              )}

              {PROJETOS.map(p => (
                <div key={p} style={s.checkRow(form.projetos_vida.includes(p))} onClick={() => setField('projetos_vida', toggleArray(form.projetos_vida, p))}>
                  <input type="checkbox" readOnly checked={form.projetos_vida.includes(p)} style={{ width:15, height:15, flexShrink:0 }} />
                  {p}
                </div>
              ))}

              {erro && <p style={{ color:'#DC2626', fontSize:'0.85rem', marginTop:'0.8rem' }}>{erro}</p>}

              <button style={s.btn} onClick={salvarEAvancar} disabled={loading}>
                {loading ? 'Salvando...' : 'Avançar para os Exames →'}
              </button>
              <button style={s.btnSec} onClick={onFechar}>Agora não</button>
            </div>
          )}

          {/* ── ETAPA EXAMES ── */}
          {etapa === 'exames' && (
            <div>
              <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
                <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'1px', color:'#92400E', fontWeight:700 }}>Exames complementares</p>
                <p style={{ fontSize:'0.8rem', color:'#78350F', marginTop:'0.3rem' }}>Preencha os que tiver em mãos. Você pode pular os que não tem agora.</p>
              </div>

              {EXAMES.map(ex => (
                <div key={ex.key} style={s.exameRow}>
                  <div>
                    <span style={s.exameLabel}>{ex.label}</span>
                    <span style={{ ...s.exameUnit, marginLeft:'0.4rem' }}>({ex.unit})</span>
                  </div>
                  <input
                    style={s.exameInput}
                    type="number"
                    step="0.01"
                    placeholder="—"
                    value={exames[ex.key]}
                    onChange={e => setExames(prev => ({ ...prev, [ex.key]: e.target.value }))}
                  />
                </div>
              ))}

              {erro && <p style={{ color:'#DC2626', fontSize:'0.85rem', marginTop:'0.8rem' }}>{erro}</p>}

              <button style={s.btn} onClick={salvarExamesEConcluir} disabled={loading}>
                {loading ? 'Salvando...' : 'Concluir e ir para a Avaliação →'}
              </button>
              <button style={s.btnSec} onClick={onConcluir}>Pular exames e ir para a Avaliação</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
