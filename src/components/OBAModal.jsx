import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'

const TIPOS_CIRURGIA = ['Y DE ROUX', 'FOBI-CAPELLA', 'SLEEVE', 'BANDA GÁSTRICA AJUSTÁVEL', 'NÃO SEI']

const ACOMPANHAMENTO_OPS = [
  'FAÇO ACOMPANHAMENTO MÉDICO E REPOSIÇÕES',
  'FIZ ACOMPANHAMENTO MAS PAREI',
  'NÃO FIZ ACOMPANHAMENTO NEM REPOSIÇÕES',
  'NÃO FAÇO ACOMPANHAMENTO MÉDICO',
]

const STATUS_GLICEMICO_OPS = [
  'NÃO ERA E NÃO SOU DIABÉTICO',
  'ERA DIABÉTICO E FUI CURADO',
  'ERA DIABÉTICO E CONTINUO DIABÉTICO',
  'NÃO ERA, MAS FIQUEI DIABÉTICO APÓS A CIRURGIA',
]

const STATUS_PRESSORICO_OPS = [
  'NÃO SOU HIPERTENSO',
  'SOU HIPERTENSO CONTROLADO',
  'SOU HIPERTENSO MAL CONTROLADO',
]

const ATIVIDADES = ['SEDENTÁRIO', 'CAMINHADAS', 'ACADEMIA', 'ACADEMIA COM PERSONAL', 'HIDROGINÁSTICA', 'FISIOTERAPIA', 'PRÁTICA ESPORTIVA']

const PROJETOS = [
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

const COMPULSOES = ['DOCES', 'COMIDA', 'GELO', 'ÁLCOOL', 'JOGO', 'TRABALHO', 'OUTRA']

const MEDICAMENTOS = [
  'FERRO VENOSO', 'VIT. B12 INTRAMUSCULAR', 'VIT. B12 SUBLINGUAL', 'POLIVITAMÍNICO ORAL',
  'ANTIDEPRESSIVO', 'REMÉDIO PARA DORMIR', 'LAXANTES', 'REMÉDIO PARA PRESSÃO',
  'REMÉDIO PARA DORES', 'REMÉDIO PARA BAIXAR A GLICEMIA', 'REMÉDIO PARA COLESTEROL', 'REMÉDIO PARA TRIGLICÉRIDES',
]

const EMAGRECEDORES = ['Ozempic', 'Rybelsus', 'Wegovy', 'Mounjaro', 'Saxenda', 'Victoza', 'Trulicity', 'Xultophi']

// Exames base — sempre presentes
const EXAMES_BASE = [
  { key: 'leucocitos',    label: 'Leucócitos (Total)',        unit: '/uL' },
  { key: 'neutrofilos',   label: 'Neutrófilos Segmentados',   unit: '%' },
  { key: 'neutrofilos_ul',label: 'Neutrófilos',               unit: '/uL' },
  { key: 'plaquetas',     label: 'Plaquetas',                  unit: 'mil/µL' },
  { key: 'ferritina_oba', label: 'Ferritina',                  unit: 'ng/mL' },
  { key: 'vitamina_b12',  label: 'Vitamina B12',               unit: 'pg/mL' },
  { key: 'vitamina_d',    label: 'Vitamina D',                 unit: 'ng/mL' },
  { key: 'tsh',           label: 'TSH',                        unit: 'mUI/L' },
  { key: 'hb_glicada',    label: 'Hb Glicada',                 unit: '%' },
  { key: 'glicemia',      label: 'Glicemia',                   unit: 'mg/dL' },
  { key: 'insulina',      label: 'Insulina',                   unit: 'µUI/mL' },
  { key: 'triglicerides', label: 'Triglicérides',              unit: 'mg/dL' },
  { key: 'ast',           label: 'AST',                        unit: 'U/L' },
  { key: 'alt',           label: 'ALT',                        unit: 'U/L' },
  { key: 'gama_gt',       label: 'Gama-GT',                    unit: 'U/L' },
  { key: 'creatinina',    label: 'Creatinina',                 unit: 'mg/dL' },
  { key: 'acido_urico',   label: 'Ácido Úrico',                unit: 'mg/dL' },
  { key: 'folatos',       label: 'Folatos',                    unit: 'ng/mL' },
  { key: 'zinco',         label: 'Zinco',                      unit: 'µg/dL' },
  { key: 'vitamina_a',    label: 'Vitamina A',                 unit: 'µg/dL' },
  { key: 'vitamina_e',    label: 'Vitamina E',                 unit: 'mg/L' },
  { key: 'tiamina',       label: 'Tiamina (B1)',               unit: 'nmol/L' },
  { key: 'selenio',       label: 'Selênio',                    unit: 'µg/L' },
  { key: 'vitamina_c',    label: 'Vitamina C',                 unit: 'mg/dL' },
  { key: 'vitamina_k',    label: 'Vitamina K',                 unit: 'ng/mL' },
  { key: 'niacina',       label: 'Niacina (B3)',               unit: 'µg/mL' },
  { key: 'testosterona',  label: 'Testosterona',               unit: 'ng/dL' },
]

const EXAMES_HOMEM_40 = [
  { key: 'psa_total',     label: 'PSA Total',                  unit: 'ng/mL' },
  { key: 'ca199',         label: 'CA 19-9',                    unit: 'U/mL' },
  { key: 'cea',           label: 'CEA',                        unit: 'ng/mL' },
]

const EXAMES_MULHER_40 = [
  { key: 'cea',           label: 'CEA',                        unit: 'ng/mL' },
  { key: 'estradiol',     label: 'Estradiol',                  unit: 'pg/mL' },
]

function Radio16({ active }) {
  return (
    <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${active ? '#DC2626' : '#D1D5DB'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {active && <div style={{ width:8, height:8, borderRadius:'50%', background:'#DC2626' }} />}
    </div>
  )
}

function RadioGroup({ options, value, onChange }) {
  return options.map(op => (
    <div key={op} onClick={() => onChange(op)} style={{
      display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem',
      borderRadius:8, border:`1.5px solid ${value === op ? '#DC2626' : '#E5E7EB'}`,
      background: value === op ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', marginBottom:'0.4rem',
      fontSize:'0.85rem', fontWeight: value === op ? 700 : 500, color: value === op ? '#7B1E1E' : '#374151',
    }}>
      <Radio16 active={value === op} />{op}
    </div>
  ))
}

function CheckRow({ label, checked, onClick, disabled }) {
  return (
    <div onClick={() => !disabled && onClick()} style={{
      display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem',
      borderRadius:8, border:`1.5px solid ${checked ? '#DC2626' : '#E5E7EB'}`,
      background: disabled ? '#F9FAFB' : checked ? '#FEF2F2' : '#FAFAFA',
      cursor: disabled ? 'not-allowed' : 'pointer', marginBottom:'0.4rem',
      fontSize:'0.85rem', fontWeight: checked ? 700 : 500,
      color: disabled ? '#9CA3AF' : checked ? '#7B1E1E' : '#374151',
      opacity: disabled ? 0.5 : 1,
    }}>
      <input type="checkbox" readOnly checked={checked} disabled={disabled} style={{ width:15, height:15, flexShrink:0 }} />
      {label}
    </div>
  )
}

const lbl = (mt) => ({ display:'block', fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#374151', marginBottom:'0.5rem', marginTop: mt || '1.2rem' })
const inp = { width:'100%', border:'1.5px solid #E5E7EB', borderRadius:8, padding:'0.65rem 0.9rem', fontSize:'0.92rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const btnPrimary = { width:'100%', background:'#7B1E1E', color:'white', border:'none', borderRadius:10, padding:'0.9rem', fontSize:'1rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginTop:'1.5rem' }
const btnSecondary = { width:'100%', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:10, padding:'0.7rem', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginTop:'0.5rem' }
const overlayStyle = { position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'1.5rem 1rem' }
const cardStyle = { background:'white', borderRadius:20, width:'100%', maxWidth:560, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', marginBottom:'2rem' }
const headerStyle = { background:'linear-gradient(135deg, #7B1E1E, #DC2626)', padding:'1.5rem', borderRadius:'20px 20px 0 0', display:'flex', alignItems:'center', gap:'1rem' }

function calcDias(dataStr) {
  if (!dataStr) return null
  const d = new Date(dataStr)
  if (isNaN(d)) return null
  const hoje = new Date()
  const diff = Math.floor((hoje - d) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : null
}

export default function OBAModal({ sexo, cpf, idade, onConcluir, onFechar }) {
  const [etapa, setEtapa] = useState('anamnese')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const saudacao = sexo === 'F' ? 'Bem-vinda' : 'Bem-vindo'
  const isFeminino = sexo === 'F'
  const idadeNum = parseInt(idade) || 0

  const [form, setForm] = useState({
    tempo_pos_cirurgia: '', tipo_cirurgia: '', peso_antes: '', peso_atual: '',
    acompanhamento: '', status_gestacional: '', semanas_gestacao: '',
    status_glicemico: '', status_pressorico: '',
    atividade_fisica: [], cirurgia_plastica: null,
    meta_peso: '', meta_kg: '', projetos_vida: [],
    compulsoes: [], medicamentos: [], emagrecedores: {},
  })

  const [dataExames, setDataExames] = useState('')
  const diasExames = calcDias(dataExames)

  // Determinar quais exames mostrar
  const examesExtras = idadeNum >= 40
    ? (isFeminino ? EXAMES_MULHER_40 : EXAMES_HOMEM_40)
    : []
  const todosExames = [...EXAMES_BASE, ...examesExtras]
  const [exames, setExames] = useState(Object.fromEntries(todosExames.map(e => [e.key, ''])))

  const sf = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const tog = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

  const pesoAntes = parseFloat(form.peso_antes)
  const pesoAtual = parseFloat(form.peso_atual)
  const kgPerdidos = (!isNaN(pesoAntes) && !isNaN(pesoAtual)) ? pesoAntes - pesoAtual : null

  function toggleAtividade(val) {
    if (val === 'SEDENTÁRIO') sf('atividade_fisica', form.atividade_fisica.includes('SEDENTÁRIO') ? [] : ['SEDENTÁRIO'])
    else if (!form.atividade_fisica.includes('SEDENTÁRIO')) sf('atividade_fisica', tog(form.atividade_fisica, val))
  }

  async function salvarAnamnese() {
    setErro('')
    if (!form.tempo_pos_cirurgia) { setErro('Informe o tempo pós-cirurgia.'); return }
    if (!form.tipo_cirurgia) { setErro('Selecione o tipo de cirurgia.'); return }
    if (!form.acompanhamento) { setErro('Selecione a opção de acompanhamento.'); return }
    setLoading(true)
    const projetos = [
      form.meta_peso === 'MANTER' ? 'QUERO MANTER O PESO ATUAL' :
      form.meta_peso === 'PERDER' ? `QUERO PERDER ${form.meta_kg} kg` :
      form.meta_peso === 'GANHAR' ? `QUERO GANHAR ${form.meta_kg} kg` : null,
      ...form.projetos_vida
    ].filter(Boolean)
    const { error } = await supabase.from('oba_anamnese').insert({
      cpf: cpf || null, sexo,
      tempo_pos_cirurgia: form.tempo_pos_cirurgia, tipo_cirurgia: form.tipo_cirurgia,
      peso_antes: pesoAntes || null, peso_atual: pesoAtual || null, kg_perdidos: kgPerdidos || null,
      acompanhamento: form.acompanhamento,
      status_gestacional: form.status_gestacional || null,
      semanas_gestacao: form.semanas_gestacao ? parseFloat(form.semanas_gestacao) : null,
      status_glicemico: form.status_glicemico || null,
      status_pressorico: form.status_pressorico || null,
      atividade_fisica: form.atividade_fisica,
      cirurgia_plastica: form.cirurgia_plastica,
      projetos_vida: projetos, compulsoes: form.compulsoes, medicamentos: form.medicamentos,
      emagrecedores: Object.keys(form.emagrecedores).length ? form.emagrecedores : null,
    })
    setLoading(false)
    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }
    setEtapa('exames')
  }

  async function salvarExames() {
    setLoading(true)
    await supabase.from('oba_anamnese').insert({
      cpf: cpf || null, sexo,
      data_exames: dataExames || null,
      dias_exames: diasExames,
      ...Object.fromEntries(todosExames.map(e => [e.key, exames[e.key] ? parseFloat(exames[e.key]) : null]))
    })
    setLoading(false)
    onConcluir()
  }

  // ── ETAPA EXAMES ──
  if (etapa === 'exames') return (
    <div style={overlayStyle} onClick={onConcluir}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <img src={logo} alt="OBA" style={{ width:48, height:48, objectFit:'contain', filter:'brightness(10)' }} />
          <div>
            <h2 style={{ color:'white', fontSize:'1.3rem', fontWeight:800, margin:0 }}>Exames Complementares</h2>
            <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px' }}>Projeto OBA — etapa final</p>
          </div>
        </div>
        <div style={{ padding:'1.5rem' }}>
          <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
            <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'1px', color:'#92400E', fontWeight:700 }}>
              Preencha os que tiver em mãos. Pode pular os que não tem agora.
            </p>
          </div>

          {/* Data dos exames */}
          <label style={lbl('0')}>Data dos exames</label>
          <input style={inp} type="date" value={dataExames} onChange={e => setDataExames(e.target.value)} />
          {diasExames !== null && (
            <div style={{ background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:8, padding:'0.5rem 0.9rem', marginTop:'0.4rem' }}>
              <p style={{ color:'#0369A1', fontSize:'0.85rem', fontWeight:700 }}>
                {diasExames === 0 ? 'Exames de hoje' : `Exames realizados há ${diasExames} dia${diasExames > 1 ? 's' : ''}`}
              </p>
            </div>
          )}

          <div style={{ height:'0.5rem' }} />
          {todosExames.map(ex => (
            <div key={ex.key} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'0.5rem', alignItems:'center', marginBottom:'0.5rem', padding:'0.3rem 0', borderBottom:'1px solid #F3F4F6' }}>
              <div>
                <span style={{ fontSize:'0.85rem', fontWeight:600, color:'#374151' }}>{ex.label}</span>
                <span style={{ fontSize:'0.7rem', color:'#9CA3AF', marginLeft:'0.4rem' }}>({ex.unit})</span>
              </div>
              <input style={{ width:90, border:'1.5px solid #E5E7EB', borderRadius:6, padding:'0.4rem 0.6rem', fontSize:'0.85rem', outline:'none', textAlign:'right', fontFamily:'inherit' }}
                type="number" step="0.01" placeholder="—"
                value={exames[ex.key] || ''}
                onChange={e => setExames(p => ({ ...p, [ex.key]: e.target.value }))} />
            </div>
          ))}

          {idadeNum >= 40 && (
            <div style={{ background:'#FEF9EC', border:'1px solid #FDE68A', borderRadius:8, padding:'0.5rem 0.9rem', marginBottom:'0.5rem' }}>
              <p style={{ color:'#92400E', fontSize:'0.78rem', fontWeight:700 }}>
                {isFeminino ? '+ CEA e Estradiol incluídos (mulher ≥ 40 anos)' : '+ PSA Total, CA 19-9 e CEA incluídos (homem ≥ 40 anos)'}
              </p>
            </div>
          )}

          <button style={btnPrimary} onClick={salvarExames} disabled={loading}>{loading ? 'Salvando...' : 'Concluir e ir para a Avaliação →'}</button>
          <button style={btnSecondary} onClick={onConcluir}>Pular exames e ir para a Avaliação</button>
        </div>
      </div>
    </div>
  )

  // ── ETAPA ANAMNESE ──
  return (
    <div style={overlayStyle} onClick={onFechar}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <img src={logo} alt="OBA" style={{ width:48, height:48, objectFit:'contain', filter:'brightness(10)' }} />
          <div>
            <h2 style={{ color:'white', fontSize:'1.4rem', fontWeight:800, margin:0 }}>{saudacao} ao Projeto OBA!</h2>
            <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px', marginTop:'0.2rem' }}>Otimizar o Bariátrico</p>
          </div>
        </div>
        <div style={{ padding:'1.5rem' }}>
          <div style={{ background:'#FEF2F2', border:'1px solid #FECDD3', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'0.5rem' }}>
            <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', fontWeight:700, marginBottom:'0.3rem' }}>O bariátrico é um paciente complexo.</p>
            <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'#9B2C2C' }}>Precisamos de mais informações para cuidar de você. Marque as caixinhas e preencha os campos:</p>
          </div>

          {/* 1 */}
          <label style={lbl()}>1. Tempo pós-cirurgia</label>
          <input style={inp} placeholder="Ex: 2 anos e 3 meses" value={form.tempo_pos_cirurgia} onChange={e => sf('tempo_pos_cirurgia', e.target.value)} />

          {/* 2 */}
          <label style={lbl()}>2. Tipo de cirurgia</label>
          <RadioGroup options={TIPOS_CIRURGIA} value={form.tipo_cirurgia} onChange={v => sf('tipo_cirurgia', v)} />

          {/* 3+4 */}
          <label style={lbl()}>3. Peso antes da cirurgia (kg)</label>
          <input style={inp} type="number" placeholder="Ex: 120" value={form.peso_antes} onChange={e => sf('peso_antes', e.target.value)} />
          <label style={lbl()}>4. Peso atual (kg)</label>
          <input style={inp} type="number" placeholder="Ex: 78" value={form.peso_atual} onChange={e => sf('peso_atual', e.target.value)} />
          {kgPerdidos !== null && kgPerdidos > 0 && (
            <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'0.5rem 0.9rem', marginTop:'0.4rem' }}>
              <p style={{ color:'#166534', fontSize:'0.85rem', fontWeight:700 }}>✓ Você perdeu {kgPerdidos.toFixed(1)} kg</p>
            </div>
          )}

          {/* 5 */}
          <label style={lbl()}>5. Acompanhamento médico</label>
          <RadioGroup options={ACOMPANHAMENTO_OPS} value={form.acompanhamento} onChange={v => sf('acompanhamento', v)} />

          {/* STATUS GESTACIONAL — só para mulheres */}
          {isFeminino && (
            <>
              <label style={lbl()}>Status gestacional</label>
              <CheckRow
                label="ESTOU GRÁVIDA"
                checked={form.status_gestacional === 'GRÁVIDA'}
                onClick={() => sf('status_gestacional', form.status_gestacional === 'GRÁVIDA' ? '' : 'GRÁVIDA')}
              />
              {form.status_gestacional === 'GRÁVIDA' && (
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.5rem' }}>
                  <input style={{ ...inp, width:120 }} type="number" placeholder="Semanas" value={form.semanas_gestacao} onChange={e => sf('semanas_gestacao', e.target.value)} />
                  <span style={{ fontSize:'0.85rem', color:'#6B7280' }}>semanas de gestação</span>
                </div>
              )}
            </>
          )}

          {/* 6 */}
          <label style={lbl()}>6. Status glicêmico</label>
          <RadioGroup options={STATUS_GLICEMICO_OPS} value={form.status_glicemico} onChange={v => sf('status_glicemico', v)} />

          {/* 7 */}
          <label style={lbl()}>7. Status pressórico</label>
          <RadioGroup options={STATUS_PRESSORICO_OPS} value={form.status_pressorico} onChange={v => sf('status_pressorico', v)} />

          {/* 8 */}
          <label style={lbl()}>8. Sua atividade física</label>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.5rem' }}>Se marcar SEDENTÁRIO, os demais são desmarcados.</p>
          {ATIVIDADES.map(at => {
            const sedMarcado = form.atividade_fisica.includes('SEDENTÁRIO')
            const disabled = at !== 'SEDENTÁRIO' && sedMarcado
            return <CheckRow key={at} label={at} checked={form.atividade_fisica.includes(at)} disabled={disabled} onClick={() => toggleAtividade(at)} />
          })}

          {/* 9 */}
          <label style={lbl()}>9. Cirurgia plástica pós-bariátrica</label>
          <div style={{ display:'flex', gap:'0.8rem' }}>
            {[['Sim', true], ['Não', false]].map(([l, v]) => (
              <div key={l} onClick={() => sf('cirurgia_plastica', v)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem', padding:'0.5rem', borderRadius:8, border:`1.5px solid ${form.cirurgia_plastica === v ? '#DC2626' : '#E5E7EB'}`, background: form.cirurgia_plastica === v ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', fontWeight: form.cirurgia_plastica === v ? 700 : 500, color: form.cirurgia_plastica === v ? '#7B1E1E' : '#374151' }}>
                <Radio16 active={form.cirurgia_plastica === v} />{l}
              </div>
            ))}
          </div>

          {/* 10 */}
          <label style={lbl()}>10. Projeto de vida</label>
          <div style={{ display:'flex', gap:'0.4rem', marginBottom:'0.6rem', flexWrap:'wrap' }}>
            {[['MANTER','MANTER O PESO'],['PERDER','PERDER kg'],['GANHAR','GANHAR kg']].map(([v,l]) => (
              <div key={v} onClick={() => sf('meta_peso', form.meta_peso === v ? '' : v)} style={{ flex:1, minWidth:90, display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.5rem 0.6rem', borderRadius:8, border:`1.5px solid ${form.meta_peso === v ? '#DC2626' : '#E5E7EB'}`, background: form.meta_peso === v ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', fontSize:'0.78rem', fontWeight: form.meta_peso === v ? 700 : 500, color: form.meta_peso === v ? '#7B1E1E' : '#374151' }}>
                <Radio16 active={form.meta_peso === v} />{l}
              </div>
            ))}
          </div>
          {(form.meta_peso === 'PERDER' || form.meta_peso === 'GANHAR') && (
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.6rem' }}>
              <input style={{ ...inp, width:120 }} type="number" placeholder="Quantos kg?" value={form.meta_kg} onChange={e => sf('meta_kg', e.target.value)} />
              <span style={{ fontSize:'0.85rem', color:'#6B7280' }}>kg</span>
            </div>
          )}
          {PROJETOS.map(p => <CheckRow key={p} label={p} checked={form.projetos_vida.includes(p)} onClick={() => sf('projetos_vida', tog(form.projetos_vida, p))} />)}

          {/* 11 */}
          <label style={lbl()}>11. Compulsões</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {COMPULSOES.map(c => <CheckRow key={c} label={c} checked={form.compulsoes.includes(c)} onClick={() => sf('compulsoes', tog(form.compulsoes, c))} />)}
          </div>

          {/* 12 */}
          <label style={lbl()}>12. Medicamentos em uso</label>
          {MEDICAMENTOS.map(m => <CheckRow key={m} label={m} checked={form.medicamentos.includes(m)} onClick={() => sf('medicamentos', tog(form.medicamentos, m))} />)}

          {/* 13 */}
          <label style={lbl()}>13. Medicamentos emagrecedores</label>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.6rem' }}>Para cada medicamento, marque a situação:</p>
          {EMAGRECEDORES.map(med => (
            <div key={med} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'0.5rem', alignItems:'center', marginBottom:'0.5rem' }}>
              <span style={{ fontSize:'0.85rem', fontWeight:600, color:'#374151' }}>{med}</span>
              <div style={{ display:'flex', gap:'0.3rem' }}>
                {['JÁ USEI','NUNCA USEI','ESTOU USANDO'].map(op => (
                  <button key={op} onClick={() => sf('emagrecedores', { ...form.emagrecedores, [med]: form.emagrecedores[med] === op ? null : op })}
                    style={{ padding:'0.25rem 0.45rem', fontSize:'0.68rem', fontWeight:700, borderRadius:6, border:`1.5px solid ${form.emagrecedores[med] === op ? '#DC2626' : '#E5E7EB'}`, background: form.emagrecedores[med] === op ? '#FEF2F2' : '#FAFAFA', color: form.emagrecedores[med] === op ? '#7B1E1E' : '#6B7280', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit' }}>
                    {op}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {erro && <p style={{ color:'#DC2626', fontSize:'0.85rem', marginTop:'0.8rem' }}>{erro}</p>}
          <button style={btnPrimary} onClick={salvarAnamnese} disabled={loading}>{loading ? 'Salvando...' : 'Avançar para os Exames →'}</button>
          <button style={btnSecondary} onClick={onFechar}>Agora não</button>
        </div>
      </div>
    </div>
  )
}
