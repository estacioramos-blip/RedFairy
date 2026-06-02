import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { classificarValor } from '../engine/obaCutoffs'
import logo from '../assets/logo.png'

const TIPOS_CIRURGIA = ['Y DE ROUX', 'FOBI-CAPELLA', 'SLEEVE', "BANDA G\u00c1STRICA AJUST\u00c1VEL", "N\u00c3O SEI"]

const ACOMPANHAMENTO_OPS = [
  "FA\u00c7O ACOMPANHAMENTO M\u00c9DICO E REPOSI\u00c7\u00d5ES",
  "FIZ ACOMPANHAMENTO MAS PAREI",
  "N\u00c3O FIZ ACOMPANHAMENTO NEM REPOSI\u00c7\u00d5ES",
  "N\u00c3O FA\u00c7O ACOMPANHAMENTO M\u00c9DICO",
]

const ESPECIALISTAS = [
  "CIRURGI\u00c3O", "CL\u00cdNICO", "HEMATOLOGISTA", "GASTROENTEROLOGISTA", "NUTR\u00d3LOGO",
  "ENDOCRINOLOGISTA", "CARDIOLOGISTA", "NEUROLOGISTA", "PSIQUIATRA", "REUMATOLOGISTA",
  "ORTOPEDISTA", "GINECOLOGISTA", "PNEUMOLOGISTA", "NEFROLOGISTA", "UROLOGISTA",
  "DERMATOLOGISTA", "OUTRO"
]

const STATUS_GLICEMICO_OPS = [
  "N\u00c3O ERA E N\u00c3O SOU DIAB\u00c9TICO",
  "ERA DIAB\u00c9TICO E FUI CURADO",
  "ERA DIAB\u00c9TICO E CONTINUO DIAB\u00c9TICO",
  "N\u00c3O ERA, MAS FIQUEI DIAB\u00c9TICO AP\u00d3S A CIRURGIA",
  "APRESENTO EPIS\u00d3DIOS DE DUMPING",
]

const STATUS_PRESSORICO_OPS = [
  "N\u00c3O SOU HIPERTENSO",
  "SOU HIPERTENSO CONTROLADO",
  "SOU HIPERTENSO MAL CONTROLADO",
]

const STATUS_ENDOSCOPICO_OPS = [
  'NORMAL',
  'GASTRITE',
  'ESOFAGITE',
  'BARRETT',
  'DRGE',
  'H. PYLORI',
  'DIVERTÍCULOS',
]

const STATUS_NEUROLOGICO_OPS = [
  "SEM QUEIXAS",
  "SEQUELA MOTORA",
  "DIST\u00daRBIO DA FALA",
  "DORM\u00caNCIAS | FORMIGAMENTOS",
  "ENXAQUECAS",
  "PERDA DE SENSIBILIDADE",
  "PERDA AUDITIVA",
  "PERDA DE OLFATO",
  "COMPROMETIMENTO DA VIS\u00c3O",
  "D\u00c9FICIT DE MEM\u00d3RIA",
]

const ATIVIDADES = ["SEDENT\u00c1RIO", "CAMINHADAS", "ACADEMIA", "ACADEMIA COM PERSONAL", "HIDROGIN\u00c1STICA", "FISIOTERAPIA", "PR\u00c1TICA ESPORTIVA"]

const PROJETOS = [
  "PRETENDO FAZER CIRURGIA PL\u00c1STICA",
  "PRETENDO FAZER REABILITA\u00c7\u00c3O",
  "PRETENDO MELHORAR MINHA AUTOESTIMA",
  "PRETENDO TER FILHO",
  "PRETENDO UM EMPREGO NOVO",
  "PRETENDO ABRIR UM NEG\u00d3CIO",
  "PRETENDO ESTUDAR",
  "PRETENDO MANTER A MINHA ATIVIDADE F\u00cdSICA",
  "PRETENDO AUMENTAR A MINHA ATIVIDADE F\u00cdSICA",
  "PRETENDO PRATICAR UM ESPORTE",
  "PRETENDO VIAJAR MAIS",
  "PRETENDO AJUDAR OUTRAS PESSOAS",
]

const COMPULSOES = [
  "DOCES", "COMIDA", "GELO", "\u00c1LCOOL", "JOGO", "TRABALHO", "CIGARRO / TABACO", "CANNABIS", "OUTRA"
]

const MEDICAMENTOS = [
  "FERRO ORAL", "FERRO INJET\u00c1VEL (EV/IM)", "VIT. B12 INTRAMUSCULAR", "VIT. B12 SUBLINGUAL", "POLIVITAM\u00cdNICO ORAL",
  "ANTICOAGULANTE",
  "ANTIDEPRESSIVO", "REM\u00c9DIO PARA DORMIR", "LAXANTES", "REM\u00c9DIO PARA PRESS\u00c3O",
  "REM\u00c9DIO PARA DORES", "REM\u00c9DIO PARA BAIXAR A GLICEMIA", "REM\u00c9DIO PARA COLESTEROL", "REM\u00c9DIO PARA TRIGLIC\u00c9RIDES",
  "TOPIRAMATO", "FENTERMINA", "NALTREXONA", "BUPROPIONA", "ORLISTAT (XENICAL)",
  "DOMPERIDONA (MOTILIUM)", "BROMOPRIDA",
]

const EMAGRECEDORES = ['Ozempic', 'Rybelsus', 'Wegovy', 'Mounjaro', 'Saxenda', 'Victoza', 'Trulicity', 'Xultophi']

const STATUS_INTESTINAL_OPS = [
  "INTESTINO FUNCIONA BEM",
  "OBSTIPA\u00c7\u00c3O CR\u00d4NICA (PRIS\u00c3O DE VENTRE)",
  "INTESTINO IRRIT\u00c1VEL (DIARREIA FREQUENTE)",
]

const STATUS_FIBROMIALGIA_OPS = [
  "TENHO FIBROMIALGIA DIAGNOSTICADA",
  "OBSTIPA\u00c7\u00c3O CR\u00d4NICA",
  "DORES NO CORPO",
  "DOR DE CABE\u00c7A / ENXAQUECAS",
  "INS\u00d4NIA",
  "PROBLEMAS DE MEM\u00d3RIA",
  "DIFICULDADE DE CONCENTRA\u00c7\u00c3O",
  "DEPRESS\u00c3O OU MELANCOLIA",
  "ZUMBIDOS",
  "DESEQUIL\u00cdBRIO",
  "VARIA\u00c7\u00c3O DO HUMOR",
  "SINTO FRIO OU CALOR EXCESSIVO",
  "EM USO DE GABAPENTINA", "EM USO DE PREGABALINA",
]

// BUG #2 corrigido: removidos os duplicados antigos (hdl, ldl, vldl,
// lipoproteina_a, apolipoproteina_b, colesterol_total v1, triglicerides v1)
// Mantida a versao 2 alinhada com buildModLipidico no obaEngine.js
const EXAMES_BASE = [
  { key: 'leucocitos',     label: "Leuc\u00f3citos (Total)",       unit: '/uL',    ref: "4.000\u201311.000", hint: "Sem ponto ou v\u00edrgula. Ex: 7500" },
  { key: 'neutrofilos',    label: "Neutr\u00f3filos Segmentados",  unit: '%',      ref: "40\u201370%" },
  { key: 'neutrofilos_ul', label: "Neutr\u00f3filos (calculado)",  unit: '/uL',    ref: "1.800\u20137.700", readOnly: true },
  { key: 'plaquetas',      label: 'Plaquetas',                unit: "x1000/\u00b5L", ref: "150\u2013400", hint: 'Ex: 250 = 250.000/\u00b5L' },
  { key: 'ferritina_oba',  label: 'Ferritina',                unit: 'ng/mL',  ref: "H: 24\u2013300 / F: 25\u2013150" },
  { key: 'vitamina_b12',   label: 'Vitamina B12',             unit: 'pg/mL',  ref: "300\u2013900 (bari: >300)" },
  { key: 'vitamina_d',     label: 'Vitamina D 25-OH',         unit: 'ng/mL',  ref: "30\u2013100 (bari: >30)" },
  { key: 'tsh',            label: 'TSH',                      unit: 'mUI/L',  ref: "0,4\u20134,5" },
  { key: 'hb_glicada',     label: 'Hb Glicada',               unit: '%',      ref: '<5,7%' },
  { key: 'glicemia',       label: 'Glicemia (jejum)',          unit: 'mg/dL',  ref: "70\u201399" },
  { key: 'insulina',       label: 'Insulina (jejum)',          unit: "\u00b5UI/mL", ref: "2\u201315" },
  { key: 'ast',            label: 'AST (TGO)',                 unit: 'U/L',    ref: 'H: <40 / F: <32' },
  { key: 'alt',            label: 'ALT (TGP)',                 unit: 'U/L',    ref: 'H: <56 / F: <35' },
  { key: 'gama_gt',        label: 'Gama-GT',                  unit: 'U/L',    ref: 'H: <61 / F: <36' },
  { key: 'creatinina',     label: 'Creatinina',               unit: 'mg/dL',  ref: "H: 0,7\u20131,2 / F: 0,5\u20131,0" },
  { key: 'acido_urico',    label: "\u00c1cido \u00darico",              unit: 'mg/dL',  ref: "H: 3,4\u20137,0 / F: 2,4\u20136,0" },
  { key: 'folatos',        label: "Folatos s\u00e9ricos",           unit: 'ng/mL',  ref: "4,0\u201320,0" },
  { key: 'zinco',          label: "Zinco s\u00e9rico",              unit: "\u00b5g/dL",  ref: "70\u2013120" },
  { key: 'pth',            label: 'PTH',                       unit: 'pg/mL',  ref: "15\u201365" },
  { key: 'calcio_ionico',  label: "C\u00e1lcio i\u00f4nico",             unit: 'mmol/L', ref: "1,15\u20131,32" },
  { key: 'magnesio',       label: "Magn\u00e9sio",                  unit: 'mg/dL',  ref: "1,7\u20132,4" },
  { key: 'colesterol_total', label: 'Colesterol Total',        unit: 'mg/dL',  ref: '<200' },
  { key: 'ldl_c',            label: 'LDL-c',                   unit: 'mg/dL',  ref: '<100' },
  { key: 'hdl_c',            label: 'HDL-c',                   unit: 'mg/dL',  ref: "M \u226540 / F \u226550" },
  { key: 'triglicerides',    label: "Triglic\u00e9rides",           unit: 'mg/dL',  ref: '<150' },
  { key: 'lpa',              label: 'Lp(a)',                   unit: 'mg/dL',  ref: '<30' },
  { key: 'apob',             label: 'ApoB',                    unit: 'mg/dL',  ref: '<90' },
  { key: 'apoa',             label: 'ApoA',                    unit: 'mg/dL',  ref: "M \u2265120 / F \u2265140" },
  { key: 'sdldl',            label: 'sdLDL',                   unit: 'mg/dL',  ref: '<30' },
  { key: 'vitamina_a',     label: 'Vitamina A (Retinol)',      unit: "\u00b5g/dL",  ref: "20\u201377" },
  { key: 'vitamina_e',     label: 'Vitamina E (Tocoferol)',    unit: 'mg/L',   ref: "5\u201318" },
  { key: 'tiamina',        label: 'Tiamina (B1)',              unit: 'nmol/L', ref: "70\u2013180" },
  { key: 'selenio',        label: "Sel\u00eanio",                   unit: "\u00b5g/L",   ref: "63\u2013160" },
  { key: 'vitamina_c',     label: 'Vitamina C',                unit: 'mg/dL',  ref: "0,4\u20132,0" },
  { key: 'vitamina_k',     label: 'Vitamina K',                unit: 'ng/mL',  ref: "0,2\u20133,2" },
  { key: 'niacina',        label: 'Niacina (B3)',              unit: "\u00b5g/mL",  ref: "0,5\u20138,9" },
  { key: 'testosterona',   label: 'Testosterona Total',        unit: 'ng/dL',  ref: "H: 300\u20131.000 / F: 15\u201370" },
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

// BUG #3 corrigido: removidas as chaves duplicadas vitamina_d e triglicerides
// (cada uma aparecia 2x). Mantida apenas uma versao de cada.
const LIMITES_OBA = {
  'leucocitos': { min:500, max:20000 },
  'neutrofilos': { min:1, max:99 },
  'plaquetas': { min:10, max:1000 },
  'ferritina_oba': { min:1, max:5000 },
  'vitamina_b12': { min:50, max:2000 },
  'vitamina_d': { min:1, max:200 },
  'tsh': { min:0.01, max:50 },
  'hb_glicada': { min:3, max:20 },
  'glicemia': { min:30, max:600 },
  'insulina': { min:0.5, max:200 },
  'triglicerides': { min:20, max:3000 },
  'ast': { min:5, max:1000 },
  'alt': { min:5, max:1000 },
  'gama_gt': { min:5, max:1000 },
  'creatinina': { min:0.3, max:15 },
  'acido_urico': { min:1, max:20 },
  'folatos': { min:1, max:50 },
  'zinco': { min:20, max:300 },
  'pth': { min:1, max:2000 },
  'calcio_ionico': { min:0.5, max:3.0 },
  'magnesio': { min:0.5, max:10 },
  'colesterol_total': { min:50, max:700 },
  'ldl_c': { min:10, max:500 },
  'hdl_c': { min:5, max:200 },
  'lpa': { min:0, max:300 },
  'apob': { min:10, max:300 },
  'apoa': { min:30, max:300 },
  'sdldl': { min:0, max:100 },
  'vitamina_a': { min:5, max:200 },
  'vitamina_e': { min:1, max:50 },
  'tiamina': { min:10, max:500 },
  'selenio': { min:10, max:400 },
  'vitamina_c': { min:0.1, max:10 },
  'vitamina_k': { min:0.05, max:15 },
  'niacina': { min:0.1, max:30 },
  'testosterona': { min:5, max:2000 },
  'psa_total': { min:0, max:100 },
  'ca199': { min:0, max:500 },
  'estradiol': { min:5, max:5000 },
  'cea': { min:0, max:100 }
}

const inp = { width:'100%', border:'1.5px solid #E5E7EB', borderRadius:8, padding:'0.65rem 0.9rem', fontSize:'0.92rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const btnP = { width:'100%', background:'#7B1E1E', color:'white', border:'none', borderRadius:10, padding:'0.9rem', fontSize:'1rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginTop:'1.5rem' }
const btnS = { width:'100%', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:10, padding:'0.7rem', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginTop:'0.5rem' }
const OV = { position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'1.5rem 1rem', boxSizing:'border-box' }
const CD = { background:'white', borderRadius:20, width:'100%', maxWidth:800, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', marginBottom:'2rem', boxSizing:'border-box' }
const HD = { background:'linear-gradient(135deg, #7B1E1E, #DC2626)', padding:'1.5rem', borderRadius:'20px 20px 0 0', display:'flex', alignItems:'center', gap:'1rem' }


export default function OBAModal({ sexo, cpf, idade, examesRedFairy, dadosRedFairy, onConcluir, onFechar }) {
  //  States: declarados PRIMEIRO, antes de qualquer useEffect que os use 
  // BUG #4 e #5 corrigidos: ordem dos hooks. form, exames, dataExames,
  // aberrantesOBA, alertaPeso agora vem antes dos useEffects que os mexem.
  const [etapa, setEtapa] = useState('anamnese')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [anamneseSalva, setAnamneseSalva] = useState(null)
  const [alertaPeso, setAlertaPeso] = useState(null)
  const [dataExames, setDataExames] = useState('')
  const [aberrantesOBA, setAberrantesOBA] = useState({})

  const [form, setForm] = useState({
    cirurgia_dia: '', cirurgia_mes: '', cirurgia_ano: '',
    peso_antes: '', peso_minimo_pos: '', peso_atual: '',
    altura: '',
    ganhou_peso_apos: false, fez_plasma_argonio: false, semEspecialista: false,
    metformina: false, ibp: false, tiroxina: false, methotrexato: false, hivTratamento: false,
    status_intestinal: '', status_fibromialgia: [], calprotectina: '', indican: '',
    gestacoes_previas: '', abortamentos_espontaneos: null,
    indicacao_cirurgia: '',
    tipo_cirurgia: '',
    acompanhamento: '', especialistas: [],
    status_gestacional: '', semanas_gestacao: '', temExamesMesmaData: false,
    status_glicemico: '', status_pressorico: '', status_endoscopico: [], status_neurologico: [],
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

  const saudacao = sexo === 'F' ? 'Bem-vinda' : 'Bem-vindo'
  const isFem = sexo === 'F'
  const idadeNum = parseInt(idade) || 0

  const examesExtras = idadeNum >= 40 ? (isFem ? EXAMES_MULHER_40 : EXAMES_HOMEM_40) : []
  const todosExames = [...EXAMES_BASE, ...examesExtras]

  const [exames, setExames] = useState(Object.fromEntries(todosExames.map(e => [e.key, ''])))

  //  Effects: depois de TODOS os useState que eles dependem 
  useEffect(() => {
    if (!dadosRedFairy) return
    const novosMeds = []
    if (dadosRedFairy.ferro_oral)      novosMeds.push('FERRO ORAL')
    if (dadosRedFairy.ferro_injetavel) novosMeds.push("FERRO INJET\u00c1VEL (EV/IM)")
    if (novosMeds.length > 0) {
      setForm(prev => ({
        ...prev,
        medicamentos: [...new Set([...(prev.medicamentos || []), ...novosMeds])],
      }))
    }
  }, [dadosRedFairy])

  useEffect(() => {
    if (dadosRedFairy?.gestante) {
      setForm(prev => ({
        ...prev,
        status_gestacional: prev.status_gestacional || "GR\u00c1VIDA",
        semanas_gestacao: prev.semanas_gestacao || (dadosRedFairy.semanas_gestacao ? String(dadosRedFairy.semanas_gestacao) : ''),
      }))
    }
  }, [dadosRedFairy])

  useEffect(() => {
    if (form.temExamesMesmaData && examesRedFairy?.dataColeta && !dataExames) {
      setDataExames(examesRedFairy.dataColeta)
    }
  }, [form.temExamesMesmaData, examesRedFairy])

  //  Handlers 
  const handlePesoAtualBlur = () => {
    const atual = parseFloat(form.peso_atual)
    const minimo = parseFloat(form.peso_minimo_pos)
    if (!isNaN(atual) && !isNaN(minimo) && atual < minimo) {
      setForm(prev => ({ ...prev, peso_atual: String(minimo) }))
      setAlertaPeso({ original: atual, ajustado: minimo })
    } else {
      setAlertaPeso(null)
    }
  }

  function handleExameChange(key, value) {
    setExames(prev => {
      const novo = { ...prev, [key]: value }
      const leuco = parseFloat(key === 'leucocitos' ? value : prev.leucocitos)
      const neutPct = parseFloat(key === 'neutrofilos' ? value : prev.neutrofilos)
      if (!isNaN(leuco) && !isNaN(neutPct) && leuco > 0 && neutPct > 0) {
        novo.neutrofilos_ul = Math.round(leuco * neutPct / 100).toString()
      }
      return novo
    })
  }

  // BUG #1 corrigido: removida a duplicacao da funcao handleExameChangeOBA
  // (antes existia 2x identicas seguidas).
  function handleExameChangeOBA(key, value) {
    handleExameChange(key, value)
    if (value !== '') {
      const num = parseFloat(value)
      const lim = LIMITES_OBA[key]
      if (lim && !isNaN(num)) {
        setAberrantesOBA(prev => ({ ...prev, [key]: num < lim.min || num > lim.max }))
      }
    } else {
      setAberrantesOBA(prev => ({ ...prev, [key]: false }))
    }
  }

  const diasExames = calcDias(dataExames)

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

  // IMC calculado a partir da ALTURA (cm) + peso (kg). Substitui os antigos
  // campos manuais de IMC. imc_antes usa o peso pré-cirurgia; imc_atual o atual.
  const alturaCm = parseFloat(form.altura)
  const alturaM  = (!isNaN(alturaCm) && alturaCm > 0) ? alturaCm / 100 : null
  const imcAntes = (alturaM && !isNaN(pesoAntes)) ? pesoAntes / (alturaM * alturaM) : null
  const imcAtual = (alturaM && !isNaN(pesoAtual)) ? pesoAtual / (alturaM * alturaM) : null

  function toggleAtividade(val) {
    if (val === "SEDENT\u00c1RIO") sf('atividade_fisica', form.atividade_fisica.includes("SEDENT\u00c1RIO") ? [] : ["SEDENT\u00c1RIO"])
    else if (!form.atividade_fisica.includes("SEDENT\u00c1RIO")) sf('atividade_fisica', tog(form.atividade_fisica, val))
  }

  function buildDadosOBA() {
    return {
      sexo,
      idade: idadeNum,
      tipo_cirurgia:      form.tipo_cirurgia || "N\u00c3O SEI",
      meses_pos_cirurgia: mesesPos || 0,
      peso_antes:         pesoAntes || null,
      peso_atual:         pesoAtual || null,
      peso_minimo_pos:    pesoMin || null,
      imc_antes:          imcAntes !== null ? +imcAntes.toFixed(1) : null,
      imc_atual:          imcAtual !== null ? +imcAtual.toFixed(1) : null,
      altura:             alturaCm || null,
      ganhou_peso_apos:   (kgGanhou !== null && kgGanhou > 0) ? true : form.ganhou_peso_apos,
      fez_plasma_argonio: form.fez_plasma_argonio,
      status_glicemico:   form.status_glicemico || null,
      status_pressorico:  form.status_pressorico || null,
      status_endoscopico: form.status_endoscopico.length > 0 ? form.status_endoscopico : null,
      status_neurologico: form.status_neurologico.length > 0 ? form.status_neurologico : null,
      status_osseo:       form.status_osseo || null,
      status_dental:      form.status_dental || null,
      status_gestacional: form.status_gestacional || null,
      semanas_gestacao:   form.semanas_gestacao ? parseFloat(form.semanas_gestacao) : null,
      gestacoes_previas:  form.gestacoes_previas !== '' ? parseInt(form.gestacoes_previas) : null,
      abortamentos_espontaneos: form.abortamentos_espontaneos,
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
      calprotectina: form.calprotectina === '' ? null : Number(form.calprotectina),
      indican: form.indican || null,
      metformina:         form.metformina,
      ibp:                form.ibp,
      tiroxina:           form.tiroxina,
      methotrexato:       form.methotrexato,
      hivTratamento:      form.hivTratamento,
      // Acompanhamento: estes 3 campos sao LIDOS por buildModAcompanhamento no
      // engine (obaEngine.js:1569-1571). Sem eles, o engine recebia undefined e
      // disparava sempre o alerta GRAVE falso "SEM ACOMPANHAMENTO ESPECIALIZADO".
      acompanhamento:     form.acompanhamento || null,
      especialistas:      form.especialistas,
      semEspecialista:    form.semEspecialista,
      indicacao_cirurgia: form.indicacao_cirurgia || null,
      teve_covid:         form.teve_covid,
      vacina_covid:       form.vacina_covid,
      cirurgia_plastica:  form.cirurgia_plastica,
    }
  }

  function buildExamesOBA() {
    return Object.fromEntries(
      todosExames.map(e => [e.key, exames[e.key] ? parseFloat(exames[e.key]) : null])
    )
  }

  async function salvarAnamnese() {
    setErro('')
    if (!form.cirurgia_ano || !calcMesesPos()) {
      setErro('Informe pelo menos o ANO da cirurgia.'); return
    }
    if (!form.tipo_cirurgia) {
      setErro('Selecione o tipo de cirurgia.'); return
    }
    if (!form.acompanhamento) {
      setErro("Selecione a op\u00e7\u00e3o de acompanhamento."); return
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
      status_endoscopico: form.status_endoscopico.length > 0 ? form.status_endoscopico : null,
      status_neurologico: form.status_neurologico.length > 0 ? form.status_neurologico : null,
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
      gestacoes_previas: form.gestacoes_previas !== '' ? parseInt(form.gestacoes_previas) : null,
      abortamentos_espontaneos: form.abortamentos_espontaneos,
      indicacao_cirurgia: form.indicacao_cirurgia || null,
    }

    await supabase.from('oba_anamnese').insert(dadosAnamnese)
    setLoading(false)
    setAnamneseSalva(dadosAnamnese)
    setEtapa('exames')
  }

  async function salvarExames() {
    setLoading(true)
    const examesObj = buildExamesOBA()

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
    onConcluir(buildDadosOBA(), examesObj)
  }

  function pularExames() {
    onConcluir(buildDadosOBA(), {})
  }

  const Header = ({ sub }) => (
    <div style={HD}>
      <button onClick={onFechar} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, color:'white', fontSize:'0.8rem', fontWeight:700, padding:'0.4rem 0.8rem', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>{"\u2190 Voltar"}</button>
      <img src={logo} alt="OBA" style={{ width:40, height:40, objectFit:'contain', filter:'brightness(10)' }} />
      <div>
        <h2 style={{ color:'white', fontSize:'1.2rem', fontWeight:800, margin:0 }}>{saudacao} ao Projeto OBA!</h2>
        <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px', marginTop:'0.2rem' }}>{sub}</p>
      </div>
    </div>
  )


  if (etapa === 'exames') return (
    <div style={OV} onClick={pularExames}>
      <div style={CD} onClick={e => e.stopPropagation()}>
        <Header sub={"Exames Complementares \u2014 etapa final"} />
        <div style={{ padding:'1.5rem', boxSizing:'border-box', width:'100%', overflowX:'hidden' }}>

          <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
            <p style={{ fontSize:'0.8rem', fontWeight:700, color:'#166534', margin:0 }}>
              {"\u2713 Anamnese salva com sucesso!"}
            </p>
            <p style={{ fontSize:'0.75rem', color:'#15803D', marginTop:'0.3rem' }}>
              {"Preencha os exames que tiver em m\u00e3os. Pode pular se n\u00e3o tiver agora."}
            </p>
          </div>

          {examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && (
            <div style={{ background:'#FEF2F2', border:'1.5px solid #DC2626', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
              <p style={{ fontSize:'0.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', marginBottom:'0.6rem' }}>
                {"\ud83d\udd12 Exames registrados na avalia\u00e7\u00e3o RedFairy \u2014 somente leitura"}
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

          {examesRedFairy && examesRedFairy.dataColeta && (
            <div style={{ background:'#FDF2F8', border:'1.5px solid #F9A8D4', borderRadius:10, padding:'0.9rem 1rem', marginBottom:'1rem' }}>
              <p style={{ color:'#831843', fontSize:'0.8rem', lineHeight:'1.5', marginBottom:'0.8rem' }}>
                {"Se, na data em que voc\u00ea realizou o hemograma inicial, tamb\u00e9m fez alguns desses exames, pode inserir os resultados na plataforma. De todo modo, \u00e9 recomend\u00e1vel repetir ou complementar os exames em cerca de duas semanas, e, se desejar, podemos emitir a solicita\u00e7\u00e3o m\u00e9dica mediante o pagamento de uma pequena taxa. Isso costuma valer muito a pena, pois economiza tempo, reduz custos de deslocamento e evita a necessidade de uma nova consulta presencial apenas para esse fim. Se preferir, a plataforma tamb\u00e9m poder\u00e1 disponibilizar uma teleconsulta m\u00e9dica, especialmente caso os exames apresentem altera\u00e7\u00f5es mais significativas."}
              </p>
              <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                <input
                  type="checkbox"
                  checked={form.temExamesMesmaData}
                  onChange={e => sf('temExamesMesmaData', e.target.checked)}
                  style={{ width:'1.1rem', height:'1.1rem', accentColor:'#DB2777' }}
                />
                <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#831843' }}>
                  {"Tenho exames da mesma data do eritron ("}{examesRedFairy.dataColeta.split('-').reverse().join('/')}{")"}
                </span>
              </label>
            </div>
          )}

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#374151', marginBottom:'0.5rem' }}>Data dos exames</label>
          <input style={inp} type="date" value={dataExames} onChange={e => setDataExames(e.target.value)} />
          {diasExames !== null && (
            <div style={{ background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:8, padding:'0.5rem 0.9rem', marginTop:'0.4rem', marginBottom:'0.8rem' }}>
              <p style={{ color:'#0369A1', fontSize:'0.85rem', fontWeight:700 }}>
                {diasExames === 0 ? 'Exames de hoje' : `Realizados h\u00e1 ${diasExames} dia${diasExames > 1 ? 's' : ''}`}
              </p>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
            {todosExames.filter(ex => !(examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && ex.key === 'ferritina_oba')).map(ex => (
              <div key={ex.key} style={{ display:'flex', flexDirection:'column', background: ex.readOnly ? '#F9FAFB' : 'white', border: aberrantesOBA[ex.key] ? '1.5px solid #EAB308' : '1.5px solid #F3F4F6', borderRadius:8, padding:'0.5rem 0.7rem' }}>
                <span style={{ fontSize:'0.8rem', fontWeight:600, color: ex.readOnly ? '#9CA3AF' : '#374151' }}>{ex.label}</span>
                <span style={{ fontSize:'0.65rem', color:'#9CA3AF' }}>({ex.unit})</span>
                {ex.ref && <span style={{ fontSize:'0.62rem', color:'#6B7280', fontStyle:'italic' }}>V.R.: {ex.ref}</span>}
                {ex.hint && <span style={{ fontSize:'0.62rem', color:'#F97316' }}>{ex.hint}</span>}
                <input
                  style={{ marginTop:'0.4rem', width:'100%', border:'1.5px solid #E5E7EB', borderRadius:6, padding:'0.35rem 0.5rem', fontSize:'0.9rem', fontWeight:700, outline:'none', textAlign:'right', fontFamily:'inherit', background: ex.readOnly ? '#F0F0F0' : 'white', color: ex.readOnly ? '#6B7280' : '#111827', boxSizing:'border-box' }}
                  type="number" step="0.01" placeholder={ex.readOnly ? 'auto' : "\u2014"}
                  readOnly={ex.readOnly}
                  value={exames[ex.key] || ''}
                  onChange={e => !ex.readOnly && handleExameChangeOBA(ex.key, e.target.value)} />
                {aberrantesOBA[ex.key] && <span style={{ fontSize:'0.62rem', fontWeight:700, color:'#CA8A04', marginTop:'0.2rem' }}>{"\u26a0 VALOR ABERRANTE \u2014 CONFIRME"}</span>}
                {(() => {
                  const cl = classificarValor(ex.key, exames[ex.key], { bariatrica: true })
                  if (!cl) return null
                  const cores = {
                    normal:    { fundo:'#F0FDF4', borda:'#BBF7D0', texto:'#166534', rotulo:'NORMAL' },
                    limitrofe: { fundo:'#FEFCE8', borda:'#FDE68A', texto:'#92400E', rotulo:"LIMITROFE" },
                    alterado:  { fundo:'#FFF1F2', borda:'#FECDD3', texto:'#9F1239', rotulo:'ALTERADO' },
                  }[cl.nivel]
                  const seta = cl.direcao === 'alto' ? " \u2191" : cl.direcao === 'baixo' ? " \u2193" : ''
                  return (
                    <span style={{ display:'inline-block', marginTop:'0.25rem', fontSize:'0.6rem', fontWeight:700, background:cores.fundo, border:`1px solid ${cores.borda}`, color:cores.texto, padding:'0.1rem 0.4rem', borderRadius:6 }}>
                      {cores.rotulo}{seta}
                    </span>
                  )
                })()}
              </div>
            ))}
          </div>

          {idadeNum >= 40 && (
            <div style={{ background:'#FEF9EC', border:'1px solid #FDE68A', borderRadius:8, padding:'0.5rem 0.9rem', margin:'0.5rem 0' }}>
              <p style={{ color:'#92400E', fontSize:'0.78rem', fontWeight:700 }}>
                {isFem ? "+ CEA e Estradiol (mulher \u2265 40 anos)" : "+ PSA Total, CA 19-9 e CEA (homem \u2265 40 anos)"}
              </p>
            </div>
          )}

          {(() => {
            const temAlterado = todosExames.some(ex => {
              const cl = classificarValor(ex.key, exames[ex.key], { bariatrica: true })
              return cl && cl.nivel === 'alterado'
            })
            if (!temAlterado) return null
            return (
              <div style={{ background:'#FFF1F2', border:'1.5px solid #FCA5A5', borderRadius:10, padding:'0.9rem 1rem', margin:'1rem 0' }}>
                <p style={{ color:'#9F1239', fontSize:'0.85rem', fontWeight:700, marginBottom:'0.4rem' }}>
                  {"\ud83e\ude7a Alguns exames apresentam altera\u00e7\u00f5es significativas."}
                </p>
                <p style={{ color:'#7F1D1D', fontSize:'0.78rem', lineHeight:'1.5' }}>
                  {"A plataforma pode disponibilizar uma teleconsulta m\u00e9dica para discuss\u00e3o desses resultados. Fale com seu m\u00e9dico assistente ou solicite a teleconsulta ap\u00f3s finalizar esta avalia\u00e7\u00e3o."}
                </p>
              </div>
            )
          })()}

          <button style={btnP} onClick={salvarExames} disabled={loading}>
            {loading ? 'Salvando...' : "Concluir e ir para a Avalia\u00e7\u00e3o \u2192"}
          </button>
          <button style={btnS} onClick={pularExames}>
            {"Pular exames e ir para a Avalia\u00e7\u00e3o"}
          </button>
        </div>
      </div>
    </div>
  )


  return (
    <div style={OV} onClick={onFechar}>
      <div style={CD} onClick={e => e.stopPropagation()}>
        <Header sub={"Otimizar o Bari\u00e1trico"} />
        <div style={{ padding:'1.5rem', boxSizing:'border-box', width:'100%', overflowX:'hidden' }}>

          <div style={{ background:'#FEF2F2', border:'1px solid #FECDD3', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
            <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', fontWeight:700, marginBottom:'0.3rem' }}>{"O bari\u00e1trico \u00e9 um paciente complexo."}</p>
            <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'#9B2C2C' }}>{"Precisamos de mais informa\u00e7\u00f5es para cuidar de voc\u00ea. Marque as caixinhas e preencha os campos:"}</p>
          </div>

          <SectionTitle>Dados da Cirurgia</SectionTitle>

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>
            Data da cirurgia <span style={{ color:'#DC2626' }}>*</span>
            <span style={{ color:'#9CA3AF', fontWeight:400, marginLeft:'0.4rem' }}>{"(ANO obrigat\u00f3rio \u2014 DIA e M\u00caS opcionais)"}</span>
          </label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.5fr', gap:'0.5rem', marginBottom:'0.4rem' }}>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#9CA3AF', fontWeight:600 }}>DIA (opcional)</label>
              <input style={inp} type="number" min="1" max="31" placeholder="DD" value={form.cirurgia_dia} onChange={e => sf('cirurgia_dia', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#9CA3AF', fontWeight:600 }}>{"M\u00caS (opcional)"}</label>
              <input style={inp} type="number" min="1" max="12" placeholder="MM" value={form.cirurgia_mes} onChange={e => sf('cirurgia_mes', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#DC2626', fontWeight:700 }}>{"ANO \u2731"}</label>
              <input style={{ ...inp, borderColor: form.cirurgia_ano ? '#E5E7EB' : '#FCA5A5' }} type="number" min="2000" max="2030" placeholder="AAAA" value={form.cirurgia_ano} onChange={e => sf('cirurgia_ano', e.target.value)} />
            </div>
          </div>
          {mesesPos !== null ? (
            <div style={{ background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:8, padding:'0.6rem 0.9rem', marginBottom:'0.5rem' }}>
              <p style={{ color:'#0369A1', fontSize:'0.9rem', fontWeight:800, margin:0 }}>
                {"\u2713 "}{mesesPos}{" meses p\u00f3s-cirurgia"}
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

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>{"Indica\u00e7\u00e3o da cirurgia"}</label>
          <RadioGroup
            options={['OBESIDADE',"MET\u00c1BOLICA (S\u00cdNDROME METAB\u00d3LICA, DISLIPIDEMIA, HIPERTENS\u00c3O, APNEIA DO SONO)",'OBESIDADE + DIABETES','HEMOCROMATOSE','GASTRECTOMIA POR OUTRAS CAUSAS']}
            value={form.indicacao_cirurgia}
            onChange={v => sf('indicacao_cirurgia', v)}
          />

          {sexo === 'F' && (
            <>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>{"N\u00famero de gesta\u00e7\u00f5es pr\u00e9vias"}</label>
              <input
                style={inp}
                type="number"
                min="0"
                max="20"
                step="1"
                placeholder="Ex: 2 (digite 0 se nunca engravidou)"
                value={form.gestacoes_previas}
                onChange={e => sf('gestacoes_previas', e.target.value)}
              />

              {form.gestacoes_previas !== '' && parseInt(form.gestacoes_previas) > 0 && (
                <>
                  <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>{"Teve abortamentos espont\u00e2neos?"}</label>
                  <RadioGroup
                    options={['SIM',"N\u00c3O"]}
                    value={form.abortamentos_espontaneos === true ? 'SIM' : form.abortamentos_espontaneos === false ? "N\u00c3O" : ''}
                    onChange={v => sf('abortamentos_espontaneos', v === 'SIM')}
                  />
                </>
              )}
            </>
          )}

          <SectionTitle>Status Ponderal</SectionTitle>

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>Peso antes da cirurgia (kg)</label>
          <input style={inp} type="number" placeholder="Ex: 120" value={form.peso_antes} onChange={e => sf('peso_antes', e.target.value)} />

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>{"Menor peso ap\u00f3s a cirurgia (kg)"}</label>
          <input style={inp} type="number" placeholder="Ex: 72" value={form.peso_minimo_pos} onChange={e => sf('peso_minimo_pos', e.target.value)} />

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Peso atual (kg)</label>
          <input style={inp} type="number" placeholder="Ex: 78" value={form.peso_atual} onChange={e => sf('peso_atual', e.target.value)} onBlur={handlePesoAtualBlur} />
          {alertaPeso && (
            <p style={{ color: '#d97706', fontSize: '0.75rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
              {"\u26a0\ufe0f O peso atual informado ("}{alertaPeso.original}{" kg) n\u00e3o pode ser menor que o menor peso p\u00f3s-cirurgia ("}{alertaPeso.ajustado}{" kg). Valor ajustado automaticamente para "}{alertaPeso.ajustado}{" kg."}
            </p>
          )}

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Altura (cm)</label>
          <input style={inp} type="number" step="1" placeholder="Ex: 165" value={form.altura} onChange={e => sf('altura', e.target.value)} />
          <p style={{ fontSize:'0.65rem', color:'#6B7280', marginTop:'0.25rem' }}>{"O IMC \u00e9 calculado automaticamente a partir do peso e da altura."}</p>
          {(imcAntes !== null || imcAtual !== null) && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem', marginTop:'0.5rem' }}>
              <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8, padding:'0.5rem 0.8rem' }}>
                <p style={{ fontSize:'0.68rem', color:'#6B7280', marginBottom:'0.1rem' }}>IMC antes</p>
                <p style={{ fontSize:'0.95rem', fontWeight:700, color:'#374151' }}>{imcAntes !== null ? imcAntes.toFixed(1) : "\u2014"}</p>
              </div>
              <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8, padding:'0.5rem 0.8rem' }}>
                <p style={{ fontSize:'0.68rem', color:'#6B7280', marginBottom:'0.1rem' }}>IMC atual</p>
                <p style={{ fontSize:'0.95rem', fontWeight:700, color:'#374151' }}>{imcAtual !== null ? imcAtual.toFixed(1) : "\u2014"}</p>
              </div>
            </div>
          )}

          {kgPerdidos !== null && kgPerdidos > 0 && (
            <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'0.5rem 0.9rem', marginTop:'0.5rem' }}>
              <p style={{ color:'#166534', fontSize:'0.85rem', fontWeight:700 }}>{"\u2713 Perdeu "}{kgPerdidos.toFixed(1)}{" kg do peso inicial"}</p>
            </div>
          )}
          {kgGanhou !== null && kgGanhou > 0 && (
            <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:8, padding:'0.5rem 0.9rem', marginTop:'0.5rem' }}>
              <p style={{ color:'#92400E', fontSize:'0.85rem', fontWeight:700 }}>{"\u26a0 Ganhou "}{kgGanhou.toFixed(1)}{" kg desde o menor peso"}</p>
            </div>
          )}

          <div style={{ marginTop:'0.8rem' }}>
            <CheckRow label={"FIZ PLASMA DE ARG\u00d4NIO"} checked={form.fez_plasma_argonio} onClick={() => sf('fez_plasma_argonio', !form.fez_plasma_argonio)} />
          </div>

          <SectionTitle>{"Acompanhamento M\u00e9dico"}</SectionTitle>
          <RadioGroup options={ACOMPANHAMENTO_OPS} value={form.acompanhamento} onChange={v => sf('acompanhamento', v)} />

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Especialistas que me acompanham:</label>
          <CheckRow
            label={"N\u00c3O ESTOU SOB ACOMPANHAMENTO"}
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
          </div>

          {isFem && idadeNum >= 15 && (
            <>
              <SectionTitle>Status Gestacional</SectionTitle>
              <CheckRow label={"ESTOU GR\u00c1VIDA"} checked={form.status_gestacional === "GR\u00c1VIDA"} onClick={() => sf('status_gestacional', form.status_gestacional === "GR\u00c1VIDA" ? '' : "GR\u00c1VIDA")} />
              {form.status_gestacional === "GR\u00c1VIDA" && (
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.4rem' }}>
                  <input style={{ ...inp, width:120 }} type="number" placeholder="Semanas" value={form.semanas_gestacao} onChange={e => sf('semanas_gestacao', e.target.value)} />
                  <span style={{ fontSize:'0.85rem', color:'#6B7280' }}>{"semanas de gesta\u00e7\u00e3o"}</span>
                </div>
              )}
            </>
          )}

          <SectionTitle>{"Status Glic\u00eamico"}</SectionTitle>
          <RadioGroup options={STATUS_GLICEMICO_OPS} value={form.status_glicemico} onChange={v => sf('status_glicemico', v)} />

          <SectionTitle>{"Status Press\u00f3rico"}</SectionTitle>
          <RadioGroup options={STATUS_PRESSORICO_OPS} value={form.status_pressorico} onChange={v => sf('status_pressorico', v)} />

          <SectionTitle>{"Status Endosc\u00f3pico"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_ENDOSCOPICO_OPS.map(opt => {
              const ehNormal = opt === 'NORMAL'
              const normalMarcado = form.status_endoscopico.includes('NORMAL')
              const opcaoMarcada = form.status_endoscopico.includes(opt)
              return (
                <CheckRow
                  key={opt}
                  label={opt}
                  checked={opcaoMarcada}
                  disabled={!ehNormal && normalMarcado}
                  onClick={() => {
                    if (ehNormal) {
                      if (opcaoMarcada) {
                        sf('status_endoscopico', [])
                      } else {
                        sf('status_endoscopico', ['NORMAL'])
                      }
                    } else {
                      const sem = form.status_endoscopico.filter(x => x !== opt && x !== 'NORMAL')
                      sf('status_endoscopico', opcaoMarcada ? sem : [...sem, opt])
                    }
                  }}
                />
              )
            })}
          </div>

          <SectionTitle>Status Vascular</SectionTitle>

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>Trombose</label>
          <div style={{ display:'flex', gap:'0.8rem', marginBottom:'0.6rem' }}>
            {[['Sim', true], ["N\u00e3o", false]].map(([l, v]) => (
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
            {[['Sim', true], ["N\u00e3o", false]].map(([l, v]) => (
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
          <CheckRow label={"TENHO VARIZES DE ES\u00d4FAGO"} checked={form.varizes_esofago} onClick={() => sf('varizes_esofago', !form.varizes_esofago)} />
          {form.varizes_esofago && (
            <CheckRow label={"OPEREI VARIZES DE ES\u00d4FAGO"} checked={form.operou_varizes_esofago} onClick={() => sf('operou_varizes_esofago', !form.operou_varizes_esofago)} />
          )}

          <SectionTitle>Status Dental</SectionTitle>
          {["BOA SA\u00daDE ORAL, DENTI\u00c7\u00c3O OK.", 'PRECISO TRATAMENTO ODONTOL\u00d3GICO', 'PERDI MAIS DE UM DENTE AP\u00d3S A CIRURGIA'].map(op => (
            <div key={op} onClick={() => sf('status_dental', form.status_dental === op ? '' : op)} style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem', borderRadius:8, border:`1.5px solid ${form.status_dental === op ? '#DC2626' : '#E5E7EB'}`, background: form.status_dental === op ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', marginBottom:'0.4rem', fontSize:'0.85rem', fontWeight: form.status_dental === op ? 700 : 500, color: form.status_dental === op ? '#7B1E1E' : '#374151' }}>
              <Radio16 active={form.status_dental === op} />{op}
            </div>
          ))}

          <SectionTitle>{"Status \u00d3sseo"}</SectionTitle>
          {["DENSITOMETRIA \u00d3SSEA NORMAL", 'OSTEOPENIA', 'OSTEOPOROSE', "N\u00c3O FIZ DENSITOMETRIA"].map(op => (
            <div key={op} onClick={() => sf('status_osseo', form.status_osseo === op ? '' : op)} style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem', borderRadius:8, border:`1.5px solid ${form.status_osseo === op ? '#DC2626' : '#E5E7EB'}`, background: form.status_osseo === op ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', marginBottom:'0.4rem', fontSize:'0.85rem', fontWeight: form.status_osseo === op ? 700 : 500, color: form.status_osseo === op ? '#7B1E1E' : '#374151' }}>
              <Radio16 active={form.status_osseo === op} />{op}
            </div>
          ))}

          <SectionTitle>{"Status Neurol\u00f3gico"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_NEUROLOGICO_OPS.map(opt => {
              const ehSemQueixas = opt === 'SEM QUEIXAS'
              const semQueixasMarcado = form.status_neurologico.includes('SEM QUEIXAS')
              const opcaoMarcada = form.status_neurologico.includes(opt)
              return (
                <CheckRow
                  key={opt}
                  label={opt}
                  checked={opcaoMarcada}
                  disabled={!ehSemQueixas && semQueixasMarcado}
                  onClick={() => {
                    if (ehSemQueixas) {
                      if (opcaoMarcada) {
                        sf('status_neurologico', [])
                      } else {
                        sf('status_neurologico', ['SEM QUEIXAS'])
                      }
                    } else {
                      const sem = form.status_neurologico.filter(x => x !== opt && x !== 'SEM QUEIXAS')
                      sf('status_neurologico', opcaoMarcada ? sem : [...sem, opt])
                    }
                  }}
                />
              )
            })}
          </div>

          <SectionTitle>Status Intestinal</SectionTitle>
          <RadioGroup options={STATUS_INTESTINAL_OPS} value={form.status_intestinal} onChange={v => sf('status_intestinal', form.status_intestinal === v ? '' : v)} />

          {(
            (form.status_intestinal && form.status_intestinal !== 'INTESTINO FUNCIONA BEM') ||
            form.status_fibromialgia.includes("TENHO FIBROMIALGIA DIAGNOSTICADA") ||
            form.status_fibromialgia.includes("OBSTIPA\u00c7\u00c3O CR\u00d4NICA")
          ) && (
            <div style={{ marginTop:'0.6rem', padding:'0.6rem', background:'#FEF3C7', borderRadius:'8px', border:'1px solid #FDE68A' }}>
              <p style={{ fontSize:'0.72rem', color:'#92400E', fontWeight:600, marginBottom:'0.5rem' }}>
                {"\ud83d\udd2c Exames Intestinais Complementares (sugeridos)"}
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem' }}>

                <div style={{ display:'flex', flexDirection:'column' }}>
                  <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:'0.2rem' }}>
                    Calprotectina fecal
                    <span style={{ color:'#6B7280', fontWeight:400, marginLeft:'0.3rem' }}>{"\u00b5g/g (ref: <50)"}</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.calprotectina}
                    onChange={e => sf('calprotectina', e.target.value)}
                    style={{
                      padding:'0.4rem 0.6rem',
                      border:'1px solid #D1D5DB',
                      borderRadius:'6px',
                      fontSize:'0.85rem'
                    }}
                  />
                </div>

                <div style={{ display:'flex', flexDirection:'column' }}>
                  <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:'0.2rem' }}>
                    {"Indican plasm\u00e1tico"}
                    <span style={{ color:'#6B7280', fontWeight:400, marginLeft:'0.3rem' }}>qualitativo</span>
                  </label>
                  <select
                    value={form.indican}
                    onChange={e => sf('indican', e.target.value)}
                    style={{
                      padding:'0.4rem 0.6rem',
                      border:'1px solid #D1D5DB',
                      borderRadius:'6px',
                      fontSize:'0.85rem',
                      background:'white'
                    }}
                  >
                    <option value="">Selecione</option>
                    <option value="Negativo">Negativo</option>
                    <option value="Positivo">Positivo</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <SectionTitle>{"Status Fibromi\u00e1lgico"}</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.5rem' }}>{"Marque os sintomas que apresenta com frequ\u00eancia:"}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_FIBROMIALGIA_OPS.map(op => (
              <CheckRow key={op} label={op}
                checked={form.status_fibromialgia.includes(op)}
                onClick={() => sf('status_fibromialgia', tog(form.status_fibromialgia, op))} />
            ))}
          </div>

          <SectionTitle>Status COVID-19</SectionTitle>
          <CheckRow label="TIVE COVID-19" checked={form.teve_covid} onClick={() => sf('teve_covid', !form.teve_covid)} />
          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.6rem' }}>Vacina:</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {['VACINA PFIZER', 'VACINA JANSSEN', 'VACINA ASTRAZENECA', 'VACINA CORONAVAC', "N\u00c3O TOMEI VACINA"].map(v => (
              <CheckRow key={v} label={v}
                checked={form.vacina_covid.includes(v)}
                disabled={v !== "N\u00c3O TOMEI VACINA" && form.vacina_covid.includes("N\u00c3O TOMEI VACINA") || v === "N\u00c3O TOMEI VACINA" && form.vacina_covid.length > 0 && !form.vacina_covid.includes("N\u00c3O TOMEI VACINA")}
                onClick={() => sf('vacina_covid', tog(form.vacina_covid, v))} />
            ))}
          </div>

          <SectionTitle>{"Atividade F\u00edsica"}</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.5rem' }}>{"Se marcar SEDENT\u00c1RIO, os demais s\u00e3o desmarcados."}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {ATIVIDADES.map(at => {
              const sedMarcado = form.atividade_fisica.includes("SEDENT\u00c1RIO")
              const disabled = at !== "SEDENT\u00c1RIO" && sedMarcado
              return <CheckRow key={at} label={at} checked={form.atividade_fisica.includes(at)} disabled={disabled} onClick={() => toggleAtividade(at)} />
            })}
          </div>

          <SectionTitle>{"Cirurgia Pl\u00e1stica P\u00f3s-Bari\u00e1trica"}</SectionTitle>
          <div style={{ display:'flex', gap:'0.8rem' }}>
            {[['Sim', true], ["N\u00e3o", false]].map(([l, v]) => (
              <div key={l} onClick={() => sf('cirurgia_plastica', v)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'0.5rem', borderRadius:8, border:`1.5px solid ${form.cirurgia_plastica === v ? '#DC2626' : '#E5E7EB'}`, background: form.cirurgia_plastica === v ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', fontWeight: form.cirurgia_plastica === v ? 700 : 500, color: form.cirurgia_plastica === v ? '#7B1E1E' : '#374151', fontSize:'0.85rem' }}>
                <Radio16 active={form.cirurgia_plastica === v} />{l}
              </div>
            ))}
          </div>

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

          <SectionTitle>{"Compuls\u00f5es"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {COMPULSOES.map(c => <CheckRow key={c} label={c} checked={form.compulsoes.includes(c)} onClick={() => sf('compulsoes', tog(form.compulsoes, c))} />)}
          </div>

          <SectionTitle>Medicamentos em Uso</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {MEDICAMENTOS.map(m => <CheckRow key={m} label={m} checked={form.medicamentos.includes(m)} disabled={m === "REM\u00c9DIO PARA PRESS\u00c3O" && form.status_pressorico === "N\u00c3O SOU HIPERTENSO"} onClick={() => sf('medicamentos', tog(form.medicamentos, m))} />)}
          </div>

          <SectionTitle>Medicamentos que Afetam o Eritron</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.6rem' }}>{"Marque os que usa ou usou nos \u00faltimos 2 anos:"}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {[
              { field: 'metformina',    label: 'Metformina',           sub: "Reduz absor\u00e7\u00e3o de B12" },
              { field: 'ibp',           label: 'IBP (Omeprazol etc.)', sub: 'Reduz B12' },
              { field: 'tiroxina',      label: 'Tiroxina / T4',        sub: 'Pode causar anemia' },
              { field: 'methotrexato',  label: 'Metotrexato',          sub: 'Antagonista do folato' },
              { field: 'hivTratamento', label: 'Trat. HIV / ARV',      sub: 'Macrocitose' },
            ].map(({ field, label, sub }) => (
              <CheckRow key={field}
                label={label + " \u2014 " + sub}
                checked={!!form[field]}
                onClick={() => sf(field, !form[field])} />
            ))}
          </div>

          <SectionTitle>Medicamentos Emagrecedores</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.6rem' }}>{"Para cada medicamento, marque a situa\u00e7\u00e3o:"}</p>
          {EMAGRECEDORES.map(med => (
            <div key={med} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'0.5rem', alignItems:'center', marginBottom:'0.5rem', padding:'0.3rem 0', borderBottom:'1px solid #F3F4F6' }}>
              <span style={{ fontSize:'0.85rem', fontWeight:600, color:'#374151' }}>{med}</span>
              <div style={{ display:'flex', gap:'0.3rem' }}>
                {["J\u00c1 USEI",'ESTOU USANDO'].map(op => (
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
            {loading ? 'Salvando...' : "Avan\u00e7ar para os Exames \u2192"}
          </button>
          <button style={btnS} onClick={onFechar}>{"\u2190 Voltar"}</button>
        </div>
      </div>
    </div>
  )
}
