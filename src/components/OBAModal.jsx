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

const ESPECIALISTAS = [
  'CIRURGIÃO',
  'CLÍNICO',
  'HEMATOLOGISTA',
  'GASTROENTEROLOGISTA',
  'NUTRÓLOGO',
  'ENDOCRINOLOGISTA',
  'CARDIOLOGISTA',
  'NEUROLOGISTA',
  'PSIQUIATRA',
  'OUTRO',
]

const STATUS_GLICEMICO_OPS = [
  'NÃO ERA E NÃO SOU DIABÉTICO',
  'ERA DIABÉTICO E FUI CURADO',
  'ERA DIABÉTICO E CONTINUO DIABÉTICO',
  'NÃO ERA, MAS FIQUEI DIABÉTICO APÓS A CIRURGIA',
  'APRESENTO EPISÓDIOS DE DUMPING',
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
  'ANTICOAGULANTE',
  'ANTIDEPRESSIVO', 'REMÉDIO PARA DORMIR', 'LAXANTES', 'REMÉDIO PARA PRESSÃO',
  'REMÉDIO PARA DORES', 'REMÉDIO PARA BAIXAR A GLICEMIA', 'REMÉDIO PARA COLESTEROL', 'REMÉDIO PARA TRIGLICÉRIDES',
  'TOPIRAMATO', 'FENTERMINA', 'NALTREXONA', 'BUPROPIONA', 'ORLISTAT (XENICAL)',
  'DOMPERIDONA (MOTILIUM)', 'BROMOPRIDA',
]

const EMAGRECEDORES = ['Ozempic', 'Rybelsus', 'Wegovy', 'Mounjaro', 'Saxenda', 'Victoza', 'Trulicity', 'Xultophi']

const STATUS_INTESTINAL_OPS = [
  'INTESTINO FUNCIONA BEM',
  'OBSTIPAÇÃO CRÔNICA (PRISÃO DE VENTRE)',
  'INTESTINO IRRITÁVEL (DIARREIA FREQUENTE)',
]

const STATUS_FIBROMIALGIA_OPS = [
  'FUI DIAGNOSTICADO COM FIBROMIALGIA',
  'DORES NO CORPO',
  'DOR DE CABEÇA / ENXAQUECAS',
  'INSÔNIA',
  'PROBLEMAS DE MEMÓRIA',
  'DIFICULDADE DE CONCENTRAÇÃO',
  'DEPRESSÃO OU MELANCOLIA',
  'ZUMBIDOS',
  'DESEQUILÍBRIO',
  'VARIAÇÃO DO HUMOR',
  'SINTO FRIO OU CALOR EXCESSIVO',
]

const EXAMES_BASE = [
  { key: 'leucocitos',     label: 'Leucócitos (Total)',       unit: '/uL',    ref: '4.000–11.000', hint: 'Sem ponto ou vírgula. Ex: 7500' },
  { key: 'neutrofilos',    label: 'Neutrófilos Segmentados',  unit: '%',      ref: '40–70%' },
  { key: 'neutrofilos_ul', label: 'Neutrófilos (calculado)',  unit: '/uL',    ref: '1.800–7.700', readOnly: true },
  { key: 'plaquetas',      label: 'Plaquetas',                unit: 'x1000/µL', ref: '150–400', hint: 'Ex: 250 = 250.000/µL' },
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
]

// ── Componentes reutilizáveis ──────────────────────────────────────────────
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

function SectionTitle({ children }) {
  return <div style={{ background:'#F1F5F9', borderLeft:'3px solid #DC2626', padding:'0.5rem 0.8rem', borderRadius:'0 8px 8px 0', marginTop:'1.5rem', marginBottom:'0.6rem' }}>
    <span style={{ fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#1E293B' }}>{children}</span>
  </div>
}

function calcDias(dataStr) {
  if (!dataStr) return null
  const d = new Date(dataStr)
  if (isNaN(d)) return null
  const diff = Math.floor((new Date() - d) / 86400000)
  return diff >= 0 ? diff : null
}

const inp = { width:'100%', border:'1.5px solid #E5E7EB', borderRadius:8, padding:'0.65rem 0.9rem', fontSize:'0.92rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const btnP = { width:'100%', background:'#7B1E1E', color:'white', border:'none', borderRadius:10, padding:'0.9rem', fontSize:'1rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginTop:'1.5rem' }
const btnS = { width:'100%', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:10, padding:'0.7rem', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginTop:'0.5rem' }
const OV = { position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'1.5rem 1rem', boxSizing:'border-box' }
const CD = { background:'white', borderRadius:20, width:'100%', maxWidth:800, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', marginBottom:'2rem', boxSizing:'border-box' }
const HD = { background:'linear-gradient(135deg, #7B1E1E, #DC2626)', padding:'1.5rem', borderRadius:'20px 20px 0 0', display:'flex', alignItems:'center', gap:'1rem' }

// ─────────────────────────────────────────────────────────────────────────────
// PROPS:
//   sexo, cpf, idade  — dados do paciente já preenchidos na calculadora
//   onConcluir(dadosOBA, examesOBA) — callback com os dados para o obaEngine
//   onFechar()        — fecha sem salvar
// ─────────────────────────────────────────────────────────────────────────────
export default function OBAModal({ sexo, cpf, idade, examesRedFairy, onConcluir, onFechar }) {
  const [etapa, setEtapa] = useState('anamnese')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // Dados da anamnese já salvos (passados para etapa 2)
  const [anamneseSalva, setAnamneseSalva] = useState(null)

  const saudacao = sexo === 'F' ? 'Bem-vinda' : 'Bem-vindo'
  const isFem = sexo === 'F'
  const idadeNum = parseInt(idade) || 0

  const examesExtras = idadeNum >= 40 ? (isFem ? EXAMES_MULHER_40 : EXAMES_HOMEM_40) : []
  const todosExames = [...EXAMES_BASE, ...examesExtras]

  const [form, setForm] = useState({
    cirurgia_dia: '', cirurgia_mes: '', cirurgia_ano: '',
    peso_antes: '', peso_minimo_pos: '', peso_atual: '',
    ganhou_peso_apos: false, fez_plasma_argonio: false,
    metformina: false, ibp: false, tiroxina: false, methotrexato: false, hivTratamento: false,
    status_intestinal: '', status_fibromialgia: [],
    tipo_cirurgia: '',
    acompanhamento: '', especialistas: [],
    status_gestacional: '', semanas_gestacao: '',
    status_glicemico: '', status_pressorico: '',
    trombose: null, investigou_trombose: false,
    usou_anticoagulante: false, usa_anticoagulante: false,
    varizes: null, varizes_grau: '',
    varizes_esofago: false, operou_varizes_esofago: false,
    status_dental: '', status_osseo: '',
    teve_covid: false, vacina_covid: [],
    atividade_fisica: [], cirurgia_plastica: null,
    meta_peso: '', meta_kg: '', projetos_vida: [],
    compulsoes: [], medicamentos: [], emagrecedores: {},
  })

  const [dataExames, setDataExames] = useState('')
  const diasExames = calcDias(dataExames)
  const [exames, setExames] = useState(Object.fromEntries(todosExames.map(e => [e.key, ''])))

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
  }

  const sf = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const tog = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

  function calcMesesPos() {
    const ano = parseInt(form.cirurgia_ano)
    if (!ano || ano < 1990 || ano > new Date().getFullYear()) return null
    const hoje = new Date()
    const mes = parseInt(form.cirurgia_mes) || 1
    const dia = parseInt(form.cirurgia_dia) || 1
    const dataC = new Date(ano, mes - 1, dia)
    if (isNaN(dataC) || dataC > hoje) return null
    const meses = (hoje.getFullYear() - dataC.getFullYear()) * 12 + (hoje.getMonth() - dataC.getMonth())
    if (!parseInt(form.cirurgia_mes)) return Math.floor(meses / 12) * 12
    return meses > 0 ? meses : 0
  }
  const mesesPos = calcMesesPos()

  const pesoAntes = parseFloat(form.peso_antes)
  const pesoMin   = parseFloat(form.peso_minimo_pos)
  const pesoAtual = parseFloat(form.peso_atual)
  const kgPerdidos = (!isNaN(pesoAntes) && !isNaN(pesoAtual) && pesoAntes > pesoAtual) ? pesoAntes - pesoAtual : null
  const kgGanhou   = (!isNaN(pesoMin) && !isNaN(pesoAtual) && pesoAtual > pesoMin) ? pesoAtual - pesoMin : null

  function toggleAtividade(val) {
    if (val === 'SEDENTÁRIO') sf('atividade_fisica', form.atividade_fisica.includes('SEDENTÁRIO') ? [] : ['SEDENTÁRIO'])
    else if (!form.atividade_fisica.includes('SEDENTÁRIO')) sf('atividade_fisica', tog(form.atividade_fisica, val))
  }

  // ── Monta objeto dadosOBA para o obaEngine ────────────────────────────────
  function buildDadosOBA() {
    return {
      sexo,
      idade: idadeNum,
      tipo_cirurgia:      form.tipo_cirurgia || 'NÃO SEI',
      meses_pos_cirurgia: mesesPos || 0,
      peso_antes:         pesoAntes || null,
      peso_atual:         pesoAtual || null,
      peso_minimo_pos:    pesoMin || null,
      ganhou_peso_apos:   (kgGanhou !== null && kgGanhou > 0) ? true : form.ganhou_peso_apos,
      fez_plasma_argonio: form.fez_plasma_argonio,
      status_glicemico:   form.status_glicemico || null,
      status_pressorico:  form.status_pressorico || null,
      status_osseo:       form.status_osseo || null,
      status_dental:      form.status_dental || null,
      status_gestacional: form.status_gestacional || null,
      semanas_gestacao:   form.semanas_gestacao ? parseFloat(form.semanas_gestacao) : null,
      compulsoes:         form.compulsoes,
      medicamentos:       form.medicamentos,
      atividade_fisica:   form.atividade_fisica,
      emagrecedores:      form.emagrecedores,
      trombose:           form.trombose,
      investigou_trombose: form.investigou_trombose,
      usa_anticoagulante: form.usa_anticoagulante,
      usou_anticoagulante: form.usou_anticoagulante,
      varizes:            form.varizes,
      varizes_grau:       form.varizes_grau || null,
      varizes_esofago:    form.varizes_esofago,
      operou_varizes_esofago: form.operou_varizes_esofago,
      meta_peso:          form.meta_peso || null,
      meta_kg:            form.meta_kg ? parseFloat(form.meta_kg) : null,
      projetos_vida:      form.projetos_vida,
      status_intestinal:  form.status_intestinal || null,
      status_fibromialgia: form.status_fibromialgia,
      metformina:         form.metformina,
      ibp:                form.ibp,
      tiroxina:           form.tiroxina,
      methotrexato:       form.methotrexato,
      hivTratamento:      form.hivTratamento,
    }
  }

  // ── Monta objeto examesOBA para o obaEngine ───────────────────────────────
  function buildExamesOBA() {
    return Object.fromEntries(
      todosExames.map(e => [e.key, exames[e.key] ? parseFloat(exames[e.key]) : null])
    )
  }

  // ── Salvar anamnese e avançar para exames ─────────────────────────────────
  async function salvarAnamnese() {
    setErro('')
    if (!form.cirurgia_ano || !calcMesesPos()) {
      setErro('Informe pelo menos o ANO da cirurgia.'); return
    }
    if (!form.tipo_cirurgia) {
      setErro('Selecione o tipo de cirurgia.'); return
    }
    if (!form.acompanhamento) {
      setErro('Selecione a opção de acompanhamento.'); return
    }
    setLoading(true)

    const projetos = [
      form.meta_peso === 'MANTER' ? 'QUERO MANTER O PESO ATUAL' :
      form.meta_peso === 'PERDER' ? `QUERO PERDER ${form.meta_kg} kg` :
      form.meta_peso === 'GANHAR' ? `QUERO GANHAR ${form.meta_kg} kg` : null,
      ...form.projetos_vida
    ].filter(Boolean)

    const dadosAnamnese = {
      cpf: cpf || null, sexo,
      cirurgia_dia: form.cirurgia_dia ? parseInt(form.cirurgia_dia) : null,
      cirurgia_mes: form.cirurgia_mes ? parseInt(form.cirurgia_mes) : null,
      cirurgia_ano: form.cirurgia_ano ? parseInt(form.cirurgia_ano) : null,
      meses_pos_cirurgia: mesesPos,
      tipo_cirurgia: form.tipo_cirurgia,
      peso_antes: pesoAntes || null,
      peso_minimo_pos: pesoMin || null,
      peso_atual: pesoAtual || null,
      kg_perdidos: kgPerdidos || null,
      ganhou_peso_apos: form.ganhou_peso_apos,
      fez_plasma_argonio: form.fez_plasma_argonio,
      acompanhamento: form.acompanhamento,
      especialistas: form.especialistas,
      status_gestacional: form.status_gestacional || null,
      semanas_gestacao: form.semanas_gestacao ? parseFloat(form.semanas_gestacao) : null,
      status_glicemico: form.status_glicemico || null,
      status_pressorico: form.status_pressorico || null,
      trombose: form.trombose,
      investigou_trombose: form.trombose ? form.investigou_trombose : null,
      usou_anticoagulante: form.trombose ? form.usou_anticoagulante : null,
      usa_anticoagulante: form.trombose ? form.usa_anticoagulante : null,
      varizes: form.varizes,
      varizes_grau: form.varizes ? form.varizes_grau : null,
      varizes_esofago: form.varizes_esofago,
      operou_varizes_esofago: form.operou_varizes_esofago,
      status_dental: form.status_dental || null,
      status_osseo: form.status_osseo || null,
      teve_covid: form.teve_covid,
      vacina_covid: form.vacina_covid,
      atividade_fisica: form.atividade_fisica,
      cirurgia_plastica: form.cirurgia_plastica,
      projetos_vida: projetos,
      compulsoes: form.compulsoes,
      medicamentos: form.medicamentos,
      emagrecedores: Object.keys(form.emagrecedores).length ? form.emagrecedores : null,
    }

    await supabase.from('oba_anamnese').insert(dadosAnamnese)
    setLoading(false)
    setAnamneseSalva(dadosAnamnese)
    setEtapa('exames')
  }

  // ── Salvar exames e chamar onConcluir com TUDO ────────────────────────────
  async function salvarExames() {
    setLoading(true)
    const examesObj = buildExamesOBA()

    // Atualiza o registro mais recente com os exames (pelo CPF)
    if (cpf) {
      const cpfLimpo = cpf.replace(/\D/g, '')
      const { data: rows } = await supabase
        .from('oba_anamnese')
        .select('id')
        .eq('cpf', cpfLimpo)
        .order('created_at', { ascending: false })
        .limit(1)

      if (rows && rows.length > 0) {
        await supabase.from('oba_anamnese').update({
          data_exames: dataExames || null,
          dias_exames: diasExames,
          ...Object.fromEntries(todosExames.map(e => [e.key, examesObj[e.key] !== undefined ? examesObj[e.key] : null]))
        }).eq('id', rows[0].id)
      }
    }

    setLoading(false)
    // Entrega os dados diretamente para o Calculator, sem nova busca no Supabase
    onConcluir(buildDadosOBA(), examesObj)
  }

  // ── Pular exames — entrega só a anamnese ─────────────────────────────────
  function pularExames() {
    onConcluir(buildDadosOBA(), {})
  }

  // ── HEADER ───────────────────────────────────────────────────────────────
  const Header = ({ sub }) => (
    <div style={HD}>
      <img src={logo} alt="OBA" style={{ width:48, height:48, objectFit:'contain', filter:'brightness(10)' }} />
      <div>
        <h2 style={{ color:'white', fontSize:'1.3rem', fontWeight:800, margin:0 }}>{saudacao} ao Projeto OBA!</h2>
        <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px', marginTop:'0.2rem' }}>{sub}</p>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // ETAPA 2: EXAMES
  // ════════════════════════════════════════════════════════════════════════════
  if (etapa === 'exames') return (
    <div style={OV} onClick={pularExames}>
      <div style={CD} onClick={e => e.stopPropagation()}>
        <Header sub="Exames Complementares — etapa final" />
        <div style={{ padding:'1.5rem', boxSizing:'border-box', width:'100%', overflowX:'hidden' }}>

          <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
            <p style={{ fontSize:'0.8rem', fontWeight:700, color:'#166534', margin:0 }}>
              ✓ Anamnese salva com sucesso!
            </p>
            <p style={{ fontSize:'0.75rem', color:'#15803D', marginTop:'0.3rem' }}>
              Preencha os exames que tiver em mãos. Pode pular se não tiver agora.
            </p>
          </div>

          {/* ── Exames já registrados no RedFairy — somente leitura ── */}
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
                  { label:'Data da coleta', value: examesRedFairy.dataColeta
    ? examesRedFairy.dataColeta.split('-').reverse().join('/')
    : null, unit:'' },
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
          <input style={inp} type="date" value={dataExames} onChange={e => setDataExames(e.target.value)} />
          {diasExames !== null && (
            <div style={{ background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:8, padding:'0.5rem 0.9rem', marginTop:'0.4rem', marginBottom:'0.8rem' }}>
              <p style={{ color:'#0369A1', fontSize:'0.85rem', fontWeight:700 }}>
                {diasExames === 0 ? 'Exames de hoje' : `Realizados há ${diasExames} dia${diasExames > 1 ? 's' : ''}`}
              </p>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
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
          </div>

          {idadeNum >= 40 && (
            <div style={{ background:'#FEF9EC', border:'1px solid #FDE68A', borderRadius:8, padding:'0.5rem 0.9rem', margin:'0.5rem 0' }}>
              <p style={{ color:'#92400E', fontSize:'0.78rem', fontWeight:700 }}>
                {isFem ? '+ CEA e Estradiol (mulher ≥ 40 anos)' : '+ PSA Total, CA 19-9 e CEA (homem ≥ 40 anos)'}
              </p>
            </div>
          )}

          <button style={btnP} onClick={salvarExames} disabled={loading}>
            {loading ? 'Salvando...' : 'Concluir e ir para a Avaliação →'}
          </button>
          <button style={btnS} onClick={pularExames}>
            Pular exames e ir para a Avaliação
          </button>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // ETAPA 1: ANAMNESE
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={OV} onClick={onFechar}>
      <div style={CD} onClick={e => e.stopPropagation()}>
        <Header sub="Otimizar o Bariátrico" />
        <div style={{ padding:'1.5rem', boxSizing:'border-box', width:'100%', overflowX:'hidden' }}>

          <div style={{ background:'#FEF2F2', border:'1px solid #FECDD3', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
            <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', fontWeight:700, marginBottom:'0.3rem' }}>O bariátrico é um paciente complexo.</p>
            <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'#9B2C2C' }}>Precisamos de mais informações para cuidar de você. Marque as caixinhas e preencha os campos:</p>
          </div>

          {/* ── DADOS DA CIRURGIA ── */}
          <SectionTitle>Dados da Cirurgia</SectionTitle>

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>
            Data da cirurgia <span style={{ color:'#DC2626' }}>*</span>
            <span style={{ color:'#9CA3AF', fontWeight:400, marginLeft:'0.4rem' }}>(ANO obrigatório — DIA e MÊS opcionais)</span>
          </label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.5fr', gap:'0.5rem', marginBottom:'0.4rem' }}>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#9CA3AF', fontWeight:600 }}>DIA (opcional)</label>
              <input style={inp} type="number" min="1" max="31" placeholder="DD" value={form.cirurgia_dia} onChange={e => sf('cirurgia_dia', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#9CA3AF', fontWeight:600 }}>MÊS (opcional)</label>
              <input style={inp} type="number" min="1" max="12" placeholder="MM" value={form.cirurgia_mes} onChange={e => sf('cirurgia_mes', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#DC2626', fontWeight:700 }}>ANO ✱</label>
              <input style={{ ...inp, borderColor: form.cirurgia_ano ? '#E5E7EB' : '#FCA5A5' }} type="number" min="2000" max="2030" placeholder="AAAA" value={form.cirurgia_ano} onChange={e => sf('cirurgia_ano', e.target.value)} />
            </div>
          </div>
          {mesesPos !== null ? (
            <div style={{ background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:8, padding:'0.6rem 0.9rem', marginBottom:'0.5rem' }}>
              <p style={{ color:'#0369A1', fontSize:'0.9rem', fontWeight:800, margin:0 }}>
                ✓ {mesesPos} meses pós-cirurgia
                {mesesPos >= 12 && <span style={{ fontWeight:400, fontSize:'0.8rem', marginLeft:'0.4rem', color:'#0284C7' }}>
                  ({Math.floor(mesesPos/12)} ano{Math.floor(mesesPos/12) > 1 ? 's' : ''}{mesesPos % 12 > 0 ? ` e ${mesesPos % 12} meses` : ''})
                </span>}
                {!parseInt(form.cirurgia_mes) && <span style={{ fontSize:'0.75rem', color:'#64748B', marginLeft:'0.4rem' }}>(estimado)</span>}
              </p>
            </div>
          ) : form.cirurgia_ano ? (
            <div style={{ background:'#FEF2F2', border:'1px solid #FECDD3', borderRadius:8, padding:'0.5rem 0.9rem', marginBottom:'0.5rem' }}>
              <p style={{ color:'#DC2626', fontSize:'0.82rem', fontWeight:600, margin:0 }}>Verifique o ano informado.</p>
            </div>
          ) : null}

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Tipo de cirurgia</label>
          <RadioGroup options={TIPOS_CIRURGIA} value={form.tipo_cirurgia} onChange={v => sf('tipo_cirurgia', v)} />

          {/* ── STATUS PONDERAL ── */}
          <SectionTitle>Status Ponderal</SectionTitle>

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>Peso antes da cirurgia (kg)</label>
          <input style={inp} type="number" placeholder="Ex: 120" value={form.peso_antes} onChange={e => sf('peso_antes', e.target.value)} />

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Menor peso após a cirurgia (kg)</label>
          <input style={inp} type="number" placeholder="Ex: 72" value={form.peso_minimo_pos} onChange={e => sf('peso_minimo_pos', e.target.value)} />

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Peso atual (kg)</label>
          <input style={inp} type="number" placeholder="Ex: 78" value={form.peso_atual} onChange={e => sf('peso_atual', e.target.value)} />

          {kgPerdidos !== null && kgPerdidos > 0 && (
            <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'0.5rem 0.9rem', marginTop:'0.5rem' }}>
              <p style={{ color:'#166534', fontSize:'0.85rem', fontWeight:700 }}>✓ Perdeu {kgPerdidos.toFixed(1)} kg do peso inicial</p>
            </div>
          )}
          {kgGanhou !== null && kgGanhou > 0 && (
            <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:8, padding:'0.5rem 0.9rem', marginTop:'0.5rem' }}>
              <p style={{ color:'#92400E', fontSize:'0.85rem', fontWeight:700 }}>⚠ Ganhou {kgGanhou.toFixed(1)} kg desde o menor peso</p>
            </div>
          )}

          <div style={{ marginTop:'0.8rem' }}>
            {!(kgGanhou !== null && kgGanhou > 0) && (
              <CheckRow label="PERDI MAS GANHEI PESO NOVAMENTE" checked={form.ganhou_peso_apos} onClick={() => sf('ganhou_peso_apos', !form.ganhou_peso_apos)} />
            )}
            <CheckRow label="FIZ PLASMA DE ARGÔNIO" checked={form.fez_plasma_argonio} onClick={() => sf('fez_plasma_argonio', !form.fez_plasma_argonio)} />
          </div>

          {/* ── ACOMPANHAMENTO ── */}
          <SectionTitle>Acompanhamento Médico</SectionTitle>
          <RadioGroup options={ACOMPANHAMENTO_OPS} value={form.acompanhamento} onChange={v => sf('acompanhamento', v)} />

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Especialistas que me acompanham:</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {ESPECIALISTAS.map(e => <CheckRow key={e} label={e} checked={form.especialistas.includes(e)} onClick={() => sf('especialistas', tog(form.especialistas, e))} />)}
          </div>

          {/* ── STATUS GESTACIONAL ── */}
          {isFem && idadeNum >= 15 && (
            <>
              <SectionTitle>Status Gestacional</SectionTitle>
              <CheckRow label="ESTOU GRÁVIDA" checked={form.status_gestacional === 'GRÁVIDA'} onClick={() => sf('status_gestacional', form.status_gestacional === 'GRÁVIDA' ? '' : 'GRÁVIDA')} />
              {form.status_gestacional === 'GRÁVIDA' && (
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.4rem' }}>
                  <input style={{ ...inp, width:120 }} type="number" placeholder="Semanas" value={form.semanas_gestacao} onChange={e => sf('semanas_gestacao', e.target.value)} />
                  <span style={{ fontSize:'0.85rem', color:'#6B7280' }}>semanas de gestação</span>
                </div>
              )}
            </>
          )}

          {/* ── STATUS GLICÊMICO ── */}
          <SectionTitle>Status Glicêmico</SectionTitle>
          <RadioGroup options={STATUS_GLICEMICO_OPS} value={form.status_glicemico} onChange={v => sf('status_glicemico', v)} />

          {/* ── STATUS PRESSÓRICO ── */}
          <SectionTitle>Status Pressórico</SectionTitle>
          <RadioGroup options={STATUS_PRESSORICO_OPS} value={form.status_pressorico} onChange={v => sf('status_pressorico', v)} />

          {/* ── STATUS VASCULAR ── */}
          <SectionTitle>Status Vascular</SectionTitle>

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>Trombose</label>
          <div style={{ display:'flex', gap:'0.8rem', marginBottom:'0.6rem' }}>
            {[['Sim', true], ['Não', false]].map(([l, v]) => (
              <div key={l} onClick={() => sf('trombose', v)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'0.5rem', borderRadius:8, border:`1.5px solid ${form.trombose === v ? '#DC2626' : '#E5E7EB'}`, background: form.trombose === v ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', fontWeight: form.trombose === v ? 700 : 500, color: form.trombose === v ? '#7B1E1E' : '#374151', fontSize:'0.85rem' }}>
                <Radio16 active={form.trombose === v} />{l}
              </div>
            ))}
          </div>
          {form.trombose && (
            <>
              <CheckRow label="INVESTIGUEI AS CAUSAS DA TROMBOSE" checked={form.investigou_trombose} onClick={() => sf('investigou_trombose', !form.investigou_trombose)} />
              <CheckRow label="USEI ANTICOAGULANTE" checked={form.usou_anticoagulante} onClick={() => sf('usou_anticoagulante', !form.usou_anticoagulante)} />
              <CheckRow label="USO ANTICOAGULANTE ATUALMENTE" checked={form.usa_anticoagulante} onClick={() => sf('usa_anticoagulante', !form.usa_anticoagulante)} />
            </>
          )}

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Varizes</label>
          <div style={{ display:'flex', gap:'0.8rem', marginBottom:'0.6rem' }}>
            {[['Sim', true], ['Não', false]].map(([l, v]) => (
              <div key={l} onClick={() => sf('varizes', v)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'0.5rem', borderRadius:8, border:`1.5px solid ${form.varizes === v ? '#DC2626' : '#E5E7EB'}`, background: form.varizes === v ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', fontWeight: form.varizes === v ? 700 : 500, color: form.varizes === v ? '#7B1E1E' : '#374151', fontSize:'0.85rem' }}>
                <Radio16 active={form.varizes === v} />{l}
              </div>
            ))}
          </div>
          {form.varizes && (
            <div style={{ display:'flex', gap:'0.3rem', marginBottom:'0.6rem' }}>
              {['LEVE', 'MODERADA', 'SEVERA'].map(g => (
                <div key={g} onClick={() => sf('varizes_grau', g)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', padding:'0.5rem', borderRadius:8, border:`1.5px solid ${form.varizes_grau === g ? '#DC2626' : '#E5E7EB'}`, background: form.varizes_grau === g ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', fontWeight: form.varizes_grau === g ? 700 : 500, color: form.varizes_grau === g ? '#7B1E1E' : '#374151', fontSize:'0.82rem' }}>
                  <Radio16 active={form.varizes_grau === g} />{g}
                </div>
              ))}
            </div>
          )}
          <CheckRow label="TENHO VARIZES DE ESÔFAGO" checked={form.varizes_esofago} onClick={() => sf('varizes_esofago', !form.varizes_esofago)} />
          {form.varizes_esofago && (
            <CheckRow label="OPEREI VARIZES DE ESÔFAGO" checked={form.operou_varizes_esofago} onClick={() => sf('operou_varizes_esofago', !form.operou_varizes_esofago)} />
          )}

          {/* ── STATUS DENTAL ── */}
          <SectionTitle>Status Dental</SectionTitle>
          {['BOA SAÚDE ORAL, DENTIÇÃO OK.', 'PRECISO TRATAMENTO ODONTOLÓGICO', 'PERDI MAIS DE UM DENTE APÓS A CIRURGIA'].map(op => (
            <div key={op} onClick={() => sf('status_dental', form.status_dental === op ? '' : op)} style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem', borderRadius:8, border:`1.5px solid ${form.status_dental === op ? '#DC2626' : '#E5E7EB'}`, background: form.status_dental === op ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', marginBottom:'0.4rem', fontSize:'0.85rem', fontWeight: form.status_dental === op ? 700 : 500, color: form.status_dental === op ? '#7B1E1E' : '#374151' }}>
              <Radio16 active={form.status_dental === op} />{op}
            </div>
          ))}

          {/* ── STATUS ÓSSEO ── */}
          <SectionTitle>Status Ósseo</SectionTitle>
          {['DENSITOMETRIA ÓSSEA NORMAL', 'OSTEOPENIA', 'OSTEOPOROSE', 'NÃO FIZ DENSITOMETRIA'].map(op => (
            <div key={op} onClick={() => sf('status_osseo', form.status_osseo === op ? '' : op)} style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem', borderRadius:8, border:`1.5px solid ${form.status_osseo === op ? '#DC2626' : '#E5E7EB'}`, background: form.status_osseo === op ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', marginBottom:'0.4rem', fontSize:'0.85rem', fontWeight: form.status_osseo === op ? 700 : 500, color: form.status_osseo === op ? '#7B1E1E' : '#374151' }}>
              <Radio16 active={form.status_osseo === op} />{op}
            </div>
          ))}

          {/* ── STATUS INTESTINAL ── */}
          <SectionTitle>Status Intestinal</SectionTitle>
          <RadioGroup options={STATUS_INTESTINAL_OPS} value={form.status_intestinal} onChange={v => sf('status_intestinal', form.status_intestinal === v ? '' : v)} />

          {/* ── STATUS FIBROMIÁLGICO ── */}
          <SectionTitle>Status Fibromiálgico</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.5rem' }}>Marque os sintomas que apresenta com frequência:</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_FIBROMIALGIA_OPS.map(op => (
              <CheckRow key={op} label={op}
                checked={form.status_fibromialgia.includes(op)}
                onClick={() => sf('status_fibromialgia', tog(form.status_fibromialgia, op))} />
            ))}
          </div>

          {/* ── STATUS COVID ── */}
          <SectionTitle>Status COVID-19</SectionTitle>
          <CheckRow label="TIVE COVID-19" checked={form.teve_covid} onClick={() => sf('teve_covid', !form.teve_covid)} />
          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.6rem' }}>Vacina:</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {['VACINA PFIZER', 'VACINA JANSSEN', 'VACINA ASTRAZENECA', 'VACINA CORONAVAC', 'NÃO TOMEI VACINA'].map(v => (
              <CheckRow key={v} label={v}
                checked={form.vacina_covid.includes(v)}
                disabled={v !== 'NÃO TOMEI VACINA' && form.vacina_covid.includes('NÃO TOMEI VACINA') || v === 'NÃO TOMEI VACINA' && form.vacina_covid.length > 0 && !form.vacina_covid.includes('NÃO TOMEI VACINA')}
                onClick={() => sf('vacina_covid', tog(form.vacina_covid, v))} />
            ))}
          </div>

          {/* ── ATIVIDADE FÍSICA ── */}
          <SectionTitle>Atividade Física</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.5rem' }}>Se marcar SEDENTÁRIO, os demais são desmarcados.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {ATIVIDADES.map(at => {
              const sedMarcado = form.atividade_fisica.includes('SEDENTÁRIO')
              const disabled = at !== 'SEDENTÁRIO' && sedMarcado
              return <CheckRow key={at} label={at} checked={form.atividade_fisica.includes(at)} disabled={disabled} onClick={() => toggleAtividade(at)} />
            })}
          </div>

          {/* ── CIRURGIA PLÁSTICA ── */}
          <SectionTitle>Cirurgia Plástica Pós-Bariátrica</SectionTitle>
          <div style={{ display:'flex', gap:'0.8rem' }}>
            {[['Sim', true], ['Não', false]].map(([l, v]) => (
              <div key={l} onClick={() => sf('cirurgia_plastica', v)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'0.5rem', borderRadius:8, border:`1.5px solid ${form.cirurgia_plastica === v ? '#DC2626' : '#E5E7EB'}`, background: form.cirurgia_plastica === v ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', fontWeight: form.cirurgia_plastica === v ? 700 : 500, color: form.cirurgia_plastica === v ? '#7B1E1E' : '#374151', fontSize:'0.85rem' }}>
                <Radio16 active={form.cirurgia_plastica === v} />{l}
              </div>
            ))}
          </div>

          {/* ── PROJETO DE VIDA ── */}
          <SectionTitle>Projeto de Vida</SectionTitle>
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
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {PROJETOS.map(p => <CheckRow key={p} label={p} checked={form.projetos_vida.includes(p)} onClick={() => sf('projetos_vida', tog(form.projetos_vida, p))} />)}
          </div>

          {/* ── COMPULSÕES ── */}
          <SectionTitle>Compulsões</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {COMPULSOES.map(c => <CheckRow key={c} label={c} checked={form.compulsoes.includes(c)} onClick={() => sf('compulsoes', tog(form.compulsoes, c))} />)}
          </div>

          {/* ── MEDICAMENTOS ── */}
          <SectionTitle>Medicamentos em Uso</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {MEDICAMENTOS.map(m => <CheckRow key={m} label={m} checked={form.medicamentos.includes(m)} onClick={() => sf('medicamentos', tog(form.medicamentos, m))} />)}
          </div>

          {/* ── MEDICAMENTOS ADICIONAIS ── */}
          <SectionTitle>Medicamentos que Afetam o Eritron</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.6rem' }}>Marque os que usa ou usou nos últimos 2 anos:</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
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
          </div>

          {/* ── EMAGRECEDORES ── */}
          <SectionTitle>Medicamentos Emagrecedores</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.6rem' }}>Para cada medicamento, marque a situação:</p>
          {EMAGRECEDORES.map(med => (
            <div key={med} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'0.5rem', alignItems:'center', marginBottom:'0.5rem', padding:'0.3rem 0', borderBottom:'1px solid #F3F4F6' }}>
              <span style={{ fontSize:'0.85rem', fontWeight:600, color:'#374151' }}>{med}</span>
              <div style={{ display:'flex', gap:'0.3rem' }}>
                {['JÁ USEI','ESTOU USANDO'].map(op => (
                  <button key={op} onClick={() => sf('emagrecedores', { ...form.emagrecedores, [med]: form.emagrecedores[med] === op ? null : op })}
                    style={{ padding:'0.25rem 0.45rem', fontSize:'0.68rem', fontWeight:700, borderRadius:6, border:`1.5px solid ${form.emagrecedores[med] === op ? '#DC2626' : '#E5E7EB'}`, background: form.emagrecedores[med] === op ? '#FEF2F2' : '#FAFAFA', color: form.emagrecedores[med] === op ? '#7B1E1E' : '#6B7280', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit' }}>
                    {op}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {erro && <p style={{ color:'#DC2626', fontSize:'0.85rem', marginTop:'0.8rem' }}>{erro}</p>}

          <button style={btnP} onClick={salvarAnamnese} disabled={loading}>
            {loading ? 'Salvando...' : 'Avançar para os Exames →'}
          </button>
          <button style={btnS} onClick={onFechar}>← Voltar</button>
        </div>
      </div>
    </div>
  )
}
