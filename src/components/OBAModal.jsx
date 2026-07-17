import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { classificarValor } from '../engine/obaCutoffs'
import { avaliarOBA, classificarEstadoClinico, ESTADOS_CLINICOS } from '../engine/obaEngine'
import logo from '../assets/logo.png'
import obaLogo from '../assets/oba-logo.png'
import PlayButton from './PlayButton'
import ModalFerroEV from './ModalFerroEV'
import { calcularDeficitFerroGanzoni } from '../engine/ferroProtocol'
import { avaliarPaciente, triagemEritron } from '../engine/decisionEngine'

// Imagem landscape do splash do relatório OBA — A DEFINIR (será horizontal,
// ocupando a largura do modal, parcialmente sobreposta pelo conteúdo).
// Enquanto null, o relatório abre direto (sem splash). Para ativar: importe a
// imagem e atribua aqui — o enquadramento landscape já está nos estilos abaixo.
const SPLASH_REL_IMG = null

// Imagem landscape do topo do MODAL DE CONCLUSÃO da 1ª avaliação — A DEFINIR.
// Mesmo esquema do SPLASH_REL_IMG.
const SPLASH_CONCLUSAO_IMG = null

// Dados do médico responsável (assinatura do resultado/prescrição).
const MEDICO_RESP = 'E. F. Ramos, M.D. — CRM 6302 BA | RQE 5830 · 5643 · 27847'
const WHATS_PLATAFORMA = '5571997110804'

// Apresentação visual de cada ESTADO GERAL CLÍNICO (régua do obaEngine).
// O motor devolve a sigla; aqui mora a cor/rótulo/emoji da tela.
const ESTADO_UI = {
  CRITICO:  { rotulo: "CRÍTICO",   emoji: "🔴", cor: '#991B1B', fundo: '#FEF2F2', borda: '#FCA5A5' },
  RUIM:     { rotulo: 'RUIM',       emoji: "🟠", cor: '#9A3412', fundo: '#FFF7ED', borda: '#FED7AA' },
  RAZOAVEL: { rotulo: "RAZOÁVEL", emoji: "🟡", cor: '#92400E', fundo: '#FEFCE8', borda: '#FDE68A' },
  BOM:      { rotulo: 'BOM',        emoji: "🟢", cor: '#166534', fundo: '#F0FDF4', borda: '#BBF7D0' },
  OTIMO:    { rotulo: "ÓTIMO",    emoji: "💎", cor: '#155E75', fundo: '#ECFEFF', borda: '#A5F3FC' },
}

// Cores das caixas de alerta / títulos de módulo por gravidade (níveis do motor).
// Cores por gravidade (acordado com o Estácio):
//   GRAVE = vermelho · MODERADO = laranja · ATENÇÃO (leve) = VINHO · SAUDÁVEL (normal) = verde
// fundo/borda = cor do CARD; botao = cor do BADGE; texto = cor do texto dentro do card.
// CARD:   GRAVE=pink+vermelho · MODERADO=amarelo+laranja · ATENÇÃO=cinza+vinho · SAUDÁVEL=verde
// BADGE:  GRAVE=vermelho · MODERADO=laranja · ATENÇÃO=vinho · SAUDÁVEL=verde
const NIVEL_UI = {
  grave:    { fundo: '#FCE7F3', borda: '#DC2626', texto: '#991B1B', botao: '#DC2626', rotulo: 'GRAVE' },
  moderado: { fundo: '#FEF9C3', borda: '#F97316', texto: '#9A3412', botao: '#F97316', rotulo: 'MODERADO' },
  leve:     { fundo: '#F3F4F6', borda: '#7B1E1E', texto: '#7B1E1E', botao: '#7B1E1E', rotulo: "ATENÇÃO" },
  normal:   { fundo: '#F0FDF4', borda: '#16A34A', texto: '#166534', botao: '#16A34A', rotulo: "SAUDÁVEL" },
}

const TIPOS_CIRURGIA = ['Y DE ROUX | BYPASS', 'MINI-BYPASS (OAGB)', 'FOBI-CAPELLA', 'SLEEVE', "BANDA G\u00c1STRICA AJUST\u00c1VEL", "N\u00c3O SEI"]

const ACOMPANHAMENTO_OPS = [
  "FA\u00c7O ACOMPANHAMENTO M\u00c9DICO E REPOSI\u00c7\u00d5ES",
  "FIZ ACOMPANHAMENTO MAS PAREI",
  "N\u00c3O FIZ ACOMPANHAMENTO NEM REPOSI\u00c7\u00d5ES",
  "N\u00c3O FA\u00c7O ACOMPANHAMENTO M\u00c9DICO",
]

const ESPECIALISTAS = [
  "CIRURGI\u00c3O", "CL\u00cdNICO", "HEMATOLOGISTA", "GASTROENTEROLOGISTA", "NUTR\u00d3LOGO",
  "ENDOCRINOLOGISTA", "CARDIOLOGISTA", "NEUROLOGISTA", "PSIQUIATRA", "REUMATOLOGISTA",
  "ORTOPEDISTA", "GINECOLOGISTA", "OBSTETRA", "PNEUMOLOGISTA", "NEFROLOGISTA", "UROLOGISTA",
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
  'REFLUXO GASTRO ESOFÁGICO',
  'H. PYLORI',
  'DIVERTÍCULOS',
  'VARIZES DE ESÔFAGO',
]

const STATUS_CARDIOVASCULAR_OPS = [
  'ESTOU BEM',
  'TENHO ANGINA',
  'FIZ CATETERISMO + ANGIOPLASTIA',
  'FIZ CIRURGIA | REVASCULARIZAÇÃO',
]

const STATUS_HORMONAL_OPS = [
  'HIPOTIREOIDISMO',
  'TIREOIDITE (HASHIMOTO)',
  'HIPERTIREOIDISMO',
]

// Status Ginecológico (só sexo feminino). SANGRAMENTO MENSTRUAL e CÂNCER DE MAMA
// abrem sub-opções (radio) ao serem marcados.
const STATUS_GINECOLOGICO_OPS = [
  'ENDOMETRIOSE',
  'MIOMAS | MIOMATOSE',
  'SANGRAMENTO MENSTRUAL',
  'OVÁRIOS POLICÍSTICOS',
  'CISTOS NAS MAMAS',
  'CÂNCER DE MAMA',
  'MOLA HIDATIFORME',
]
const SANGRAMENTO_MENSTRUAL_OPS = ['EXCESSIVO', 'PROLONGADO', 'EXCESSIVO E PROLONGADO']
// Fator TEMPO do sangramento. A perda de ferro é intensidade × duração × persistência ×
// frequência — o tipo sozinho (auto-avaliação) não distingue quem sangra muito há 2 meses
// de quem sangra muito há 2 anos. Quem decide a gravidade é a PERSISTÊNCIA (Dr. Ramos):
// corte em 4 meses; as faixas abaixo saíram do rascunho <3/3-6/6-12/>12 escalado por 4/6.
const SANGRAMENTO_DURACAO_OPS = ['ATÉ 7 DIAS', 'DE 8 A 10 DIAS', 'MAIS DE 10 DIAS']
const SANGRAMENTO_PERSISTENCIA_OPS = ['MENOS DE 2 MESES', 'DE 2 A 4 MESES', 'DE 4 A 8 MESES', 'MAIS DE 8 MESES']
// Intervalo entre menstruações: < 21 dias = mais ciclos por ano = mais ferro perdido.
const SANGRAMENTO_FREQUENCIA_OPS = ['MENOS DE 21 DIAS', 'DE 21 A 35 DIAS', 'MAIS DE 35 DIAS', 'IRREGULAR']

// Status Prostático (masculino, idade >= 38). SEM SINTOMAS é EXCLUSIVO (limpa as outras,
// padrão "ESTOU BEM" do cardiovascular). CÂNCER abre os tratamentos em CHECKBOX (múltiplos —
// OPERADO + RADIOTERAPIA + CURADO podem coexistir).
const STATUS_PROSTATICO_OPS = [
  'SEM SINTOMAS',
  'OK. AVALIADO POR MÉDICO',
  'HIPERPLASIA BENIGNA',
  'CÂNCER',
]
const PROSTATA_CANCER_OPS = ['EM TRATAMENTO', 'OPERADO', 'CURADO', 'RADIOTERAPIA']

const STATUS_RESPIRATORIO_OPS = [
  'NORMAL',
  'RINITE | SINUSITE',
  'TABAGISTA | DPOC',
  'ASMA | BRONCOESPASMOS',
]

const STATUS_ALERGICO_OPS = [
  'RESPIRATÓRIA',
  'DERMATITE',
  'ALIMENTAR',
  'MEDICAMENTOSA',
]

// Alergia MEDICAMENTOSA: sub-bloco do Status Alérgico (aparece ao marcar MEDICAMENTOSA).
// Lista consolidada (penicilinas/cefalosporinas incluídas). 'OUTRA' abre campo livre.
const ALERGIA_MEDICAMENTOSA_OPS = ['PENICILINAS', 'CEFALOSPORINAS', 'DIPIRONA', 'ANTI-INFLAMATÓRIOS', 'ASPIRINA', 'OUTRA']

// Alergia ALIMENTAR: sub-bloco do Status Alérgico (aparece ao marcar ALIMENTAR). 'OUTRA' abre campo livre.
const ALERGIAS_ALIMENTARES_OPS = ['OVO', 'CRUSTÁCEOS (CAMARÃO E OUTROS)', 'LEITE DE VACA', 'LEITE (TODOS)', 'CHOCOLATE', 'AMENDOIM', 'OUTRA']

const STATUS_ARTICULAR_OPS = ['ARTRITE', 'ARTROSE', 'TENDINITE', 'PROBLEMAS DE COLUNA']

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

// Hábitos sociais / estilo de vida. Valor armazenado no MASCULINO (DOADOR); a exibição
// vira DOADORA p/ mulher via gz(). Críticas no relatório: buildModHabitos (obaEngine).
const HABITOS_SOCIAIS_OPS = [
  'SOU DOADOR DE SANGUE',
  'SOU DOADOR DE MEDULA ÓSSEA',
  'AJUDO UM PROJETO SOCIAL',
  'TENHO CACHORRO E PASSEIO COM ELE',
  'TENHO GATO',
  'TENHO PLANTAS EM CASA',
  'MORO EM CASA',
  'MORO EM APARTAMENTO',
  'FAÇO ATIVIDADES AO AR LIVRE',
  'TOMO SOL HABITUALMENTE',
  'COSTUMO IR A PRAIA',
  'TENHO UM HOBBY',
]

// Infecções crônicas (checkbox) — algumas abrem sub-opções ao serem marcadas.
const INFECCOES_CRONICAS_OPS = [
  'HEPATITE B',
  'HEPATITE C',
  'HIV',
  'HERPES SIMPLES',
  'HERPES-ZÓSTER',
  'DOENÇA DE LYME (BORRELIOSE)',
  'HPV',
  'PAPILOMATOSE DO LARINGE',
  'MOLUSCO CONTAGIOSO',
  'EPSTEIN-BARR',
  'HTLV I/II',
]
const HERPES_ZOSTER_OPS = ['MAIS DE UM EPISÓDIO', 'USEI ACICLOVIR ORAL', 'TOMEI VACINA']
const HPV_OPS = ['DOENÇA ATIVA', 'TOMEI VACINA | ESTOU MELHOR', 'RESOLVIDO']

const COMPULSOES = [
  "DOCES", "COMIDA", "GELO", "\u00c1LCOOL", "JOGO", "COMPRAS", "TRABALHO", "CIGARRO / TABACO", "CANNABIS", "OUTRA"
]

const MEDICAMENTOS = [
  "FERRO ORAL", "FERRO INJET\u00c1VEL (EV/IM)", "VIT. B12 INTRAMUSCULAR", "VIT. B12 SUBLINGUAL", "POLIVITAM\u00cdNICO ORAL",
  "ANTICOAGULANTE",
  "ANTIDEPRESSIVO", "REM\u00c9DIO PARA DORMIR", "LAXANTES", "REM\u00c9DIO PARA PRESS\u00c3O",
  "REM\u00c9DIO PARA DORES", "REM\u00c9DIO PARA BAIXAR A GLICEMIA", "REM\u00c9DIO PARA COLESTEROL", "REM\u00c9DIO PARA TRIGLIC\u00c9RIDES",
  "REM\u00c9DIO PARA TIRE\u00d3IDE",
  "TOPIRAMATO", "FENTERMINA", "NALTREXONA", "BUPROPIONA", "ORLISTAT (XENICAL)",
  "DOMPERIDONA (MOTILIUM)", "BROMOPRIDA",
  "PREGABALINA", "GABAPENTINA", "CANNABIS MEDICINAL",
]

const EMAGRECEDORES = ['Ozempic', 'Rybelsus', 'Wegovy', 'Mounjaro', 'Saxenda', 'Victoza', 'Trulicity', 'Xultophi']

const STATUS_INTESTINAL_OPS = [
  "INTESTINO FUNCIONA BEM",
  "OBSTIPA\u00c7\u00c3O CR\u00d4NICA (PRIS\u00c3O DE VENTRE)",
  "INTESTINO IRRIT\u00c1VEL (DIARREIA FREQUENTE)",
]

const INTOLERANCIAS_OPS = ['LACTOSE', 'GL\u00daTEN (N\u00c3O-CEL\u00cdACA)', 'CASE\u00cdNA', 'LEITE | DERIVADOS', 'CARNE (ALFA-GAL)']

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
  "FADIGA",
  "HIPERACUSIA",
  "EM USO DE GABAPENTINA", "EM USO DE PREGABALINA", "EM USO DE CANNABIS MEDICINAL",
]

// Sublabel (linha menor) de algumas opções do Status Fibromiálgico.
const FIBRO_SUBLABEL = { 'HIPERACUSIA': 'SENSIBILIDADE AUMENTADA A SONS E RUÍDOS' }

// Marcadores "EM USO DE ..." no fibromiálgico que espelham em MEDICAMENTOS EM USO
// (marcar no fibro marca tambem o medicamento; direção só fibro -> medicamentos).
const FIBRO_MED_SYNC = {
  'EM USO DE GABAPENTINA': 'GABAPENTINA',
  'EM USO DE PREGABALINA': 'PREGABALINA',
  'EM USO DE CANNABIS MEDICINAL': 'CANNABIS MEDICINAL',
}

// Tipos de canabinoide (sub-bloco quando "EM USO DE CANNABIS MEDICINAL" é marcado).
// Uso de negócio (parceria com fornecedores) — NÃO vai ao relatório clínico.
const CANABINOIDES_OPS = ['CBD', 'CBD Full Spectrum', 'CBD + THC', 'THC', 'DELTA-8', 'DELTA-9']

// QUEIXA PRINCIPAL + 3 SECUNDÁRIAS — queixas LEVES (não-emergenciais) mais comuns
// por FASE pós-cirúrgica. NÃO entram aqui quadros de emergência (obstrução, sangramento
// etc.), que exigem pronto atendimento e não uma anamnese de acompanhamento. As queixas
// são registradas (no form_snapshot dentro de relatorio_oba) p/ acompanhar a evolução:
// em avaliações futuras o OBA compara se a orientação/teleconsulta fez a queixa
// melhorar/desaparecer. Fases: precoce (≤6m) · intermediária (>6m a 36m) · tardia (>36m).
const QUEIXAS_POR_FASE = {
  precoce: [
    'NÁUSEAS OU VÔMITOS FREQUENTES',
    'DIFICULDADE PARA ENGOLIR',
    'SACIEDADE PRECOCE / EMPACHAMENTO',
    'MAL-ESTAR APÓS COMER DOCE (DUMPING)',
    'AZIA / REFLUXO',
    'DOR NA BOCA DO ESTÔMAGO',
    'PRISÃO DE VENTRE (OBSTIPAÇÃO)',
    'CANSAÇO / FADIGA',
    'QUEDA DE CABELO',
    'DIFICULDADE DE BEBER LÍQUIDOS',
    'DEPRESSÃO',
    'INSÔNIA',
    'IDEAÇÃO SUICIDA',
  ],
  intermediaria: [
    'MAL-ESTAR APÓS COMER DOCE (DUMPING)',
    'TREMOR / SUOR / TONTURA APÓS COMER',
    'AZIA / REFLUXO PERSISTENTE',
    'DIARREIA (INTESTINO IRRITÁVEL)',
    'PRISÃO DE VENTRE (OBSTIPAÇÃO)',
    'CANSAÇO / FADIGA',
    'QUEDA DE CABELO',
    'FORMIGAMENTO / DORMÊNCIA',
    'DORES NOS OSSOS OU ARTICULAÇÕES',
    'CÓLICAS / DOR ABDOMINAL RECORRENTE',
    'DEPRESSÃO',
    'INSÔNIA',
    'IDEAÇÃO SUICIDA',
  ],
  tardia: [
    'CANSAÇO / FADIGA',
    'QUEDA DE CABELO',
    'FORMIGAMENTO / DORMÊNCIA',
    'DORES NOS OSSOS',
    'DIARREIA (INTESTINO IRRITÁVEL)',
    'AZIA / REFLUXO',
    'MAL-ESTAR APÓS COMER DOCE (DUMPING)',
    'REGANHO DE PESO',
    'UNHAS FRACAS / PELE SECA',
    'PROBLEMAS DE MEMÓRIA OU CONCENTRAÇÃO',
    'DEPRESSÃO',
    'INSÔNIA',
    'IDEAÇÃO SUICIDA',
  ],
}

// Texto de contexto exibido no topo da seção, conforme a fase pós-operatória.
const FASE_QUEIXA_LABEL = {
  precoce: 'Fase inicial (até 6 meses): predominam sintomas digestivos da adaptação.',
  intermediaria: 'Fase intermediária (6 meses a 3 anos): atenção a dumping, hipoglicemia e sinais de carência.',
  tardia: 'Fase tardia (mais de 3 anos): atenção a carências crônicas, ossos e reganho de peso.',
}

// Estilo de linha selecionável (mesmo idioma visual do CheckRow/RadioGroup).
function queixaRowStyle(active) {
  return {
    display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem',
    borderRadius:8, border:`1.5px solid ${active ? '#DC2626' : '#E5E7EB'}`,
    background: active ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', marginBottom:'0.4rem',
    fontSize:'0.72rem', fontWeight: active ? 700 : 500, color: active ? '#7B1E1E' : '#374151',
  }
}

// Mapeamento QUEIXA intestinal -> STATUS INTESTINAL (+ FIBROMIÁLGICO p/ obstipação).
// Marcar a queixa PROPAGA para os status; direção só queixa -> status (os radios do
// Status Intestinal seguem disponíveis p/ marcação independente). O POPUP da pesquisa
// dispara sozinho: o gatilho já observa status_intestinal (que aqui passa a ser setado),
// então a pesquisa aparece no PRIMEIRO lugar em que a obstipação for marcada.
const QUEIXA_OBSTIPACAO = 'PRISÃO DE VENTRE (OBSTIPAÇÃO)'
const QUEIXA_DIARREIA   = 'DIARREIA (INTESTINO IRRITÁVEL)'
const INTESTINAL_OBSTIPACAO = STATUS_INTESTINAL_OPS[1]   // "OBSTIPAÇÃO CRÔNICA (PRISÃO DE VENTRE)"
const INTESTINAL_IRRITAVEL  = STATUS_INTESTINAL_OPS[2]   // "INTESTINO IRRITÁVEL (DIARREIA FREQUENTE)"
const FIBRO_OBSTIPACAO      = STATUS_FIBROMIALGIA_OPS.find(o => o.indexOf('OBSTIPA') === 0)

// Aplica a propagação da queixa intestinal sobre um estado 'p' do form (dentro de setForm).
function aplicarSyncIntestinal(p, queixa) {
  if (queixa === QUEIXA_OBSTIPACAO) {
    const fibro = new Set(p.status_fibromialgia || [])
    if (FIBRO_OBSTIPACAO) fibro.add(FIBRO_OBSTIPACAO)
    return { ...p, status_intestinal: INTESTINAL_OBSTIPACAO, status_fibromialgia: Array.from(fibro) }
  }
  if (queixa === QUEIXA_DIARREIA) {
    // Se estava em obstipação e passa p/ intestino irritável, desfaz a obstipação no
    // fibromiálgico (paridade com o radio manual: eraObst && !ehObst). Preserva marcação
    // independente (só remove quando o status ANTERIOR era obstipação).
    const saiuDeObst = p.status_intestinal === INTESTINAL_OBSTIPACAO
    const fibro = (saiuDeObst && FIBRO_OBSTIPACAO)
      ? (p.status_fibromialgia || []).filter(x => x !== FIBRO_OBSTIPACAO)
      : (p.status_fibromialgia || [])
    return { ...p, status_intestinal: INTESTINAL_IRRITAVEL, status_fibromialgia: fibro }
  }
  return p
}

// BUG #2 corrigido: removidos os duplicados antigos (hdl, ldl, vldl,
// lipoproteina_a, apolipoproteina_b, colesterol_total v1, triglicerides v1)
// Mantida a versao 2 alinhada com buildModLipidico no obaEngine.js
const EXAMES_BASE = [
  { key: 'leucocitos',     label: "Leuc\u00f3citos (Total)",       unit: '/uL',    ref: "4.000\u201311.000", hint: "Sem ponto ou v\u00edrgula. Ex: 7500" },
  { key: 'neutrofilos',    label: "Neutr\u00f3filos Segmentados",  unit: '%',      ref: "40\u201370%" },
  { key: 'neutrofilos_ul', label: "Neutr\u00f3filos (calculado)",  unit: '/uL',    ref: "1.800\u20137.700", readOnly: true },
  { key: 'plaquetas',      label: 'Plaquetas',                unit: "x1000/\u00b5L", ref: "150\u2013400", hint: 'Ex: 250 = 250.000/\u00b5L' },
  { key: 'ferritina_oba',  label: 'Ferritina',                unit: 'ng/mL',  ref: "H: 24\u2013300 / F: 25\u2013150" },
  { key: 'vitamina_b12',   label: 'Vitamina B12',             unit: 'pg/mL',  ref: "200\u2013900" },
  { key: 'vitamina_d',     label: 'Vitamina D', sublabel: '25-OH', unit: 'ng/mL',  ref: "30\u2013100 (bari: >30)" },
  { key: 'tsh',            label: 'TSH',                      unit: 'mUI/L',  ref: "0,4\u20134,5" },
  { key: 't4_livre',       label: 'T4 Livre',                 unit: 'ng/dL',  ref: "0,7\u20131,8" },
  { key: 'hb_glicada',     label: 'Hb Glicada',               unit: '%',      ref: '<5,7%' },
  { key: 'glicemia',       label: 'Glicemia (jejum)',          unit: 'mg/dL',  ref: "70\u201399" },
  { key: 'insulina',       label: 'Insulina (jejum)',          unit: "\u00b5UI/mL", ref: "2\u201315" },
  { key: 'ast',            label: 'AST (TGO)',                 unit: 'U/L',    ref: 'H: <40 / F: <32' },
  { key: 'alt',            label: 'ALT (TGP)',                 unit: 'U/L',    ref: 'H: <56 / F: <35' },
  { key: 'gama_gt',        label: 'Gama-GT',                  unit: 'U/L',    ref: 'H: <61 / F: <36' },
  { key: 'ureia',          label: "Ur\u00e9ia",                     unit: 'mg/dL',  ref: "15\u201340" },
  { key: 'creatinina',     label: 'Creatinina',               unit: 'mg/dL',  ref: "H: 0,7\u20131,2 / F: 0,5\u20131,0" },
  { key: 'acido_urico',    label: "\u00c1cido \u00darico",              unit: 'mg/dL',  ref: "H: 3,4\u20137,0 / F: 2,4\u20136,0" },
  { key: 'd_dimero',       label: "D-D\u00edmero",                 unit: 'ng/mL FEU', ref: "<500" },
  { key: 'folatos',        label: "\u00c1cido F\u00f3lico (folato)",    unit: 'ng/mL',  ref: "4,0\u201320,0" },
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
  { key: 'tiamina',        label: 'Vitamina B1', sublabel: '(Tiamina)', unit: 'nmol/L', ref: "70\u2013180" },
  { key: 'selenio',        label: "Sel\u00eanio",                   unit: "\u00b5g/L",   ref: "63\u2013160" },
  { key: 'vitamina_c',     label: 'Vitamina C',                unit: 'mg/dL',  ref: "0,4\u20132,0" },
  { key: 'vitamina_k',     label: 'Vitamina K',                unit: 'ng/mL',  ref: "0,2\u20133,2" },
  { key: 'niacina',        label: 'Vitamina B3', sublabel: '(Niacina)', unit: "\u00b5g/mL",  ref: "0,5\u20138,9" },
  { key: 'testosterona',   label: 'Testosterona Total',        unit: 'ng/dL',  ref: "H: 300\u20131.000 / F: 15\u201370" },
  { key: 'prolactina',     label: 'Prolactina',                unit: 'ng/mL',  ref: "H: <15 / F: <25" },
  { key: 'ige_total',      label: 'IgE Total',                 unit: 'UI/mL',  ref: "<100" },
]

// Idade >= 45 (ambos os sexos): proteínas + globulina calculada (A/G).
const EXAMES_45 = [
  { key: 'proteina_total', label: "Proteína Total", unit: 'g/dL', ref: "6,0–8,0" },
  { key: 'albumina',       label: 'Albumina',          unit: 'g/dL', ref: "3,5–5,2" },
  { key: 'globulina',      label: 'Globulina (calc)',  unit: 'g/dL', ref: "2,0–3,5", readOnly: true },
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

// Gêneriza só o TEXTO exibido (o valor armazenado/lido pelo motor fica masculino).
function gz(texto, isFem) {
  if (!isFem || !texto) return texto
  return String(texto)
    .replace(/HIPERTENSO/g, 'HIPERTENSA').replace(/CONTROLADO/g, 'CONTROLADA')
    .replace(/DIABÉTICO/g, 'DIABÉTICA').replace(/CURADO/g, 'CURADA')
    .replace(/SEDENTÁRIO/g, 'SEDENTÁRIA')
    .replace(/DOADOR\b/g, 'DOADORA')
}

function RadioGroup({ options, value, onChange, disabledOptions = [], cols = 1, mapLabel = null }) {
  const items = options.map(op => {
    const disabled = disabledOptions.includes(op)
    // Clicar na opção JÁ selecionada DESMARCA (volta ao vazio ''). Radio HTML não
    // permite desmarcar; aqui o paciente precisa poder LIMPAR uma resposta (ex.: marcou
    // por engano um item que abre sub-itens). Passa '' (sentinela de "não respondido",
    // igual ao valor inicial de todos os campos de radio) — nunca null, p/ não quebrar
    // leituras com .includes()/.indexOf() e ser compatível com handlers `=== v ? '' : v`.
    return (
      <div key={op} onClick={() => !disabled && onChange(value === op ? '' : op)} style={{
        display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem',
        borderRadius:8, border:`1.5px solid ${value === op ? '#DC2626' : '#E5E7EB'}`,
        background: disabled ? '#F3F4F6' : value === op ? '#FEF2F2' : '#FAFAFA',
        cursor: disabled ? 'not-allowed' : 'pointer', marginBottom: cols > 1 ? 0 : '0.4rem', opacity: disabled ? 0.45 : 1,
        fontSize:'0.72rem', fontWeight: value === op ? 700 : 500, color: disabled ? '#9CA3AF' : value === op ? '#7B1E1E' : '#374151',
      }}>
        <Radio16 active={value === op} />{mapLabel ? mapLabel(op) : op}
      </div>
    )
  })
  if (cols > 1) return <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:'0.4rem' }}>{items}</div>
  return items
}

function CheckRow({ label, checked, onClick, disabled }) {
  return (
    <div onClick={() => !disabled && onClick()} style={{
      display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem',
      borderRadius:8, border:`1.5px solid ${checked ? '#DC2626' : '#E5E7EB'}`,
      background: disabled ? '#F9FAFB' : checked ? '#FEF2F2' : '#FAFAFA',
      cursor: disabled ? 'not-allowed' : 'pointer', marginBottom:'0.4rem',
      fontSize:'0.72rem', fontWeight: checked ? 700 : 500,
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

// Seções onde cabe o checkbox "não tenho certeza" (exigem conhecimento médico p/
// responder). O slug é a chave estável guardada em form.duvidas; o rótulo é o texto
// exibido no relatório. NÃO muda o nível clínico — só marca o retrato como provisório.
export const DUVIDA_SECOES = {
  infeccoes:      'Infecções Crônicas',
  endocrino:      'Status Endócrino / Hormonal',
  endoscopico:    'Status Endoscópico',
  vascular:       'Status Vascular',
  cardiovascular: 'Status Cardiovascular',
  osseo:          'Status Ósseo | Articular',
  neurologico:    'Status Neurológico',
  fibromialgico:  'Status Fibromiálgico | ME/CFS',
  exames:         'Exames laboratoriais',
}

// Checkbox discreto de "não tenho certeza, vou precisar de ajuda médica".
function DuvidaCheck({ secao, duvidas, onToggle }) {
  const on = (duvidas || []).includes(secao)
  return (
    <div onClick={() => onToggle(secao)} style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', marginTop:'0.55rem', marginBottom:'0.2rem', cursor:'pointer', userSelect:'none' }}>
      <input type="checkbox" readOnly checked={on} style={{ width:14, height:14, marginTop:'0.1rem', flexShrink:0, accentColor:'#7B1E1E' }} />
      <span style={{ fontSize:'0.68rem', fontStyle:'italic', lineHeight:1.35, fontWeight: on ? 700 : 500, color:'#7B1E1E' }}>{"Não tenho muita certeza nessa resposta, vou precisar de ajuda médica."}</span>
    </div>
  )
}

function calcDias(dataStr) {
  if (!dataStr) return null
  const d = new Date(dataStr)
  if (isNaN(d)) return null
  const diff = Math.floor((new Date() - d) / 86400000)
  return diff >= 0 ? diff : null
}

// Escolhe o Valor de Referência conforme o sexo. Aceita formatos como
// "H: 24–300 / F: 25–150", "M ≥40 / F ≥50", "H: <40 / F: <32". Sem separador
// de gênero ("/"), devolve o ref inteiro. Remove o prefixo H/M/F do lado escolhido.
function refPorSexo(ref, isFem) {
  if (!ref) return ''
  const partes = String(ref).split('/')
  if (partes.length === 2 && /[HMF]/i.test(partes[0])) {
    const escolhido = (isFem ? partes[1] : partes[0]).trim()
    return escolhido.replace(/^[HMF]\s*:?\s*/i, '').trim()
  }
  return ref
}

// Categoriza uma recomendação (string do engine) num dos grupos de RECOMENDAÇÕES.
// Heurística por palavra-chave; default = laboratório. Ordem importa.
function categoriaRecomendacao(item) {
  const s = String(item).toUpperCase()
  // SIBO + MAPA agora caem juntos em "OUTROS RECURSOS DIAGNÓSTICOS".
  if (/PRESS[ÃA]O ARTERIAL|MAPA \||SIBO|GORDURA FECAL|INTOLER[ÂA]NCIA [ÀA] LACTOSE|CALPROTECTINA|INDICAN|ESTEATORREIA|SUPERCRESCIMENTO/.test(s)) return 'outros'
  if (/COLONOSCOP|ENDOSCOPIA DIGESTIVA/.test(s)) return 'endoscopia'
  if (/ULTRASSON|ECOGRAFIA|DENSITOMETR|TOMOGRAFIA|RESSON|DOPPLER/.test(s)) return 'bioimagem'
  if (/^AVALIA[ÇC][ÃA]O|PR[ÉE]-NATAL|POLISSONOGRAFIA/.test(s)) return 'avaliacao'
  return 'laboratorio'
}

// Ordem + estilo dos cards de RECOMENDAÇÕES.
const CATS_RECOMENDACAO = [
  { key:'laboratorio', titulo:'EXAMES LABORATORIAIS',                          fundo:'#F0F9FF', borda:'#BAE6FD', texto:'#0369A1' },
  { key:'avaliacao',   titulo:'AVALIAÇÕES MÉDICAS',                            fundo:'#F5F3FF', borda:'#DDD6FE', texto:'#6D28D9' },
  { key:'bioimagem',   titulo:'EXAMES DE BIOIMAGEM',                           fundo:'#ECFEFF', borda:'#A5F3FC', texto:'#155E75' },
  { key:'endoscopia',  titulo:'EXAMES ENDOSCÓPICOS',                           fundo:'#FFF7ED', borda:'#FED7AA', texto:'#9A3412' },
  { key:'outros',      titulo:'OUTROS RECURSOS DIAGNÓSTICOS',                  fundo:'#FEFCE8', borda:'#FDE68A', texto:'#92400E' },
]

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
  'd_dimero': { min:0, max:50000 },
  'ige_total': { min:0, max:50000 },
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

// Sub-bloco das infecções crônicas (aparece ao marcar a infecção).
const SUB_INFEC_BOX = { marginTop:'0.4rem', marginBottom:'0.5rem', padding:'0.5rem 0.7rem', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8 }
const SUB_INFEC_TIT = { fontSize:'0.72rem', fontWeight:800, color:'#334155', margin:'0 0 0.4rem', textTransform:'uppercase', letterSpacing:'0.3px' }
const inp = { width:'100%', border:'1.5px solid #E5E7EB', borderRadius:8, padding:'0.65rem 0.9rem', fontSize:'0.92rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
// Variante AMARELA (campos do fluxo seamless).
const inpA = { ...inp, background:'#FEFCE8', border:'1.5px solid #FACC15' }
// no-op: o bloqueio do wheel-valor é feito por um listener global (useEffect),
// que SÓ atua sobre o campo number focado — sem travar a rolagem da página.
const noWheel = () => {}
const btnP = { width:'100%', background:'#7B1E1E', color:'white', border:'none', borderRadius:10, padding:'0.9rem', fontSize:'1rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginTop:'1.5rem' }
const btnS = { width:'100%', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:10, padding:'0.7rem', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginTop:'0.5rem' }
const OV = { position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.95)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'0.5rem 1rem 1.5rem', boxSizing:'border-box' }
const CD = { background:'white', borderRadius:20, width:'100%', maxWidth:800, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', marginBottom:'2rem', boxSizing:'border-box' }
const HD = { background:'linear-gradient(135deg, #6B7280, #4B5563)', padding:'1.5rem', borderRadius:'20px 20px 0 0', display:'flex', alignItems:'center', gap:'1rem' }


export default function OBAModal({ sexo, cpf, nome, dataNascimento, idade, examesRedFairy, dadosRedFairy, resultadoEritron, onConcluir, onFechar, anamneseAnterior = null, coletarHemograma = false, modoMedico = false, modoRevisao = false }) {
  // FOLLOW-UP: avaliação de RETORNO de um bariátrico que já fez o baseline.
  // anamneseAnterior = última linha de oba_anamnese. Nesse modo, os campos
  // IMUTÁVEIS (data/tipo/indicação da cirurgia, peso antes, altura) são
  // pré-preenchidos e ESCONDIDOS — o paciente só entra o que muda.
  const modoFollowUp = !!anamneseAnterior
  // PERSISTÊNCIA DO PROGRESSO — o paciente NÃO pode perder o que marcou se sair
  // temporariamente da aba ou recarregar. Snapshot em localStorage por CPF,
  // restaurado no mount; limpo só ao CONCLUIR (ao fechar mantemos p/ retomar).
  const STORAGE_KEY = 'oba_progresso_' + (modoMedico ? 'med_' : '') + (modoRevisao ? 'rev_' : '') + String(cpf || 'anon').replace(/\D/g, '')
  const salvo = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch (e) { return null } })()
  const limparProgresso = () => { try { localStorage.removeItem(STORAGE_KEY) } catch (e) {} }

  //  States: declarados PRIMEIRO, antes de qualquer useEffect que os use
  // BUG #4 e #5 corrigidos: ordem dos hooks. form, exames, dataExames,
  // aberrantesOBA, alertaPeso agora vem antes dos useEffects que os mexem.
  const [etapa, setEtapa] = useState(salvo?.etapa || ((coletarHemograma && modoMedico) ? 'eritron' : 'anamnese'))
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [anamneseSalva, setAnamneseSalva] = useState(null)
  const [alertaPeso, setAlertaPeso] = useState(null)
  const [dataExames, setDataExames] = useState(salvo?.dataExames || '')
  // Data dos exames em 3 caixas dd/mm/aaaa (substitui o <input type=date> com calendário).
  // dataExames (ISO) continua sendo a fonte usada por diasExames/save; é composta destas 3.
  const _edSalvo = String(salvo?.dataExames || '').split('-')  // [aaaa, mm, dd]
  const [exDia, setExDia] = useState(_edSalvo[2] || '')
  const [exMes, setExMes] = useState(_edSalvo[1] || '')
  const [exAno, setExAno] = useState(_edSalvo[0] || '')
  const [aberrantesOBA, setAberrantesOBA] = useState({})
  // Etapa ERITRON (médico/ícone): popup com o resultado do eritron após lançar Hb/VCM/RDW.
  const [showEritronPopup, setShowEritronPopup] = useState(false)
  const [eritronPopup, setEritronPopup] = useState(null)
  // Etapa 'relatorio' (BASELINE): saída do avaliarOBA + estado clínico calculado.
  const [relatorio, setRelatorio] = useState(salvo?.relatorio || null)
  const [estadoClinico, setEstadoClinico] = useState(salvo?.estadoClinico || null)
  // Splash 4DOC do relatório: imagem nítida por 3s; depois vira fundo (hover).
  const [splashRel, setSplashRel] = useState(false)
  const [bgRel, setBgRel] = useState(false)
  // Teleconsulta (CTA quando estado RUIM/CRÍTICO). valorTeleconsulta vem da config.
  const [valorTeleconsulta, setValorTeleconsulta] = useState(null)
  const [querTeleconsulta, setQuerTeleconsulta] = useState(salvo?.querTeleconsulta || false)
  // Modal de conclusão da 1ª avaliação (etapa 'conclusao').
  const [splashConcl, setSplashConcl] = useState(false)
  const [bgConcl, setBgConcl] = useState(false)
  const [valorPrescricao, setValorPrescricao] = useState(null)  // config.valor_documento_medico
  const [querPrescricao, setQuerPrescricao] = useState(false)
  const [querPrescricaoB12, setQuerPrescricaoB12] = useState(false)  // protocolo B12/folato (macrocitose)
  const [querResultado, setQuerResultado] = useState(false)
  const [querFerroEV, setQuerFerroEV] = useState(false)  // 2ª oferta do ferro EV na conclusão
  const [querCanabinoide, setQuerCanabinoide] = useState(false)  // teleconsulta c/ prescritor (>3 sintomas fibro)
  const [querTeleDuvida, setQuerTeleDuvida] = useState(false)  // teleconsulta p/ esclarecer os pontos em dúvida
  // Protocolo de reposição de FERRO ENDOVENOSO (Ganzoni) — modal compartilhado.
  const [showFerroEV, setShowFerroEV] = useState(false)
  // Popup da PESQUISA (tratamento simbiótico p/ obstipação/fibromialgia).
  const [showPesquisa, setShowPesquisa] = useState(false)
  // Popup da 1ª dúvida ("não tenho certeza"). Não repete se o progresso já vinha com dúvidas.
  const [showDuvidaPopup, setShowDuvidaPopup] = useState(false)
  const duvidaPopupVisto = useRef((salvo?.form?.duvidas || []).length > 0)
  const [pesquisaAceita, setPesquisaAceita] = useState(false)
  const [pesquisaEnviado, setPesquisaEnviado] = useState(false)

  const [form, setForm] = useState(() => {
   const def = {
    cirurgia_dia: '', cirurgia_mes: '', cirurgia_ano: '',
    peso_antes: '', peso_minimo_pos: '', peso_atual: '',
    altura: '',
    // Queixa principal (string) + até 3 secundárias (array) — por fase pós-op.
    queixa_principal: '', queixas_secundarias: [],
    ganhou_peso_apos: false, fez_plasma_argonio: false, semEspecialista: false,
    metformina: false, ibp: false, tiroxina: false, methotrexato: false, hivTratamento: false,
    status_intestinal: '', status_fibromialgia: [], calprotectina: '', indican: '',
    // Sorologia ANTI-H.PYLORI (qualitativo): '' | 'REAGENTE' | 'NÃO REAGENTE'
    antiHp_igg: '', antiHp_igm: '',
    gestacoes_previas: '', abortamentos_espontaneos: null, abortamentos_numero: '',
    indicacao_cirurgia: '',
    tipo_cirurgia: '',
    acompanhamento: '', especialistas: [],
    status_gestacional: '', semanas_gestacao: '', temExamesMesmaData: false,
    status_glicemico: '', dumping: false, status_hormonal: [], status_pressorico: '', status_endoscopico: [], status_neurologico: [],
    // Status ginecológico (só feminino) + sub-estados (sangramento / câncer de mama).
    status_ginecologico: [], sangramento_menstrual_tipo: '', cancer_mama_status: '',
    sangramento_duracao: '', sangramento_persistencia: '', sangramento_frequencia: '',
    status_prostatico: [], prostata_cancer_tratamentos: [],
    status_respiratorio: [], status_alergico: [], alergia_medicamentosa: [], alergia_outra_texto: '',
    trombose: null, investigou_trombose: false,
    usou_anticoagulante: false, usa_anticoagulante: false,
    varizes: null, varizes_grau: '',
    varizes_esofago: false, operou_varizes_esofago: false,
    // Status Vascular ARTERIAL (round 3)
    doppler_carotidas: '', estenose_maxima: '', doenca_arterial_periferica: null,
    // Status Cardiovascular (round 3)
    status_cardiovascular: [], ecg: '', ecg_marcapasso: false, ecg_arritmia: false,
    ecocardiograma: '', fracao_ejecao: '', angiotomografia_coronariana: false, score_calcio: '',
    status_dental: '', status_osseo: '', status_articular: [],
    // Detalhe livre de dores (aparece só se marcou dor óssea/articular nas queixas).
    dores_osseas_detalhe: '',
    // Intolerâncias alimentares (múltipla escolha — seção após o Status Intestinal).
    intolerancias_alimentares: [],
    // Alergia ALIMENTAR detalhada (sub-bloco do Status Alérgico > ALIMENTAR). "OUTRA" abre
    // campo livre. A alergia a medicamentos reusa alergia_medicamentosa/alergia_outra_texto.
    alergias_alimentares: [], alergias_alimentares_outra: '',
    // FAN (Fator Antinuclear / anticorpo anti-célula): '' | 'REAGENTE' | 'NÃO REAGENTE';
    // se REAGENTE, fan_titulo guarda o título ('1/80'…'1/640+'). Crítica no engine: depois.
    fan: '', fan_titulo: '',
    teve_covid: false, vacina_covid: [],
    atividade_fisica: [], cirurgia_plastica: null,
    meta_peso: '', meta_kg: '', projetos_vida: [], habitos_sociais: [],
    compulsoes: [], medicamentos: [], emagrecedores: {},
    // Tipos de canabinoide em uso (sub-bloco do fibromiálgico; uso de negócio).
    cannabinoides_tipos: [],
    // Infecções crônicas (checkbox) + sub-estados por infecção.
    infeccoes_cronicas: [],
    hepb_status: '', hepc_status: '', hiv_tratamento: false,
    herpes_simples_aciclovir: false, herpes_zoster: [],
    borreliose_status: '', hpv_estado: [], ebv_status: '', htlv_ativa: false,
    // Seções que o paciente marcou como "não tenho certeza" (slugs de DUVIDA_SECOES).
    duvidas: [],
    // Texto livre: condição de saúde não abordada pela anamnese. Vai p/ o relatório num
    // card recomendando teleconsulta (o sistema é hardcoded e não classifica texto livre).
    outra_condicao: '',
   }
   // Retomada de progresso (localStorage) tem prioridade.
   if (salvo?.form) return { ...def, ...salvo.form }
   // Follow-up: pré-preenche da avaliação anterior.
   if (anamneseAnterior) {
     const A = anamneseAnterior
     // Imutáveis: sempre das colunas do banco (fonte canônica).
     const imutaveis = {
       cirurgia_dia: A.cirurgia_dia != null ? String(A.cirurgia_dia) : '',
       cirurgia_mes: A.cirurgia_mes != null ? String(A.cirurgia_mes) : '',
       cirurgia_ano: A.cirurgia_ano != null ? String(A.cirurgia_ano) : '',
       tipo_cirurgia: A.tipo_cirurgia || '',
       indicacao_cirurgia: A.indicacao_cirurgia || '',
       peso_antes: A.peso_antes != null ? String(A.peso_antes) : '',
       altura: A.altura != null ? String(A.altura) : '',
     }
     // Se a avaliação anterior salvou o snapshot do form, carregamos TUDO como
     // rascunho editável (status, condições, medicamentos…) e só zeramos o PESO
     // ATUAL (medição nova). Sem snapshot (baselines antigos): só os imutáveis.
     const snap = A.relatorio_oba?.form_snapshot
     if (snap && typeof snap === 'object') {
       // REVISÃO MÉDICA (modoRevisao): o médico corrige a MESMA anamnese — restaura
       // TUDO como está (queixas, dúvidas, peso), para ele ver exatamente o que o
       // paciente respondeu e ajustar ponto a ponto (inclusive resolver as dúvidas).
       if (modoRevisao) return { ...def, ...snap, ...imutaveis }
       // FOLLOW-UP (novo ciclo): as QUEIXAS são perguntadas DE NOVO a cada ciclo (não
       // pré-preenche): o valor anterior fica no relatorio_oba da linha anterior, p/ a
       // comparação de evolução. As dúvidas também zeram (novo retrato).
       return { ...def, ...snap, ...imutaveis, peso_atual: '', queixa_principal: '', queixas_secundarias: [], dores_osseas_detalhe: '', duvidas: [], outra_condicao: '' }
     }
     return { ...def, ...imutaveis }
   }
   return def
  })

  // Detecção robusta de sexo feminino: aceita 'F', 'f', 'FEMININO', 'feminino'.
  // Qualquer outro valor (M, masculino, vazio) é tratado como NÃO-feminino → some
  // com os campos gestacionais (gestações prévias e status gestacional).
  const isFem = /^f/i.test(String(sexo || '').trim())
  const saudacao = isFem ? 'Bem-vinda' : 'Bem-vindo'
  const idadeNum = parseInt(idade) || 0
  // Data de nascimento (ISO ou yyyy-mm-dd) → dd/mm/aaaa para exibição.
  const dataNascFmt = (() => {
    const s = String(dataNascimento || '').slice(0, 10)
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (s || '—')
  })()
  const cpfFmt = (() => {
    const d = String(cpf || '').replace(/\D/g, '')
    return d.length === 11 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : (cpf || '—')
  })()

  const examesExtras = idadeNum >= 40 ? (isFem ? EXAMES_MULHER_40 : EXAMES_HOMEM_40) : []
  const exames45 = idadeNum >= 45 ? EXAMES_45 : []  // proteína/albumina/globulina (ambos os sexos)
  // Exames ginecológicos CONDICIONAIS (mulher): dependem da idade + do Status Ginecológico.
  const examesGineco = (() => {
    if (!isFem) return []
    const g = form.status_ginecologico || []
    const out = []
    if (idadeNum >= 12 && idadeNum <= 50) out.push({ key: 'beta_hcg', label: 'Beta-hCG', unit: 'mUI/mL', ref: '<5' })
    // CA 125 (ovário): mulher >= 40 OU sangramento menstrual / mola / mioma / endometriose / menopausa.
    if (idadeNum >= 40 || g.includes('SANGRAMENTO MENSTRUAL') || g.includes('MOLA HIDATIFORME') || g.includes('MIOMAS | MIOMATOSE') || g.includes('ENDOMETRIOSE') || g.includes('MENOPAUSA'))
      out.push({ key: 'ca125', label: 'CA 125', unit: 'U/mL', ref: '<35' })
    // CA 15.3 (mama): câncer de mama / cistos nas mamas OU >= 40.
    if (g.includes('CÂNCER DE MAMA') || g.includes('CISTOS NAS MAMAS') || idadeNum >= 40)
      out.push({ key: 'ca153', label: 'CA 15.3', unit: 'U/mL', ref: '<30' })
    return out
  })()
  const todosExames = [...EXAMES_BASE, ...exames45, ...examesExtras, ...examesGineco]

  const [exames, setExames] = useState(salvo?.exames || Object.fromEntries(todosExames.map(e => [e.key, ''])))

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

  // Compõe a data ISO (dataExames) a partir das 3 caixas. Só vira data válida com
  // ano de 4 dígitos + mês + dia; senão fica vazia (diasExames trata o vazio).
  useEffect(() => {
    const a = String(exAno || ''), m = String(exMes || ''), d = String(exDia || '')
    if (a.length === 4 && m && d) {
      setDataExames(`${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
    } else {
      setDataExames('')
    }
  }, [exDia, exMes, exAno])

  // Splash 4DOC ao entrar no relatório: imagem nítida por 3s, depois revela o
  // conteúdo. Só roda se houver imagem definida (SPLASH_REL_IMG).
  useEffect(() => {
    if (etapa !== 'relatorio' || !SPLASH_REL_IMG) return
    setSplashRel(true)
    const t = setTimeout(() => setSplashRel(false), 3000)
    return () => clearTimeout(t)
  }, [etapa])

  // Valor unificado da config: consulta/teleconsulta E prescrição/relatório usam
  // o mesmo valor (valor_documento_medico = "Valor de Relatório"). A chave antiga
  // valor_teleconsulta foi aposentada — ambos os CTAs leem documento_medico.
  useEffect(() => {
    let ativo = true
    supabase.from('config').select('valor').eq('chave', 'valor_documento_medico').maybeSingle()
      .then(({ data }) => {
        if (!ativo || data?.valor == null) return
        setValorPrescricao(data.valor)
        setValorTeleconsulta(data.valor)
      })
    return () => { ativo = false }
  }, [])

  // Splash 4DOC do modal de conclusão (só se houver imagem definida).
  useEffect(() => {
    if (etapa !== 'conclusao' || !SPLASH_CONCLUSAO_IMG) return
    setSplashConcl(true)
    const t = setTimeout(() => setSplashConcl(false), 3000)
    return () => clearTimeout(t)
  }, [etapa])

  // Persiste o progresso a cada mudança (etapa/respostas/exames/relatório).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ etapa, form, exames, dataExames, relatorio, estadoClinico, querTeleconsulta }))
    } catch (e) {}
  }, [etapa, form, exames, dataExames, relatorio, estadoClinico, querTeleconsulta])

  //  Handlers
  const PESO_ANTES_MAX = 220  // (a) teto do peso antes da cirurgia
  const handlePesoAtualBlur = () => {
    const atual = parseFloat(form.peso_atual)
    const minimo = parseFloat(form.peso_minimo_pos)
    if (!isNaN(atual) && !isNaN(minimo) && atual < minimo) {
      setForm(prev => ({ ...prev, peso_atual: String(minimo) }))
      setAlertaPeso(`O peso atual (${atual} kg) não pode ser menor que o menor peso pós (${minimo} kg). Ajustado para ${minimo} kg.`)
    } else {
      setAlertaPeso(null)
    }
  }
  // (a) Peso antes: teto de 220 kg.
  const handlePesoAntesBlur = () => {
    const v = parseFloat(form.peso_antes)
    if (!isNaN(v) && v > PESO_ANTES_MAX) {
      setForm(prev => ({ ...prev, peso_antes: String(PESO_ANTES_MAX) }))
      setAlertaPeso(`O peso antes da cirurgia foi limitado a ${PESO_ANTES_MAX} kg.`)
    }
  }
  // (a) Menor peso pós não pode ser maior que o peso antes da cirurgia.
  const handlePesoMinBlur = () => {
    const minimo = parseFloat(form.peso_minimo_pos)
    const antes = parseFloat(form.peso_antes)
    if (!isNaN(minimo) && !isNaN(antes) && minimo > antes) {
      setForm(prev => ({ ...prev, peso_minimo_pos: String(antes) }))
      setAlertaPeso(`O menor peso pós (${minimo} kg) não pode ser maior que o peso antes da cirurgia (${antes} kg). Ajustado para ${antes} kg.`)
    }
  }

  function handleExameChange(key, value) {
    // (b) Qualquer vírgula vira ponto (aceita "12,5" como 12.5).
    const v = typeof value === 'string' ? value.replace(',', '.') : value
    setExames(prev => {
      const novo = { ...prev, [key]: v }
      const leuco = parseFloat(key === 'leucocitos' ? v : prev.leucocitos)
      const neutPct = parseFloat(key === 'neutrofilos' ? v : prev.neutrofilos)
      if (!isNaN(leuco) && !isNaN(neutPct) && leuco > 0 && neutPct > 0) {
        novo.neutrofilos_ul = Math.round(leuco * neutPct / 100).toString()
      }
      // (d) Globulina = Proteína total − Albumina (idade ≥ 45).
      const pt = parseFloat(key === 'proteina_total' ? v : prev.proteina_total)
      const alb = parseFloat(key === 'albumina' ? v : prev.albumina)
      if (!isNaN(pt) && !isNaN(alb) && pt > 0 && alb > 0) {
        novo.globulina = (pt - alb).toFixed(1)
      }
      return novo
    })
  }

  // BUG #1 corrigido: removida a duplicacao da funcao handleExameChangeOBA
  // (antes existia 2x identicas seguidas).
  function handleExameChangeOBA(key, value) {
    // (b) Normaliza vírgula → ponto na entrada dos exames.
    value = typeof value === 'string' ? value.replace(',', '.') : value
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

  // ── SEAMLESS — saltos de foco automáticos, SEM rolar a tela (preventScroll) ──
  // Cada campo amarelo, ao ganhar foco, agenda o salto pro próximo após 2,5s;
  // cada tecla reinicia o timer (agendarSalto). agendarSalto(null) só cancela.
  const refDia = useRef(null), refMes = useRef(null), refAno = useRef(null)
  const refPesoAntes = useRef(null), refPesoMin = useRef(null), refPesoAtual = useRef(null), refAltura = useRef(null)
  const refGestacoes = useRef(null)
  const refExDia = useRef(null), refExMes = useRef(null), refExAno = useRef(null), refPrimeiroExame = useRef(null)
  const saltoTimer = useRef(null)
  const jaSaltouPeso = useRef(false)
  const focar = (r) => { try { r?.current?.focus({ preventScroll: true }) } catch (e) {} }
  const agendarSalto = (r, ms = 3000) => {
    if (saltoTimer.current) clearTimeout(saltoTimer.current)
    if (!r) return
    saltoTimer.current = setTimeout(() => focar(r), ms)
  }
  // Salto por nº de DÍGITOS: salta na hora ao atingir `digitos`; se `comTimer`,
  // com `digitos-1` dígitos agenda o salto após `ms`. Sempre cancela o timer
  // anterior. Datas (DD/MM): saltam com 2 dígitos. Pesos: 3 dígitos OU 2 + 3s.
  const saltoPorDigitos = (valor, ref, digitos, comTimer = false, ms = 3000) => {
    if (saltoTimer.current) clearTimeout(saltoTimer.current)
    if (!ref) return
    const n = String(valor ?? '').replace(/\D/g, '').length
    if (n >= digitos) { focar(ref); return }
    if (comTimer && n === digitos - 1) saltoTimer.current = setTimeout(() => focar(ref), ms)
  }

  // Foca o DIA da cirurgia ao montar a anamnese (e limpa o timer ao desmontar).
  useEffect(() => {
    let t = null
    if (etapa === 'anamnese') t = setTimeout(() => focar(refDia), 300)
    return () => { if (t) clearTimeout(t); if (saltoTimer.current) clearTimeout(saltoTimer.current) }
  }, [])

  // Impede a rodinha do mouse de ALTERAR o valor de qualquer input number focado.
  // (listener no document com passive:false → o preventDefault funciona; mais
  // robusto que o onWheel+blur por campo, que ainda deixava o 1º tick passar.)
  useEffect(() => {
    const handler = (e) => {
      const t = e.target
      // Bloqueia o wheel APENAS quando o cursor está sobre o input number que está
      // focado (impede mudar o valor). Em qualquer outro ponto, a rolagem da
      // página/modal funciona normalmente — o bug anterior travava a tela toda.
      if (t && t.tagName === 'INPUT' && t.type === 'number' && t === document.activeElement) {
        e.preventDefault()
      }
    }
    document.addEventListener('wheel', handler, { passive: false })
    return () => document.removeEventListener('wheel', handler)
  }, [])

  // Marcada a INDICAÇÃO da cirurgia → salta (uma vez) pro PESO ANTES.
  useEffect(() => {
    if (form.indicacao_cirurgia && !jaSaltouPeso.current) {
      jaSaltouPeso.current = true
      focar(refPesoAntes)
    }
  }, [form.indicacao_cirurgia])

  // ── PESQUISA (obstipação/fibromialgia) — gatilho e envio ──────────────────
  // Abre quando: OBSTIPAÇÃO CRÔNICA no intestinal, OU "TENHO FIBROMIALGIA
  // DIAGNOSTICADA", OU ≥5 dos DEMAIS sintomas fibromiálgicos. Oferecida 1x.
  const pesquisaOferecida = useRef(false)
  const fibroDemais = (form.status_fibromialgia || []).filter(o => o !== "TENHO FIBROMIALGIA DIAGNOSTICADA").length
  const gatilhoPesquisa = (
    (form.status_intestinal || '').indexOf('OBSTIPA') === 0 ||
    (form.status_fibromialgia || []).includes("TENHO FIBROMIALGIA DIAGNOSTICADA") ||
    fibroDemais >= 5
  )
  // Se o OBA abre JÁ com obstipação/fibromialgia (seedada da avaliação anterior na form),
  // NÃO oferece a pesquisa ao abrir — ela só aparece quando o paciente MARCA durante ESTA
  // avaliação. Sem isto, no ENTRAR (re-avaliação) a pesquisa pulava antes do OBA.
  useEffect(() => {
    if (gatilhoPesquisa) pesquisaOferecida.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (gatilhoPesquisa && !pesquisaOferecida.current) {
      pesquisaOferecida.current = true
      setShowPesquisa(true)
    }
  }, [gatilhoPesquisa])

  async function enviarPesquisaTelegram() {
    let celular = ''
    try {
      const cpfLimpo = String(cpf || '').replace(/\D/g, '')
      if (cpfLimpo.length === 11) {
        const { data } = await supabase.from('profiles').select('celular').eq('cpf', cpfLimpo).maybeSingle()
        celular = data?.celular || ''
      }
    } catch (e) {}
    const agora = new Date().toLocaleString('pt-BR')
    const msg = "🔬 Paciente para a PESQUISA (obstipação/fibromialgia):\n" +
      `Nome: ${nome || '—'}\n` +
      `Telefone: ${celular || '(não informado)'}\n` +
      `E-mail: (não informado)\n` +
      `Data|Hora: ${agora}`
    try { await supabase.rpc('tg_enviar', { p_msg: msg }) } catch (e) {}
  }

  function aceitarPesquisa(checked) {
    setPesquisaAceita(checked)
    if (checked && !pesquisaEnviado) {
      enviarPesquisaTelegram()
      setPesquisaEnviado(true)
    }
  }

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
  // Fase pós-operatória p/ a seção QUEIXA PRINCIPAL (dinâmica pelo tempo de cirurgia).
  const faseQueixa = mesesPos == null ? null : mesesPos <= 6 ? 'precoce' : mesesPos <= 36 ? 'intermediaria' : 'tardia'
  const queixasFase = faseQueixa ? QUEIXAS_POR_FASE[faseQueixa] : []
  // Se o paciente corrigir o ANO e cair em OUTRA fase, higieniza as queixas que não
  // existem na nova lista — senão ficariam "presas" (invisíveis, mas ocupando o teto
  // de 3 e indo p/ o relatório misturadas). Só age quando a fase é conhecida.
  useEffect(() => {
    if (!faseQueixa) return
    const validas = QUEIXAS_POR_FASE[faseQueixa]
    setForm(p => {
      const secLimpa = (p.queixas_secundarias || []).filter(q => validas.includes(q))
      const prinLimpa = validas.includes(p.queixa_principal) ? p.queixa_principal : ''
      if (secLimpa.length === (p.queixas_secundarias || []).length && prinLimpa === p.queixa_principal) return p
      return { ...p, queixa_principal: prinLimpa, queixas_secundarias: secLimpa }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faseQueixa])

  // Marcou dor óssea/articular como queixa (principal ou secundária)? → abre um campo
  // livre no Status Ósseo|Articular p/ o paciente detalhar. Cobre "DORES NOS OSSOS" e
  // "DORES NOS OSSOS OU ARTICULAÇÕES" (ambos começam igual).
  const marcouDoresOsseas = [form.queixa_principal, ...(form.queixas_secundarias || [])]
    .some(q => String(q || '').indexOf('DORES NOS OSSOS') === 0)

  // Marcou IDEAÇÃO SUICIDA (principal ou secundária) → mensagem de segurança imediata.
  const marcouIdeacao = [form.queixa_principal, ...(form.queixas_secundarias || [])]
    .includes('IDEAÇÃO SUICIDA')

  // Data da avaliação (hoje) — topo da anamnese e relatórios. Mesmo formato do motor.
  const hojeFmt = new Date().toLocaleDateString('pt-BR')

  // Meses da cirurgia até ENGRAVIDAR (cirurgia → concepção): subtrai a idade gestacional
  // atual do tempo pós-op. < 18 meses = recomendação crítica infringida. Sem semanas
  // informadas, usa mesesPos (limite superior seguro). Espelha o cálculo do obaEngine.
  const _semanasGest = parseInt(form.semanas_gestacao) || 0   // inteiro (espelha o parseInt do motor)
  const mesesAoEngravidar = (mesesPos != null && form.status_gestacional === 'GRÁVIDA')
    ? (_semanasGest > 0 ? Math.max(0, Math.round(mesesPos - _semanasGest / 4.345)) : mesesPos)
    : null
  const engravidouCedo = mesesAoEngravidar != null && mesesAoEngravidar < 18

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

  // ── QUEIXAS (principal + até 3 secundárias) ───────────────────────────────
  function escolherPrincipal(q) {
    // Marca a principal e a remove das secundárias (se estava lá, evita duplicar).
    // Queixa intestinal (obstipação/diarreia) propaga p/ o Status Intestinal.
    setForm(p => aplicarSyncIntestinal({ ...p, queixa_principal: q, queixas_secundarias: (p.queixas_secundarias || []).filter(x => x !== q) }, q))
  }
  function trocarPrincipal() {
    // Volta a escolher a principal (mantém as secundárias já marcadas).
    setForm(p => ({ ...p, queixa_principal: '' }))
  }
  function toggleQueixaSec(q) {
    setForm(p => {
      const cur = p.queixas_secundarias || []
      if (cur.includes(q)) return { ...p, queixas_secundarias: cur.filter(x => x !== q) }  // remover: não mexe no status
      if (cur.length >= 3) return p   // teto de 3
      return aplicarSyncIntestinal({ ...p, queixas_secundarias: [...cur, q] }, q)  // marcar: propaga p/ status
    })
  }

  // Toggle de um sintoma do fibromiálgico. Se for um marcador "EM USO DE ..." mapeado,
  // ao MARCAR tambem marca o medicamento em MEDICAMENTOS EM USO (add-only; desmarcar
  // no fibro não remove do medicamentos — os checkboxes de lá seguem independentes).
  function toggleFibro(op) {
    setForm(p => {
      const novo = tog(p.status_fibromialgia, op)
      const med = FIBRO_MED_SYNC[op]
      const marcando = novo.includes(op)
      const meds = (med && marcando && !(p.medicamentos || []).includes(med))
        ? [...(p.medicamentos || []), med]
        : p.medicamentos
      return { ...p, status_fibromialgia: novo, medicamentos: meds }
    })
  }

  // Marca/desmarca uma seção como "não tenho certeza". Na 1ª dúvida da sessão, popup.
  function toggleDuvida(secao) {
    const estava = (form.duvidas || []).includes(secao)
    setForm(p => {
      const cur = p.duvidas || []
      return { ...p, duvidas: cur.includes(secao) ? cur.filter(x => x !== secao) : [...cur, secao] }
    })
    if (!estava && !duvidaPopupVisto.current) {
      duvidaPopupVisto.current = true
      setShowDuvidaPopup(true)
    }
  }

  function toggleAtividade(val) {
    if (val === "SEDENT\u00c1RIO") sf('atividade_fisica', form.atividade_fisica.includes("SEDENT\u00c1RIO") ? [] : ["SEDENT\u00c1RIO"])
    else if (!form.atividade_fisica.includes("SEDENT\u00c1RIO")) sf('atividade_fisica', tog(form.atividade_fisica, val))
  }

  function buildDadosOBA() {
    return {
      sexo,
      idade: idadeNum,
      queixa_principal:   form.queixa_principal || null,
      queixas_secundarias: form.queixas_secundarias || [],
      status_ginecologico: form.status_ginecologico,
      // Sub-respostas só valem se o checkbox pai estiver marcado (senão viram dado sujo).
      // Padrão menstrual: só vale com SANGRAMENTO marcado E SEM MENOPAUSA — com
      // menopausa as perguntas somem da tela e o motor ignora (red flag próprio);
      // enviar respostas antigas presas no form viraria dado morto no snapshot.
      sangramento_menstrual_tipo: form.status_ginecologico.includes('SANGRAMENTO MENSTRUAL') && !form.status_ginecologico.includes('MENOPAUSA') ? (form.sangramento_menstrual_tipo || null) : null,
      sangramento_duracao:      form.status_ginecologico.includes('SANGRAMENTO MENSTRUAL') && !form.status_ginecologico.includes('MENOPAUSA') ? (form.sangramento_duracao || null) : null,
      sangramento_persistencia: form.status_ginecologico.includes('SANGRAMENTO MENSTRUAL') && !form.status_ginecologico.includes('MENOPAUSA') ? (form.sangramento_persistencia || null) : null,
      sangramento_frequencia:   form.status_ginecologico.includes('SANGRAMENTO MENSTRUAL') && !form.status_ginecologico.includes('MENOPAUSA') ? (form.sangramento_frequencia || null) : null,
      cancer_mama_status: form.status_ginecologico.includes('CÂNCER DE MAMA') ? (form.cancer_mama_status || null) : null,
      status_prostatico: form.status_prostatico,
      prostata_cancer_tratamentos: form.status_prostatico.includes('CÂNCER') ? form.prostata_cancer_tratamentos : [],
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
      dumping:            !!form.dumping,
      status_pressorico:  form.status_pressorico || null,
      status_endoscopico: form.status_endoscopico.length > 0 ? form.status_endoscopico : null,
      status_neurologico: form.status_neurologico.length > 0 ? form.status_neurologico : null,
      status_osseo:       form.status_osseo || null,
      status_articular:   form.status_articular,
      fan:                form.fan || null,
      fan_titulo:         form.fan === 'REAGENTE' ? (form.fan_titulo || null) : null,
      status_dental:      form.status_dental || null,
      status_gestacional: form.status_gestacional || null,
      semanas_gestacao:   form.semanas_gestacao ? parseFloat(form.semanas_gestacao) : null,
      gestacoes_previas:  form.gestacoes_previas !== '' ? parseInt(form.gestacoes_previas) : null,
      abortamentos_espontaneos: form.abortamentos_espontaneos,
      abortamentos_numero: form.abortamentos_numero ? parseInt(form.abortamentos_numero) : null,
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
      varizes_esofago:    form.varizes_esofago || form.status_endoscopico.includes("VARIZES DE ESÔFAGO"),
      operou_varizes_esofago: form.operou_varizes_esofago,
      // Status Vascular ARTERIAL + Cardiovascular (round 3) — capturados p/ uso futuro do engine.
      doppler_carotidas:  form.doppler_carotidas || null,
      estenose_maxima:    form.estenose_maxima ? parseFloat(form.estenose_maxima) : null,
      doenca_arterial_periferica: form.doenca_arterial_periferica,
      status_cardiovascular: form.status_cardiovascular,
      ecg:                form.ecg || null,
      ecg_marcapasso:     form.ecg_marcapasso,
      ecg_arritmia:       form.ecg_arritmia,
      ecocardiograma:     form.ecocardiograma || null,
      fracao_ejecao:      form.fracao_ejecao ? parseFloat(form.fracao_ejecao) : null,
      angiotomografia_coronariana: form.angiotomografia_coronariana,
      score_calcio:       form.score_calcio ? parseFloat(form.score_calcio) : null,
      // Endócrino hormonal + Respiratório + Alérgico (round 3) — capturados p/ uso futuro.
      status_hormonal:    form.status_hormonal,
      status_respiratorio: form.status_respiratorio.length > 0 ? form.status_respiratorio : null,
      status_alergico:    form.status_alergico,
      alergia_medicamentosa: form.alergia_medicamentosa,
      alergia_outra_texto: form.alergia_outra_texto || null,
      alergias_alimentares: form.alergias_alimentares,
      alergias_alimentares_outra: form.alergias_alimentares_outra || null,
      meta_peso:          form.meta_peso || null,
      meta_kg:            form.meta_kg ? parseFloat(form.meta_kg) : null,
      projetos_vida:      form.projetos_vida,
      habitos_sociais:    form.habitos_sociais,
      infeccoes_cronicas: form.infeccoes_cronicas,
      hepb_status: form.hepb_status || null,
      hepc_status: form.hepc_status || null,
      hiv_tratamento: form.hiv_tratamento,
      herpes_simples_aciclovir: form.herpes_simples_aciclovir,
      herpes_zoster: form.herpes_zoster,
      borreliose_status: form.borreliose_status || null,
      hpv_estado: form.hpv_estado,
      ebv_status: form.ebv_status || null,
      htlv_ativa: form.htlv_ativa,
      duvidas: form.duvidas || [],
      status_intestinal:  form.status_intestinal || null,
      status_fibromialgia: form.status_fibromialgia,
      calprotectina: form.calprotectina === '' ? null : Number(form.calprotectina),
      indican: form.indican || null,
      anti_hp_igg: form.antiHp_igg || null,
      anti_hp_igm: form.antiHp_igm || null,
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
    const base = Object.fromEntries(
      todosExames.map(e => [e.key, exames[e.key] ? parseFloat(exames[e.key]) : null])
    )
    // Eritron de nova data (HB/VCM/RDW/Ferritina/Sat relançados) — guarda se preenchidos.
    ;['hb_novo', 'vcm_novo', 'rdw_novo', 'ferritina_novo', 'sat_novo'].forEach(k => {
      if (exames[k]) base[k] = parseFloat(exames[k])
    })
    return base
  }

  async function salvarAnamnese() {
    setErro('')
    if (!form.cirurgia_ano || calcMesesPos() === null) {
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
      // Secoes INTESTINAL/FIBROMIALGIA (colunas proprias; antes so viviam no form_snapshot jsonb).
      status_intestinal: form.status_intestinal || null,
      status_fibromialgia: (form.status_fibromialgia || []).length > 0 ? form.status_fibromialgia : null,
      calprotectina: form.calprotectina === '' ? null : Number(form.calprotectina),
      indican: form.indican || null,
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
      // Grava o RETRATO COMPLETO do form já ao salvar a anamnese (não só no relatório).
      // Sem isso, se o paciente avança para exames e SAI antes do relatório, esta linha
      // fica sem form_snapshot e o próximo follow-up restaura tudo VAZIO (só a cirurgia,
      // que vem de colunas próprias). O gerarRelatorio depois sobrescreve com o relatório
      // completo (que também carrega o form_snapshot).
      relatorio_oba: { form_snapshot: form },
    }

    await supabase.from('oba_anamnese').insert(dadosAnamnese)
    setLoading(false)
    setAnamneseSalva(dadosAnamnese)
    setEtapa('exames')
  }

  // (b) Eritron EFETIVO: se o paciente lançou novos valores (HB/VCM/RDW/Ferritina/Sat),
  // recomputa o eritron com esses valores sobre os inputs originais da triagem e usa no
  // relatório/estado clínico. Senão, mantém o resultado da triagem (resultadoEritron).
  // Só recomputa se houve mudança E há o mínimo (HB/VCM/RDW), p/ evitar resultado lixo.
  function eritronEfetivo(examesObj) {
    const mudou = ['hb_novo', 'vcm_novo', 'rdw_novo', 'ferritina_novo', 'sat_novo'].some(k => examesObj?.[k] != null)
    if (!mudou) return resultadoEritron
    const merged = { ...(resultadoEritron?.inputs || {}) }
    if (examesObj.hb_novo != null) merged.hemoglobina = Number(examesObj.hb_novo)
    if (examesObj.vcm_novo != null) merged.vcm = Number(examesObj.vcm_novo)
    if (examesObj.rdw_novo != null) merged.rdw = Number(examesObj.rdw_novo)
    if (examesObj.ferritina_novo != null) merged.ferritina = Number(examesObj.ferritina_novo)
    if (examesObj.sat_novo != null) merged.satTransf = Number(examesObj.sat_novo)
    merged.sexo = merged.sexo || (isFem ? 'F' : 'M')
    merged.idade = merged.idade || idadeNum
    const temMinimo = merged.hemoglobina > 0 && merged.vcm > 0 && merged.rdw > 0
    if (!temMinimo) return resultadoEritron
    try {
      const temFerSat = merged.ferritina > 0 && merged.satTransf > 0
      const r = temFerSat ? avaliarPaciente(merged) : triagemEritron(merged)
      if (!r) return resultadoEritron
      return { label: r.label, color: r.color, inputs: merged, _recomputado: true }
    } catch (e) {
      return resultadoEritron
    }
  }

  // Computa o relatório (BASELINE), classifica o estado clínico, persiste e
  // avança para a etapa 'relatorio'. examesObj pode ser {} (exames pulados).
  async function gerarRelatorio(examesObj) {
    const dados = buildDadosOBA()
    const eritron = eritronEfetivo(examesObj)
    const rel = avaliarOBA(eritron, dados, examesObj)
    const temExames = Object.values(examesObj || {}).some(v => v !== null && v !== undefined && v !== '')
    const est = rel ? classificarEstadoClinico(rel, { eritronColor: eritron?.color, temExames, temDuvidas: (form.duvidas || []).length > 0 }) : null
    setRelatorio(rel)
    setEstadoClinico(est)
    setEtapa('relatorio')

    // Persiste o relatório na última linha de oba_anamnese (a mesma que recebeu
    // a anamnese/exames). Requer as colunas relatorio_oba (jsonb) e
    // estado_clinico (text) — ver ALTER TABLE entregue ao Estácio.
    if (cpf && rel) {
      const cpfLimpo = cpf.replace(/\D/g, '')
      const { data: rows } = await supabase
        .from('oba_anamnese').select('id')
        .eq('cpf', cpfLimpo).order('created_at', { ascending: false }).limit(1)
      if (rows && rows.length > 0) {
        // Eritron recomputado (nova data) vai dentro do relatorio_oba (jsonb) — sem
        // precisar de colunas novas. data_eritron_atualizado = a data dos exames.
        // form_snapshot: guarda o formulário inteiro p/ o próximo follow-up restaurar
        // os status anteriores como rascunho (robusto p/ TODOS os campos, não só os
        // que viram coluna). eritron_atualizado: eritron recomputado de nova data.
        // H. pylori detectado (achado endoscópico OU IgM reagente) → carimba a data
        // p/ o lembrete de repetir em 6 meses (banner in-app + painel ADM).
        const temHpyloriSave = (form.status_endoscopico || []).includes('H. PYLORI') || form.antiHp_igm === 'REAGENTE'
        const relSalvar = {
          ...rel,
          form_snapshot: form,
          ...(temHpyloriSave ? { hpylori: {
              detectado: true,
              igm_reagente: form.antiHp_igm === 'REAGENTE',
              endoscopico: (form.status_endoscopico || []).includes('H. PYLORI'),
              data: dataExames || null,
            } } : {}),
          ...(eritron?._recomputado ? { eritron_atualizado: {
              hemoglobina: eritron.inputs.hemoglobina, vcm: eritron.inputs.vcm, rdw: eritron.inputs.rdw,
              ferritina: eritron.inputs.ferritina, satTransf: eritron.inputs.satTransf,
              label: eritron.label, color: eritron.color, data: dataExames || null,
            } } : {}),
        }
        // REVISÃO MÉDICA (Passo 3): NÃO destrói o retrato original do paciente. Preserva
        // (uma única vez, na 1ª revisão) o relatório + estado clínico do paciente sob
        // _paciente_original — "guarda os dois". Nas revisões seguintes mantém o original
        // já preservado. Marca a linha como revisada por médico (o selo por item é o Passo 4).
        if (modoRevisao) {
          const orig = anamneseAnterior?.relatorio_oba || null
          relSalvar._paciente_original = orig?._paciente_original || {
            relatorio: orig,
            estado: anamneseAnterior?.estado_clinico || null,
          }
          relSalvar._revisado_por_medico = true
          relSalvar._revisao_data = new Date().toISOString()
        }
        await supabase.from('oba_anamnese')
          .update({ relatorio_oba: relSalvar, estado_clinico: est?.estado || null })
          .eq('id', rows[0].id)
      }

      // (A1) Hemograma NOVO digitado no OBA também vira linha em `avaliacoes` — antes
      // ficava só no jsonb do relatório: fora do gráfico histórico e o médico redigitava
      // tudo a cada AVALIAR (a ultimaAval do paciente nunca se atualizava).
      if (eritron?._recomputado) {
        try {
          const mi = eritron.inputs || {}
          const numOrNull = (v) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v))) ? null : Number(v)
          const dataCol = dataExames || new Date().toISOString().slice(0, 10)
          const { data: prof } = await supabase.from('profiles').select('id').eq('cpf', cpfLimpo).maybeSingle()
          const linha = {
            cpf: cpfLimpo,
            ...(prof?.id ? { user_id: prof.id } : {}),
            data_coleta: dataCol,
            hemoglobina: numOrNull(mi.hemoglobina),
            vcm: numOrNull(mi.vcm),
            rdw: numOrNull(mi.rdw),
            ferritina: numOrNull(mi.ferritina),
            sat_transf: numOrNull(mi.satTransf),
            bariatrica: true,
            diagnostico_label: eritron.label,
            diagnostico_color: eritron.color,
            concluida: true,
            // medico_crm de propósito NÃO entra aqui: a coluna alimenta a atribuição de
            // crédito (fn_credita_medico) — avaliar não é encaminhar.
          }
          // Mesma data já tem linha (ex.: completou Ferritina/Sat do MESMO hemograma,
          // ou o espelho da triagem)? ATUALIZA em vez de duplicar.
          const { data: exist } = await supabase.from('avaliacoes').select('id')
            .eq('cpf', cpfLimpo).eq('data_coleta', dataCol).limit(1)
          if (exist && exist.length > 0) await supabase.from('avaliacoes').update(linha).eq('id', exist[0].id)
          else await supabase.from('avaliacoes').insert(linha)
        } catch (e) { /* não bloqueia o relatório */ }
      }
    }
  }

  async function salvarExames() {
    // Re-entrada (ENTRAR): hemograma é OBRIGATÓRIO antes de gerar o relatório.
    if (coletarHemograma && !(Number(exames.hb_novo) > 0 && Number(exames.vcm_novo) > 0 && Number(exames.rdw_novo) > 0)) {
      alert('Digite o seu novo hemograma: Hemoglobina, VCM e RDW.')
      return
    }
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
        const { error: errExames } = await supabase.from('oba_anamnese').update({
          data_exames: dataExames || null,
          dias_exames: diasExames,
          ...Object.fromEntries(todosExames.map(e => [e.key, examesObj[e.key] !== undefined ? examesObj[e.key] : null]))
        }).eq('id', rows[0].id)
        // NAO falhar em silencio: se uma coluna de exame nao existir, o Postgres rejeita
        // o update INTEIRO e nenhum exame e gravado. Loga para nao passar despercebido.
        if (errExames) console.error('OBA: falha ao gravar exames em oba_anamnese —', errExames.message)
      }
    }

    await gerarRelatorio(examesObj)
    setLoading(false)
  }

  function pularExames() {
    // Na re-entrada (ENTRAR) o hemograma é obrigatório. Se já preenchido, segue (com ele);
    // senão, avisa — não dá pra pular esta etapa sem o hemograma.
    if (coletarHemograma) {
      if (Number(exames.hb_novo) > 0 && Number(exames.vcm_novo) > 0 && Number(exames.rdw_novo) > 0) { salvarExames(); return }
      alert('Digite o seu novo hemograma (Hemoglobina, VCM e RDW) para continuar.')
      return
    }
    gerarRelatorio({})
  }

  // Botão "CONCLUIR" do relatório → vai para o modal de conclusão da 1ª avaliação
  // (NÃO finaliza ainda; o progresso é mantido até o paciente finalizar).
  function concluirRelatorio() {
    setEtapa('conclusao')
  }

  // Botão final do modal de conclusão → limpa o progresso e devolve o controle.
  function finalizar() {
    limparProgresso()
    onConcluir(buildDadosOBA(), buildExamesOBA())
  }

  // Abre o WhatsApp da plataforma com uma mensagem pré-preenchida.
  function abrirWhats(msg) {
    try { window.open(`https://wa.me/${WHATS_PLATAFORMA}?text=${encodeURIComponent(msg)}`, '_blank') } catch (e) {}
  }

  // Subt\u00edtulo padr\u00e3o do paciente (NOME \u00b7 IDADE \u00b7 SEXO) \u2014 usado nos headers de
  // resultado (relat\u00f3rio e conclus\u00e3o).
  const subPaciente = [nome, idadeNum ? `${idadeNum} anos` : null, isFem ? 'Feminino' : 'Masculino'].filter(Boolean).join(' \u00b7 ')
  const TITULO_RESULTADO = "RELAT\u00d3RIO M\u00c9DICO"

  // Voltar = volta UMA etapa (revis\u00e3o/edi\u00e7\u00e3o); na 1\u00aa etapa (anamnese), sai do OBA.
  function voltarEtapa() {
    if (etapa === 'conclusao') setEtapa('relatorio')
    else if (etapa === 'relatorio') setEtapa('exames')
    else if (etapa === 'exames') setEtapa('anamnese')
    else if (etapa === 'anamnese' && coletarHemograma && modoMedico) setEtapa('eritron')
    else onFechar()
  }
  const corEritron = (c) => c === 'red' ? '#DC2626' : c === 'orange' ? '#EA580C' : c === 'yellow' ? '#CA8A04' : c === 'green' ? '#16A34A' : '#6B7280'
  function verAchadosEritron() {
    const hb = Number(exames.hb_novo), vcm = Number(exames.vcm_novo), rdw = Number(exames.rdw_novo)
    if (!(hb > 0) || !(vcm > 0) || !(rdw > 0)) { setErro('Lance Hemoglobina, VCM e RDW.'); return }
    if (!dataExames) { setErro('Informe a data do hemograma.'); return }
    setErro('')
    setEritronPopup(eritronEfetivo(buildExamesOBA()))
    setShowEritronPopup(true)
  }
  function encerrarAvaliacao() { setShowEritronPopup(false); finalizar() }
  const Header = ({ sub, titulo, semFada }) => (
    <div style={HD}>
      <button onClick={voltarEtapa} style={{ background:'#E3AE37', border:'none', borderRadius:8, color:'#000', fontSize:'0.8rem', fontWeight:800, padding:'0.4rem 0.8rem', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>{"\u2190 Voltar"}</button>
      <img src={obaLogo} alt="Projeto OBA" style={{ width:36, height:36, objectFit:'contain', flexShrink:0 }} />
      <div>
        <h2 style={{ color:'#facc15', fontSize: titulo ? '1.02rem' : '1.2rem', fontWeight:800, margin:0, lineHeight:1.25 }}>{titulo || `${saudacao} ao Projeto OBA!`}</h2>
        <p style={{ color:'#FDE68A', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px', marginTop:'0.2rem' }}>{sub}</p>
      </div>
    </div>
  )

  // Popup da 1ª dúvida (renderizado nas etapas anamnese e exames).
  const duvidaPopupEl = showDuvidaPopup && (
    <div style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.95)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem', boxSizing:'border-box' }}>
      <div style={{ position:'relative', background:'white', borderRadius:16, maxWidth:440, width:'100%', padding:'1.7rem 1.4rem 1.4rem', boxShadow:'0 20px 60px rgba(0,0,0,0.35)' }} onClick={e => e.stopPropagation()}>
        <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0 0 0.6rem' }}>{"Tudo bem ter dúvidas"}</p>
        <p style={{ fontSize:'0.85rem', color:'#374151', lineHeight:1.55, margin:'0 0 1rem' }}>
          {"Ok. Conclua como você puder. Registre os pontos de dúvida e depois solicite uma TELECONSULTA MÉDICA. Um relatório com as suas dúvidas ficará no sistema para que um profissional o ajude a deixar as suas informações mais precisas. Isso será importante para o algoritmo otimizar a sua vida, à medida em que as recomendações forem seguidas."}
        </p>
        <button onClick={() => setShowDuvidaPopup(false)} style={{ width:'100%', background:'#6B7280', color:'#facc15', border:'none', borderRadius:10, padding:'0.7rem', fontSize:'0.9rem', fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>{"ENTENDI"}</button>
      </div>
    </div>
  )


  // Gatilho/dados do PROTOCOLO DE FERRO ENDOVENOSO — fonte única usada no relatório
  // (botão abaixo do módulo ERITRON) e na conclusão (2ª oferta + prescrição).
  // resultadoEritron só traz { label, color, inputs }, então o contexto ferropênico
  // vem de: ferritina < 30, label microcítico, ou o motor do OBA sugerindo ferro EV.
  const ferroEV = (() => {
    // (b) Prefere os valores RELANÇADOS (nova data) sobre os da triagem.
    const hb = Number(exames.hb_novo || examesRedFairy?.hemoglobina || resultadoEritron?.inputs?.hemoglobina || 0)
    const ferritina = Number(exames.ferritina_novo || examesRedFairy?.ferritina || resultadoEritron?.inputs?.ferritina || 0)
    const gestante = form.status_gestacional === "GRÁVIDA"
    const hbAlvo = isFem ? (gestante ? 11.5 : 12.0) : 13.5
    const label = String(resultadoEritron?.label || '').toUpperCase()
    const obaSugere = (relatorio?.examesComplementares || []).some(e => /FERRO ENDOVENOSO/i.test(e))
      || (relatorio?.alertas || []).some(a => /FERRO ENDOVENOSO/i.test(a?.texto || ''))
    const contexto = (ferritina > 0 && ferritina < 30) || /MICROCIT|FERRO|SIDEROP/.test(label) || obaSugere
    const precisa = hb > 0 && (hbAlvo - hb) > 0 && resultadoEritron?.color !== 'green' && contexto
    return { precisa, hb, gestante }
  })()

  // Texto do protocolo de ferro EV p/ compartilhar no WhatsApp do paciente.
  const protocoloFerroTexto = [
    '*Protocolo de Reposição de Ferro Endovenoso (Fórmula de Ganzoni)*',
    `Paciente: ${nome || '—'}`,
    'Dose total (mg) = Peso × (Hb alvo − Hb atual) × 2,4 + 500' + (ferroEV.gestante ? ' + aporte gestacional' : ''),
    'Antes da 1ª dose: 10.000 UI de vitamina D (prevenção de hipofosfatemia).',
    'Precauções: adrenalina/anti-histamínico disponíveis; observar 30 min após a infusão.',
    'Monitoramento: hemograma em 4 semanas; ferritina e saturação em 8 semanas.',
    '— Projeto OBA®',
  ].join('\n')

  // Gera o PDF do protocolo de ferro EV (jsPDF carregado sob demanda p/ não pesar
  // o bundle inicial). Calcula a dose real pela fórmula de Ganzoni p/ o paciente.
  async function baixarPdfFerro() {
    try {
      const { jsPDF } = await import('jspdf')
      const calc = calcularDeficitFerroGanzoni({
        sexo: isFem ? 'F' : 'M',
        peso: pesoAtual || parseFloat(form.peso_atual),
        hb: ferroEV.hb,
        gestante: ferroEV.gestante,
        semanasGestacao: form.semanas_gestacao,
      })
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const M = 18
      let y = 22
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(123, 30, 30)
      doc.text('Protocolo de Reposição de Ferro Endovenoso', M, y); y += 7
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(110, 110, 110)
      doc.text('Projeto OBA® (paciente bariátrico) · Fórmula de Ganzoni', M, y); y += 11
      doc.setTextColor(30, 30, 30); doc.setFontSize(11)
      doc.text('Paciente: ' + (nome || '—'), M, y); y += 9
      if (calc) {
        doc.setFont('helvetica', 'bold'); doc.text('Dose total a repor:', M, y); y += 6
        doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(123, 30, 30)
        doc.text(calc.deficitMg + ' mg de ferro elementar', M + 3, y); y += 8
        doc.setFontSize(9); doc.setTextColor(110, 110, 110)
        doc.text('Cálculo: ' + calc.formula, M + 3, y); y += 9
        doc.setFontSize(11); doc.setTextColor(30, 30, 30)
      }
      const linhas = [
        'Antes da 1ª dose: 10.000 UI de vitamina D (prevenção de hipofosfatemia).',
        'Precauções: adrenalina e anti-histamínico disponíveis; observar o paciente',
        '   por 30 minutos após a infusão.',
        'Monitoramento: hemograma em 4 semanas; ferritina e saturação em 8 semanas.',
        '',
        'No paciente bariátrico, o ferro oral é mal absorvido — a via endovenosa é a',
        'de escolha. Este protocolo é uma sugestão e deve ser validado pelo médico',
        'assistente antes da aplicação.',
      ]
      linhas.forEach(l => { doc.text(l, M, y); y += 6 })
      doc.save('protocolo-ferro-ev.pdf')
    } catch (e) { /* falha silenciosa — botões de WhatsApp/prescrição seguem disponíveis */ }
  }

  if (etapa === 'conclusao') {
    const estado = estadoClinico?.estado
    const teleRecomendada = estado === 'CRITICO' || estado === 'RUIM' || form.usou_anticoagulante
    // H. pylori: achado endoscópico OU sorologia IgM reagente (infecção ativa).
    const temHpylori = (form.status_endoscopico || []).includes('H. PYLORI') || form.antiHp_igm === 'REAGENTE'
    // Protocolo de reposição de B12 + folato (macrocitose): bariátrico (sempre, no OBA)
    // com VCM > 105 e/ou Hb ≤ 9 — sinal de deficiência de B12 comprometendo o eritron.
    const vcmB12 = Number(examesRedFairy?.vcm ?? resultadoEritron?.inputs?.vcm ?? 0)
    const hbB12 = Number(examesRedFairy?.hemoglobina ?? resultadoEritron?.inputs?.hemoglobina ?? 0)
    const precisaB12Protocolo = (vcmB12 > 105) || (hbB12 > 0 && hbB12 <= 9)
    const BG_BAND = { position:'absolute', top:0, left:0, right:0, height:360, pointerEvents:'none' }
    const checkBox = { width:'1.1rem', height:'1.1rem', marginTop:'0.1rem', accentColor:'#DC2626', flexShrink:0 }
    const waBtn = { display:'inline-block', background:'#16a34a', color:'white', fontWeight:800, fontSize:'0.82rem', padding:'0.6rem 1rem', borderRadius:10, textDecoration:'none', cursor:'pointer', border:'none', fontFamily:'inherit', marginTop:'0.7rem' }
    return (
      <>
      {showFerroEV && (
        <div style={{ position:'relative', zIndex:2000 }}>
          <ModalFerroEV
            onClose={() => setShowFerroEV(false)}
            hbAtual={ferroEV.hb}
            sexo={isFem ? 'F' : 'M'}
            gestante={ferroEV.gestante}
            semanasGestacao={form.semanas_gestacao}
            pesoInicial={pesoAtual || form.peso_atual}
          />
        </div>
      )}
      <div style={OV} onClick={finalizar}>
        <div
          style={{ ...CD, position:'relative', overflow:'hidden' }}
          onClick={e => e.stopPropagation()}
          onMouseEnter={() => setBgConcl(true)} onMouseLeave={() => setBgConcl(false)} onTouchStart={() => setBgConcl(true)}
        >
          {SPLASH_CONCLUSAO_IMG && (
            <>
              <div aria-hidden="true" style={{ ...BG_BAND, backgroundImage:`url(${SPLASH_CONCLUSAO_IMG})`, backgroundSize:'100% auto', backgroundPosition:'center top', backgroundRepeat:'no-repeat', filter: bgConcl ? 'blur(0px)' : 'blur(10px)', opacity: bgConcl ? 0.5 : 0.12, transition:'filter 0.6s ease, opacity 0.6s ease' }} />
              <div aria-hidden="true" style={{ position:'absolute', inset:0, zIndex:5, background:'#FDF7F7', opacity: splashConcl ? 1 : 0, pointerEvents: splashConcl ? 'auto' : 'none', transition:'opacity 0.5s ease' }}>
                <div style={{ ...BG_BAND, backgroundImage:`url(${SPLASH_CONCLUSAO_IMG})`, backgroundSize:'100% auto', backgroundPosition:'center top', backgroundRepeat:'no-repeat' }} />
              </div>
            </>
          )}

          <div style={{ position:'relative', zIndex:10 }}>
            <Header titulo={TITULO_RESULTADO} sub={"ANAMNESE ASSISTIDA POR IA"} semFada />
          </div>

          <div style={{ position:'relative', zIndex:1, padding:'1.5rem', boxSizing:'border-box', width:'100%', overflowX:'hidden' }}>
            {SPLASH_CONCLUSAO_IMG && <div style={{ height:200 }} />}

            <p style={{ fontSize:'1.1rem', fontWeight:900, color:'#7B1E1E', textAlign:'center', margin:'0 0 0.2rem' }}>
              {"Primeira avaliação concluída!"}
            </p>
            <p style={{ fontSize:'0.72rem', color:'#6B7280', textAlign:'center', fontWeight:700, margin:'0 0 0.6rem' }}>{"Avaliação de "}{hojeFmt}</p>
            <p style={{ fontSize:'0.85rem', color:'#374151', textAlign:'center', lineHeight:1.5, margin:'0 0 1.2rem' }}>
              {"Com base na sua avaliação, estas são as recomendações e opções para você:"}
            </p>

            {/* TELECONSULTA — se CRÍTICO/RUIM ou usou anticoagulante */}
            {teleRecomendada && (
              <div style={{ background:'#EFF6FF', border:'2px solid #93C5FD', borderRadius:12, padding:'1rem 1.1rem', marginBottom:'0.9rem' }}>
                <p style={{ fontSize:'0.85rem', fontWeight:800, color:'#1E40AF', margin:'0 0 0.4rem' }}>{"RECOMENDAMOS TELECONSULTA MÉDICA"}</p>
                <p style={{ fontSize:'0.8rem', color:'#1D4ED8', lineHeight:1.5, margin:'0 0 0.7rem' }}>
                  {(estado === 'CRITICO' || estado === 'RUIM')
                    ? "Seu estado clínico atual merece avaliação médica próxima."
                    : "Seu histórico (trombose com anticoagulante já interrompido) recomenda avaliação o quanto antes."}
                </p>
                <label style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                  <input type="checkbox" checked={querTeleconsulta} onChange={e => setQuerTeleconsulta(e.target.checked)} style={{ ...checkBox, accentColor:'#2563EB' }} />
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#1E40AF' }}>{"SIM, DESEJO MARCAR UMA TELECONSULTA"}</span>
                </label>
                {querTeleconsulta && (
                  <div style={{ marginTop:'0.8rem', background:'white', border:'1px solid #BFDBFE', borderRadius:10, padding:'0.8rem 0.9rem' }}>
                    <p style={{ fontSize:'0.8rem', color:'#374151', margin:0 }}>
                      {"Valor da teleconsulta: "}
                      <strong style={{ color:'#7B1E1E' }}>{valorTeleconsulta != null ? `R$ ${valorTeleconsulta}` : "a confirmar"}</strong>
                    </p>
                    <button style={waBtn} onClick={() => abrirWhats('Olá! Concluí minha avaliação OBA e desejo marcar uma teleconsulta médica.')}>{"Falar no WhatsApp →"}</button>
                  </div>
                )}
              </div>
            )}

            {/* H. PYLORI — prescrição do tratamento */}
            {temHpylori && (
              <div style={{ background:'#FFF7ED', border:'2px solid #FED7AA', borderRadius:12, padding:'1rem 1.1rem', marginBottom:'0.9rem' }}>
                <p style={{ fontSize:'0.85rem', fontWeight:800, color:'#9A3412', margin:'0 0 0.4rem' }}>{"H. PYLORI — SOLICITE A RECEITA PARA TRATAMENTO"}</p>
                <p style={{ fontSize:'0.8rem', color:'#7C2D12', lineHeight:1.5, margin:'0 0 0.7rem' }}>
                  {"O H. pylori é um agente carcinogênico; tratar a infecção reduz o risco. Podemos emitir a prescrição do tratamento de erradicação."}
                </p>
                <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'0.6rem 0.8rem', margin:'0 0 0.7rem' }}>
                  <p style={{ fontSize:'0.76rem', color:'#92400E', lineHeight:1.5, margin:0 }}>
                    {"⚠ Os anticorpos contra o H. pylori NÃO são protetores — quem já teve a infecção pode se infectar de novo. "}
                    <strong>{"Repita o exame após 6 meses."}</strong>{" Vamos te lembrar na época."}
                  </p>
                </div>
                <label style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                  <input type="checkbox" checked={querPrescricao} onChange={e => setQuerPrescricao(e.target.checked)} style={checkBox} />
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#9A3412' }}>{"SOLICITAR A RECEITA DO TRATAMENTO"}</span>
                </label>
                <p style={{ fontSize:'0.74rem', color:'#9A3412', margin:'0.5rem 0 0' }}>
                  {"Você pagará apenas "}
                  <strong>{valorPrescricao != null ? `R$ ${valorPrescricao}` : "(valor a confirmar)"}</strong>
                  {" pela prescrição médica com assinatura digital."}
                </p>
                {querPrescricao && (
                  <button style={waBtn} onClick={() => abrirWhats('Olá! Concluí minha avaliação OBA e desejo solicitar a prescrição do tratamento para H. pylori.')}>{"Solicitar no WhatsApp →"}</button>
                )}
              </div>
            )}

            {/* MACROCITOSE / B12 — protocolo de reposição + oferta de prescrição digital */}
            {precisaB12Protocolo && (
              <div style={{ background:'#EEF2FF', border:'2px solid #C7D2FE', borderRadius:12, padding:'1rem 1.1rem', marginBottom:'0.9rem' }}>
                <p style={{ fontSize:'0.85rem', fontWeight:800, color:'#3730A3', margin:'0 0 0.4rem' }}>{"REPOSIÇÃO DE VITAMINA B12 + ÁCIDO FÓLICO"}</p>
                <p style={{ fontSize:'0.8rem', color:'#3730A3', lineHeight:1.5, margin:'0 0 0.6rem' }}>
                  {"Seu hemograma indica macrocitose importante e/ou hemoglobina baixa — no bariátrico, sinal de deficiência de Vitamina B12, que compromete a produção de hemácias. Recomendamos iniciar a reposição:"}
                </p>
                <div style={{ background:'white', border:'1px solid #C7D2FE', borderRadius:8, padding:'0.6rem 0.8rem', marginBottom:'0.7rem' }}>
                  <p style={{ fontSize:'0.76rem', color:'#374151', lineHeight:1.6, margin:0 }}>
                    {"• Cianocobalamina "}<strong>{"IM"}</strong>{": 3 doses, a cada 15 dias;"}<br/>
                    {"• Metilcobalamina "}<strong>{"sublingual 1.000 mcg/dia"}</strong>{" por 90 dias, depois 3×/semana;"}<br/>
                    {"• Ácido fólico "}<strong>{"5 mg via oral/dia"}</strong>{" por pelo menos 90 dias."}
                  </p>
                </div>
                <label style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                  <input type="checkbox" checked={querPrescricaoB12} onChange={e => setQuerPrescricaoB12(e.target.checked)} style={{ ...checkBox, accentColor:'#4F46E5' }} />
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#3730A3' }}>{"SOLICITAR A PRESCRIÇÃO MÉDICA DIGITAL"}</span>
                </label>
                <p style={{ fontSize:'0.74rem', color:'#4338CA', margin:'0.5rem 0 0' }}>
                  {"Você pagará apenas "}
                  <strong>{valorPrescricao != null ? `R$ ${valorPrescricao}` : "(valor a confirmar)"}</strong>
                  {" pela prescrição com assinatura digital."}
                </p>
                {querPrescricaoB12 && (
                  <button style={waBtn} onClick={() => abrirWhats('Olá! Concluí minha avaliação OBA e desejo solicitar a prescrição da reposição de Vitamina B12 e Ácido Fólico (macrocitose/anemia).')}>{"Solicitar no WhatsApp →"}</button>
                )}
              </div>
            )}

            {/* FERRO ENDOVENOSO — 2ª oferta (reabrir protocolo + prescrição + copiar p/ WhatsApp do paciente) */}
            {ferroEV.precisa && (
              <div style={{ background:'#FFF1F2', border:'2px solid #FDA4AF', borderRadius:12, padding:'1rem 1.1rem', marginBottom:'0.9rem' }}>
                <p style={{ fontSize:'0.85rem', fontWeight:800, color:'#9F1239', margin:'0 0 0.4rem' }}>{"PROTOCOLO DE REPOSIÇÃO DE FERRO ENDOVENOSO"}</p>
                <p style={{ fontSize:'0.8rem', color:'#9F1239', lineHeight:1.5, margin:'0 0 0.7rem' }}>
                  {"No bariátrico, o ferro oral é mal absorvido — a reposição por via endovenosa é a indicada. Você pode rever o protocolo completo, solicitar a prescrição médica ou levar o resumo para o seu WhatsApp."}
                </p>
                <label style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                  <input type="checkbox" checked={querFerroEV} onChange={e => setQuerFerroEV(e.target.checked)} style={{ ...checkBox, accentColor:'#E11D48' }} />
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#9F1239' }}>{"COPIAR O PROTOCOLO DE REPOSIÇÃO DE FERRO ENDOVENOSO"}</span>
                </label>
                {querFerroEV && (
                  <div style={{ marginTop:'0.8rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    <button
                      style={{ ...waBtn, background:'#9F1239', marginTop:0 }}
                      onClick={() => setShowFerroEV(true)}
                    >{"Ver o protocolo completo (cálculo da dose) →"}</button>
                    <button
                      style={{ ...waBtn, marginTop:0 }}
                      onClick={() => abrirWhats('Olá! Concluí minha avaliação OBA e desejo solicitar a prescrição médica do protocolo de reposição de Ferro Endovenoso.')}
                    >{"Solicitar a prescrição médica digital →"}</button>
                    <button
                      style={{ ...waBtn, background:'#25D366', marginTop:0 }}
                      onClick={() => { try { window.open('https://wa.me/?text=' + encodeURIComponent(protocoloFerroTexto), '_blank') } catch (e) {} }}
                    >{"Copiar para o meu WhatsApp →"}</button>
                    <button
                      style={{ ...waBtn, background:'#475569', marginTop:0 }}
                      onClick={baixarPdfFerro}
                    >{"Baixar o protocolo em PDF ⬇"}</button>
                    <p style={{ fontSize:'0.72rem', color:'#9F1239', margin:'0.2rem 0 0', lineHeight:1.5 }}>
                      {"A prescrição com assinatura digital sai por "}
                      <strong>{valorPrescricao != null ? `R$ ${valorPrescricao}` : "(valor a confirmar)"}</strong>
                      {"."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CANABINOIDES — oferta de teleconsulta gratuita c/ médico prescritor (>3 sintomas fibro) */}
            {(form.status_fibromialgia || []).length > 3 && (
              <div style={{ background:'#F5F3FF', border:'2px solid #C4B5FD', borderRadius:12, padding:'1rem 1.1rem', marginBottom:'0.9rem' }}>
                <p style={{ fontSize:'0.85rem', fontWeight:800, color:'#6D28D9', margin:'0 0 0.4rem' }}>{"CANABINOIDES MEDICINAIS"}</p>
                <p style={{ fontSize:'0.8rem', color:'#5B21B6', lineHeight:1.5, margin:'0 0 0.7rem' }}>
                  {"Cannabinóides Medicinais podem aliviar os seus sintomas. Se quiser mais informações marque o checkbox abaixo que podemos marcar uma teleconsulta gratuita com um médico prescritor desses produtos."}
                </p>
                <label style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                  <input type="checkbox" checked={querCanabinoide} onChange={e => setQuerCanabinoide(e.target.checked)} style={{ ...checkBox, accentColor:'#7C3AED' }} />
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#6D28D9' }}>{"QUERO UMA TELECONSULTA GRATUITA COM MÉDICO PRESCRITOR"}</span>
                </label>
                {querCanabinoide && (
                  <button style={waBtn} onClick={() => abrirWhats('Olá! Concluí minha avaliação OBA e gostaria de uma teleconsulta gratuita com um médico prescritor de canabinoides medicinais.')}>{"Falar no WhatsApp →"}</button>
                )}
              </div>
            )}

            {/* RESULTADO POR WHATSAPP */}
            <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:12, padding:'1rem 1.1rem' }}>
              <p style={{ fontSize:'0.85rem', fontWeight:800, color:'#166534', margin:'0 0 0.5rem' }}>{"Receber o resultado da sua avaliação"}</p>
              <label style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                <input type="checkbox" checked={querResultado} onChange={e => setQuerResultado(e.target.checked)} style={{ ...checkBox, accentColor:'#16A34A' }} />
                <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#166534' }}>{"QUERO RECEBER O RESULTADO POR WHATSAPP"}</span>
              </label>
              <p style={{ fontSize:'0.74rem', color:'#15803D', margin:'0.5rem 0 0', lineHeight:1.5 }}>
                {"Enviaremos um resumo da sua avaliação (em breve, também em PDF assinado por "}{MEDICO_RESP}{")."}
              </p>
              {querResultado && (
                <button style={waBtn} onClick={() => abrirWhats('Olá! Concluí minha avaliação OBA e gostaria de receber o resultado da minha avaliação.')}>{"Receber no WhatsApp →"}</button>
              )}
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'1.5rem' }}>
              <PlayButton onClick={finalizar} ariaLabel="Finalizar" />
            </div>
            <button style={btnS} onClick={() => setEtapa('relatorio')}>{"← Ver o relatório novamente"}</button>
          </div>
        </div>
      </div>
      </>
    )
  }


  if (etapa === 'relatorio') {
    const rel = relatorio
    const estadoInfo = ESTADO_UI[estadoClinico?.estado] || ESTADO_UI.RAZOAVEL
    const BG_BAND = { position:'absolute', top:0, left:0, right:0, height:360, pointerEvents:'none' }

    // Gatilho do PROTOCOLO DE FERRO ENDOVENOSO. ATENÇÃO: resultadoEritron carrega só
    // { label, color, inputs } (sem diagnostico/recomendacao), por isso o contexto
    // ferropênico é detectado por: FERRITINA BAIXA (< 30), label MICROCÍTICO (marca
    // da ferropenia) ou o motor do OBA sugerindo ferro EV. Gate: Hb abaixo do alvo
    // (por sexo/gestante) e sem sobrecarga (color verde). O bariátrico absorve mal o
    // ferro oral → ferro EV é a via de escolha.
    // Gatilho/dados vêm de `ferroEV` (fonte única definida acima — vale p/ relatório e conclusão).
    const precisaFerroEV = ferroEV.precisa

    // (passo 2) COMPARAÇÃO com a avaliação anterior (follow-up): estado clínico,
    // peso e nível do eritron. Ordens p/ decidir melhora (+1) / piora (-1) / igual (0).
    const cmp = (() => {
      if (!modoFollowUp || !anamneseAnterior) return null
      const ordemEstado = ['CRITICO', 'RUIM', 'RAZOAVEL', 'BOM', 'OTIMO']      // pior → melhor
      const ordemNivel  = ['grave', 'moderado', 'leve', 'normal']             // pior → melhor
      const estAnt = anamneseAnterior.estado_clinico || null
      const estAtu = estadoClinico?.estado || null
      const ie1 = ordemEstado.indexOf(estAnt), ie2 = ordemEstado.indexOf(estAtu)
      const estadoDelta = (ie1 >= 0 && ie2 >= 0) ? Math.sign(ie2 - ie1) : null
      const pesoAnt = anamneseAnterior.peso_atual != null ? Number(anamneseAnterior.peso_atual) : null
      const pesoDelta = (pesoAnt != null && pesoAtual) ? +(pesoAtual - pesoAnt).toFixed(1) : null
      const nivAnt = (anamneseAnterior.relatorio_oba?.modulos || []).find(m => /ERITRON/i.test(m?.titulo || ''))?.nivel || null
      const nivAtu = (rel?.modulos || []).find(m => /ERITRON/i.test(m?.titulo || ''))?.nivel || null
      const in1 = ordemNivel.indexOf(nivAnt), in2 = ordemNivel.indexOf(nivAtu)
      const eritronDelta = (in1 >= 0 && in2 >= 0) ? Math.sign(in2 - in1) : null
      const dataAnt = anamneseAnterior.data_exames || (anamneseAnterior.created_at ? String(anamneseAnterior.created_at).slice(0, 10) : null)
      const dataAntFmt = dataAnt ? String(dataAnt).split('-').reverse().join('/') : null
      const temAlgo = estAnt || pesoAnt != null || nivAnt
      return temAlgo ? { estAnt, estAtu, estadoDelta, pesoAnt, pesoDelta, nivAnt, nivAtu, eritronDelta, dataAntFmt } : null
    })()
    // Cor/seta por delta: +1 melhora (verde ↑), -1 piora (vermelho ↓), 0 igual (cinza →).
    const setaCmp = (d) => d == null ? { txt: '—', cor: '#6B7280' } : d > 0 ? { txt: '↑ melhorou', cor: '#16A34A' } : d < 0 ? { txt: '↓ piorou', cor: '#DC2626' } : { txt: '→ estável', cor: '#6B7280' }

    return (
      <>
      {showFerroEV && (
        <div style={{ position:'relative', zIndex:2000 }}>
          <ModalFerroEV
            onClose={() => setShowFerroEV(false)}
            hbAtual={ferroEV.hb}
            sexo={isFem ? 'F' : 'M'}
            gestante={ferroEV.gestante}
            semanasGestacao={form.semanas_gestacao}
            pesoInicial={pesoAtual || form.peso_atual}
          />
        </div>
      )}
      <div style={OV} onClick={concluirRelatorio}>
        <div
          style={{ ...CD, position:'relative', overflow:'hidden' }}
          onClick={e => e.stopPropagation()}
          onMouseEnter={() => setBgRel(true)} onMouseLeave={() => setBgRel(false)} onTouchStart={() => setBgRel(true)}
        >
          {/* Splash 4DOC \u2014 s\u00f3 quando houver imagem landscape definida (SPLASH_REL_IMG).
              A imagem ocupa a largura do modal (landscape) e fica parcialmente
              sobreposta pelo conte\u00fado. */}
          {SPLASH_REL_IMG && (
            <>
              {/* Fundo esmaecido (revela no hover), atr\u00e1s do conte\u00fado */}
              <div aria-hidden="true" style={{ ...BG_BAND, backgroundImage:`url(${SPLASH_REL_IMG})`, backgroundSize:'100% auto', backgroundPosition:'center top', backgroundRepeat:'no-repeat', filter: bgRel ? 'blur(0px)' : 'blur(10px)', opacity: bgRel ? 0.5 : 0.12, transition:'filter 0.6s ease, opacity 0.6s ease' }} />

              {/* SPLASH: imagem n\u00edtida por 3s */}
              <div aria-hidden="true" style={{ position:'absolute', inset:0, zIndex:5, background:'#FDF7F7', opacity: splashRel ? 1 : 0, pointerEvents: splashRel ? 'auto' : 'none', transition:'opacity 0.5s ease' }}>
                <div style={{ ...BG_BAND, backgroundImage:`url(${SPLASH_REL_IMG})`, backgroundSize:'100% auto', backgroundPosition:'center top', backgroundRepeat:'no-repeat' }} />
                <div style={{ position:'absolute', left:0, right:0, top:300, textAlign:'center', padding:'0 1.5rem' }}>
                  <p style={{ color:'#7B1E1E', fontSize:'1.1rem', fontWeight:800, margin:0 }}>{"Preparando a sua avalia\u00e7\u00e3o\u2026"}</p>
                </div>
              </div>
            </>
          )}

          {/* Header (zIndex 10 p/ aparecer durante o splash) */}
          <div style={{ position:'relative', zIndex:10 }}>
            <Header titulo={TITULO_RESULTADO} sub={"ANAMNESE ASSISTIDA POR IA"} semFada />
          </div>

          {/* Conte\u00fado do relat\u00f3rio */}
          <div style={{ position:'relative', zIndex:1, padding:'1.5rem', boxSizing:'border-box', width:'100%', overflowX:'hidden' }}>
            {SPLASH_REL_IMG && <div style={{ height:200 }} />}

            {!rel ? (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECDD3', borderRadius:10, padding:'1rem' }}>
                <p style={{ color:'#7B1E1E', fontWeight:700, fontSize:'0.9rem', margin:0 }}>{"N\u00e3o foi poss\u00edvel gerar a avalia\u00e7\u00e3o (eritron indispon\u00edvel). Refa\u00e7a ap\u00f3s uma avalia\u00e7\u00e3o do Projeto OBA\u00ae."}</p>
              </div>
            ) : (
              <>
                {/* T\u00edtulo de abertura do baseline */}
                <p style={{ fontSize:'1.05rem', fontWeight:900, color:'#7B1E1E', textAlign:'center', margin:'0 0 0.3rem', lineHeight:1.35 }}>
                  {"AGORA TEMOS UM CONHECIMENTO CL\u00cdNICO SOBRE VOC\u00ca"}
                </p>
                <p style={{ fontSize:'0.72rem', color:'#6B7280', textAlign:'center', fontWeight:700, margin:'0 0 1rem' }}>{"Avalia\u00e7\u00e3o de "}{rel.dataAvaliacao}</p>

                {/* ESTADO GERAL CL\u00cdNICO \u2014 hero */}
                <div style={{ background: estadoInfo.fundo, border:`2px solid ${estadoInfo.borda}`, borderRadius:16, padding:'1.2rem 1.4rem', textAlign:'center' }}>
                  <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1.5px', color:estadoInfo.cor, margin:0, opacity:0.8 }}>{"Estado geral cl\u00ednico"}</p>
                  <p style={{ fontSize:'2rem', fontWeight:900, color:estadoInfo.cor, margin:'0.2rem 0' }}>{estadoInfo.emoji} {estadoInfo.rotulo}</p>
                  {estadoClinico?.motivo && <p style={{ fontSize:'0.82rem', color:estadoInfo.cor, margin:0, lineHeight:1.5 }}>{estadoClinico.motivo}</p>}
                  {estadoClinico?.provisorio && (
                    <p style={{ fontSize:'0.72rem', color:'#92400E', background:'#FEFCE8', border:'1px solid #FDE68A', borderRadius:8, padding:'0.4rem 0.6rem', marginTop:'0.6rem', display:'inline-block' }}>
                      {(form.duvidas || []).length > 0
                        ? "\u26a0 Classifica\u00e7\u00e3o PROVIS\u00d3RIA \u2014 h\u00e1 pontos que voc\u00ea marcou como d\u00favida; ela pode mudar ao esclarec\u00ea-los."
                        : "\u26a0 Classifica\u00e7\u00e3o PROVIS\u00d3RIA \u2014 complete seus exames para um retrato preciso."}
                    </p>
                  )}
                </div>

                {/* Term\u00f4metro do estado */}
                <div style={{ display:'flex', gap:'0.3rem', marginTop:'0.8rem' }}>
                  {ESTADOS_CLINICOS.map(e => {
                    const ui = ESTADO_UI[e]
                    const ativo = estadoClinico?.estado === e
                    return (
                      <div key={e} style={{ flex:1, textAlign:'center', padding:'0.4rem 0.2rem', borderRadius:8, background: ativo ? ui.cor : '#F3F4F6', color: ativo ? 'white' : '#9CA3AF', fontSize:'0.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        {ui.rotulo}
                      </div>
                    )
                  })}
                </div>

                {/* CTA TELECONSULTA — só para estado RUIM ou CRÍTICO */}
                {(estadoClinico?.estado === 'RUIM' || estadoClinico?.estado === 'CRITICO') && (
                  <div style={{ background:'#FEF2F2', border:'2px solid #FCA5A5', borderRadius:12, padding:'1rem 1.1rem', marginTop:'1rem' }}>
                    <p style={{ fontSize:'0.85rem', fontWeight:800, color:'#991B1B', margin:'0 0 0.4rem' }}>
                      {"Recomendamos uma TELECONSULTA MÉDICA"}
                    </p>
                    <p style={{ fontSize:'0.8rem', color:'#7F1D1D', lineHeight:1.5, margin:'0 0 0.7rem' }}>
                      {"Seu estado clínico atual merece atenção próxima. A plataforma oferece teleconsulta médica via WhatsApp para discutir seus resultados e as condutas."}
                    </p>
                    <label style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                      <input type="checkbox" checked={querTeleconsulta} onChange={e => setQuerTeleconsulta(e.target.checked)} style={{ width:'1.1rem', height:'1.1rem', marginTop:'0.1rem', accentColor:'#DC2626' }} />
                      <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#991B1B' }}>{"SIM, DESEJO MARCAR UMA TELECONSULTA"}</span>
                    </label>
                    {querTeleconsulta && (
                      <div style={{ marginTop:'0.8rem', background:'white', border:'1px solid #FECDD3', borderRadius:10, padding:'0.8rem 0.9rem' }}>
                        <p style={{ fontSize:'0.8rem', color:'#374151', margin:'0 0 0.6rem' }}>
                          {"Valor da teleconsulta: "}
                          <strong style={{ color:'#7B1E1E' }}>{valorTeleconsulta != null ? `R$ ${valorTeleconsulta}` : "a confirmar"}</strong>
                        </p>
                        <a
                          href={`https://wa.me/5571997110804?text=${encodeURIComponent('Olá! Concluí minha avaliação OBA e desejo marcar uma teleconsulta médica.')}`}
                          target="_blank" rel="noreferrer"
                          style={{ display:'inline-block', background:'#16a34a', color:'white', fontWeight:800, fontSize:'0.82rem', padding:'0.6rem 1rem', borderRadius:10, textDecoration:'none' }}
                        >
                          {"Falar no WhatsApp →"}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Linha-resumo da cirurgia */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginTop:'1rem' }}>
                  {[
                    ['Cirurgia', rel.tipoCirurgia],
                    ["P\u00f3s-op", rel.mesesPosCirurgia ? `${rel.mesesPosCirurgia} meses` : "\u2014"],
                    ["Disabsor\u00e7\u00e3o", `grau ${rel.grauDisabsorcao}`],
                    ['Data', rel.dataAvaliacao],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8, padding:'0.4rem 0.7rem' }}>
                      <span style={{ fontSize:'0.62rem', color:'#9CA3AF', fontWeight:700, textTransform:'uppercase' }}>{k}: </span>
                      <span style={{ fontSize:'0.78rem', color:'#374151', fontWeight:700 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* (passo 2) EVOLU\u00c7\u00c3O desde a \u00faltima avalia\u00e7\u00e3o (s\u00f3 no follow-up) */}
                {cmp && (
                  <>
                    <SectionTitle>{"Evolu\u00e7\u00e3o desde a \u00faltima avalia\u00e7\u00e3o"}</SectionTitle>
                    {cmp.dataAntFmt && (
                      <p style={{ fontSize:'0.72rem', color:'#6B7280', margin:'0 0 0.5rem' }}>{"Comparado com "}{cmp.dataAntFmt}{":"}</p>
                    )}
                    <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap:'0.4rem' }}>
                      {/* Estado cl\u00ednico */}
                      <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8, padding:'0.5rem 0.6rem' }}>
                        <p style={{ fontSize:'0.6rem', color:'#9CA3AF', fontWeight:700, textTransform:'uppercase', margin:'0 0 0.2rem' }}>{"Estado cl\u00ednico"}</p>
                        <p style={{ fontSize:'0.74rem', color:'#374151', fontWeight:700, margin:0 }}>{cmp.estAnt || '\u2014'}{" \u2192 "}{cmp.estAtu || '\u2014'}</p>
                        <p style={{ fontSize:'0.66rem', fontWeight:800, color:setaCmp(cmp.estadoDelta).cor, margin:'0.15rem 0 0' }}>{setaCmp(cmp.estadoDelta).txt}</p>
                      </div>
                      {/* Peso atual */}
                      <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8, padding:'0.5rem 0.6rem' }}>
                        <p style={{ fontSize:'0.6rem', color:'#9CA3AF', fontWeight:700, textTransform:'uppercase', margin:'0 0 0.2rem' }}>{"Peso atual"}</p>
                        <p style={{ fontSize:'0.74rem', color:'#374151', fontWeight:700, margin:0 }}>
                          {cmp.pesoAnt != null ? `${cmp.pesoAnt} \u2192 ` : ''}{pesoAtual ? `${pesoAtual} kg` : '\u2014'}
                        </p>
                        <p style={{ fontSize:'0.66rem', fontWeight:800, color: cmp.pesoDelta == null ? '#6B7280' : cmp.pesoDelta < 0 ? '#16A34A' : cmp.pesoDelta > 0 ? '#DC2626' : '#6B7280', margin:'0.15rem 0 0' }}>
                          {cmp.pesoDelta == null ? '\u2014' : cmp.pesoDelta === 0 ? '\u2192 est\u00e1vel' : `${cmp.pesoDelta > 0 ? '\u2191 +' : '\u2193 '}${Math.abs(cmp.pesoDelta)} kg`}
                        </p>
                      </div>
                      {/* Eritron */}
                      <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8, padding:'0.5rem 0.6rem' }}>
                        <p style={{ fontSize:'0.6rem', color:'#9CA3AF', fontWeight:700, textTransform:'uppercase', margin:'0 0 0.2rem' }}>{"Eritron"}</p>
                        <p style={{ fontSize:'0.74rem', color:'#374151', fontWeight:700, margin:0 }}>{(cmp.nivAnt || '\u2014')}{" \u2192 "}{(cmp.nivAtu || '\u2014')}</p>
                        <p style={{ fontSize:'0.66rem', fontWeight:800, color:setaCmp(cmp.eritronDelta).cor, margin:'0.15rem 0 0' }}>{setaCmp(cmp.eritronDelta).txt}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* PONTOS EM D\u00daVIDA \u2014 o paciente marcou "n\u00e3o tenho certeza" nestas se\u00e7\u00f5es.
                    Oferta pr\u00f3pria de teleconsulta de esclarecimento (independe do estado). */}
                {(form.duvidas || []).length > 0 && (
                  <div style={{ background:'#FFFBEB', border:'2px solid #FDE68A', borderRadius:12, padding:'1rem 1.1rem', marginTop:'1rem' }}>
                    <p style={{ fontSize:'0.85rem', fontWeight:800, color:'#92400E', margin:'0 0 0.4rem' }}>{"Pontos que voc\u00ea marcou como d\u00favida"}</p>
                    <ul style={{ margin:'0 0 0.6rem', paddingLeft:'1.1rem' }}>
                      {(form.duvidas || []).map(s => (
                        <li key={s} style={{ fontSize:'0.78rem', color:'#78350F', lineHeight:1.5 }}>{DUVIDA_SECOES[s] || s}</li>
                      ))}
                    </ul>
                    <p style={{ fontSize:'0.78rem', color:'#78350F', lineHeight:1.5, margin:'0 0 0.7rem' }}>
                      {"Uma TELECONSULTA M\u00c9DICA pode esclarecer estes pontos e deixar as suas informa\u00e7\u00f5es mais precisas \u2014 quanto mais precisas, melhor o algoritmo otimiza a sua sa\u00fade."}
                    </p>
                    <label style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                      <input type="checkbox" checked={querTeleDuvida} onChange={e => setQuerTeleDuvida(e.target.checked)} style={{ width:'1.1rem', height:'1.1rem', marginTop:'0.1rem', accentColor:'#92400E', flexShrink:0 }} />
                      <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#92400E' }}>{"QUERO UMA TELECONSULTA PARA ESCLARECER ESTES PONTOS"}</span>
                    </label>
                    {querTeleDuvida ? (
                      <div style={{ marginTop:'0.7rem' }}>
                        <p style={{ fontSize:'0.76rem', color:'#78350F', lineHeight:1.5, margin:'0 0 0.5rem' }}>
                          {"Um relat\u00f3rio com estas d\u00favidas ficar\u00e1 no sistema para o profissional te ajudar durante a teleconsulta."}
                        </p>
                        <a href={`https://wa.me/5571997110804?text=${encodeURIComponent('Ol\u00e1! Conclu\u00ed minha avalia\u00e7\u00e3o OBA e gostaria de uma teleconsulta para esclarecer alguns pontos que marquei como d\u00favida.')}`} target="_blank" rel="noreferrer" style={{ display:'inline-block', background:'#16a34a', color:'white', fontWeight:800, fontSize:'0.82rem', padding:'0.6rem 1rem', borderRadius:10, textDecoration:'none' }}>{"Falar no WhatsApp \u2192"}</a>
                      </div>
                    ) : (
                      <p style={{ fontSize:'0.76rem', color:'#78350F', lineHeight:1.5, margin:'0.6rem 0 0' }}>
                        {"Se preferir n\u00e3o fazer a teleconsulta agora, estes pontos ficam marcados para voc\u00ea esclarecer com o seu m\u00e9dico e depois voltar e EDITAR a anamnese."}
                      </p>
                    )}
                  </div>
                )}

                {(form.outra_condicao || '').trim() && (
                  <div style={{ background:'#EFF6FF', border:'2px solid #BFDBFE', borderRadius:12, padding:'1rem 1.1rem', marginTop:'1rem' }}>
                    <p style={{ fontSize:'0.85rem', fontWeight:800, color:'#1E40AF', margin:'0 0 0.5rem' }}>{"Condi\u00e7\u00e3o informada por voc\u00ea"}</p>
                    <p style={{ fontSize:'0.8rem', color:'#1E3A8A', lineHeight:1.5, margin:'0 0 0.6rem' }}>{"Voc\u00ea informou a condi\u00e7\u00e3o cl\u00ednica abaixo. Recomendamos uma Teleconsulta m\u00e9dica para que seja melhor avaliada."}</p>
                    <p style={{ fontSize:'0.82rem', color:'#111827', lineHeight:1.5, margin:0, whiteSpace:'pre-wrap', background:'white', border:'1px solid #DBEAFE', borderRadius:8, padding:'0.6rem 0.7rem' }}>{form.outra_condicao}</p>
                  </div>
                )}

                {/* ALERTAS */}
                <SectionTitle>{"Pontos de aten\u00e7\u00e3o"}</SectionTitle>
                {(rel.alertas && rel.alertas.length > 0) ? (
                  rel.alertas.map((a, i) => {
                    const ui = NIVEL_UI[a.nivel] || NIVEL_UI.normal
                    return (
                      <div key={i} style={{ background:ui.fundo, border:`1.5px solid ${ui.borda}`, borderRadius:10, padding:'0.7rem 0.9rem', marginBottom:'0.5rem', display:'flex', gap:'0.6rem' }}>
                        <span style={{ fontSize:'0.6rem', fontWeight:800, color:'white', background:ui.botao, borderRadius:6, padding:'0.2rem 0.4rem', height:'fit-content', minWidth:'4.5rem', textAlign:'center', boxSizing:'border-box', whiteSpace:'nowrap' }}>{ui.rotulo}</span>
                        <span style={{ fontSize:'0.74rem', color:ui.texto, fontWeight:600, lineHeight:1.4 }}>{a.texto}</span>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'0.7rem 0.9rem' }}>
                    <p style={{ fontSize:'0.82rem', color:'#166534', fontWeight:700, margin:0 }}>{"\u2713 Nenhum alerta relevante identificado."}</p>
                  </div>
                )}

                {/* M\u00d3DULOS */}
                <SectionTitle>{"An\u00e1lise detalhada"}</SectionTitle>
                {(rel.modulos || []).map((m, i) => {
                  const ui = NIVEL_UI[m.nivel] || NIVEL_UI.normal
                  return (
                    <div key={i}>
                      <div style={{ border:`1.5px solid ${ui.borda}`, borderRadius:10, marginBottom:'0.6rem', overflow:'hidden' }}>
                        <div style={{ background:ui.fundo, padding:'0.6rem 0.9rem', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem' }}>
                          <span style={{ fontSize:'0.78rem', fontWeight:800, color:ui.texto, textTransform:'uppercase', letterSpacing:'0.3px' }}>{m.titulo}</span>
                          <span style={{ fontSize:'0.58rem', fontWeight:800, color:'white', background:ui.botao, borderRadius:6, padding:'0.2rem 0.4rem', minWidth:'4.4rem', textAlign:'center', boxSizing:'border-box', whiteSpace:'nowrap' }}>{ui.rotulo}</span>
                        </div>
                        <div style={{ padding:'0.7rem 0.9rem', background:'white' }}>
                          {(m.linhas || []).map((l, j) => (
                            <p key={j} style={{ fontSize:'0.72rem', color:'#374151', lineHeight:1.5, marginBottom: j < m.linhas.length - 1 ? '0.5rem' : 0 }}>{l}</p>
                          ))}
                        </div>
                      </div>
                      {/* PROTOCOLO DE FERRO ENDOVENOSO logo abaixo do módulo ERITRON */}
                      {/ERITRON/i.test(m.titulo || '') && precisaFerroEV && (
                        <button onClick={() => setShowFerroEV(true)}
                          style={{ width:'100%', marginBottom:'0.8rem', background:'#FEF2F2', border:'2px solid #FCA5A5', color:'#991B1B', fontWeight:800, fontSize:'0.85rem', padding:'0.8rem', borderRadius:12, cursor:'pointer', fontFamily:'inherit' }}>
                          {"💉 Como repor o Ferro Endovenoso"}
                        </button>
                      )}
                    </div>
                  )
                })}

                {/* RECOMENDA\u00c7\u00d5ES \u2014 cards separados por categoria de exame/conduta */}
                {(rel.examesComplementares && rel.examesComplementares.length > 0) && (() => {
                  const grupos = {}
                  rel.examesComplementares.forEach(ex => {
                    const c = categoriaRecomendacao(ex)
                    ;(grupos[c] = grupos[c] || []).push(ex)
                  })
                  return (
                    <>
                      <SectionTitle>{"Recomenda\u00e7\u00f5es"}</SectionTitle>
                      {CATS_RECOMENDACAO.filter(c => grupos[c.key]?.length).map(c => {
                        // n\u00e3o repete itens id\u00eanticos ao t\u00edtulo (caso do MAPA, cujo
                        // t\u00edtulo j\u00e1 \u00e9 a pr\u00f3pria recomenda\u00e7\u00e3o).
                        const itens = grupos[c.key].filter(ex => String(ex).trim().toUpperCase() !== c.titulo.trim().toUpperCase())
                        return (
                          <div key={c.key} style={{ marginBottom:'0.7rem' }}>
                            {/* (d) t\u00edtulo FORA do card */}
                            <p style={{ fontSize:'0.68rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px', color:c.texto, margin:'0 0 0.3rem' }}>{c.titulo}</p>
                            {itens.length > 0 && (
                              <div style={{ background:c.fundo, border:`1px solid ${c.borda}`, borderRadius:10, padding:'0.7rem 1rem' }}>
                                {itens.map((ex, i) => (
                                  // bullet em coluna pr\u00f3pria \u2192 o texto que quebra alinha abaixo, ap\u00f3s o ponto (indenta\u00e7\u00e3o pendente).
                                  <p key={i} style={{ display:'flex', gap:'0.35rem', fontSize:'0.68rem', color:c.texto, fontWeight:600, lineHeight:1.5, margin: i < itens.length - 1 ? '0 0 0.3rem' : 0 }}>
                                    <span aria-hidden="true">{"\u2022"}</span><span style={{ flex:1 }}>{ex}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </>
                  )
                })()}

              </>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'1.5rem' }}>
              <PlayButton
                onClick={concluirRelatorio}
                label={"CONCLUIR"}
                hint={"Ver recomendações e opções"}
                ariaLabel="Concluir e ver recomendações"
              />
            </div>
          </div>
        </div>
      </div>
      </>
    )
  }


  // (d) Eritron de NOVA data: se a data dos exames for diferente da data do hemograma
  // da triagem, abrimos campos no topo p/ relançar HB/VCM/RDW/Ferritina/Sat. E
  // Ferritina/Sat. também aparecem (sozinhas) se a triagem não as tiver trazido.
  const _temRF = !!(examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina))
  const _dataExCompleta = String(exAno).length === 4 && !!exMes && !!exDia
  const novaDataExames = !!(_dataExCompleta && examesRedFairy?.dataColeta && dataExames && dataExames !== examesRedFairy.dataColeta)
  const ERITRON_NOVO_TODOS = [
    { key:'hb_novo', label:'Hemoglobina', unit:'g/dL' },
    { key:'vcm_novo', label:'VCM', unit:'fL' },
    { key:'rdw_novo', label:'RDW', unit:'%' },
    { key:'ferritina_novo', label:'Ferritina', unit:'ng/mL' },
    { key:'sat_novo', label:"Sat. Transferrina", unit:'%' },
  ]
  let eritronNovoFields = []
  if (coletarHemograma && modoMedico) {
    // MÉDICO: Hb/VCM/RDW já foram lançados na ETAPA 'eritron' (topo do fluxo); aqui só ferritina/sat.
    eritronNovoFields = [ERITRON_NOVO_TODOS[3], ERITRON_NOVO_TODOS[4]]
  } else if (coletarHemograma) {
    // PACIENTE (sem a etapa 'eritron'): coleta o hemograma COMPLETO aqui, nos exames (como no original).
    eritronNovoFields = ERITRON_NOVO_TODOS
  } else if (novaDataExames) {
    eritronNovoFields = ERITRON_NOVO_TODOS
  } else if (_temRF) {
    if (!examesRedFairy.ferritina) eritronNovoFields.push(ERITRON_NOVO_TODOS[3])
    if (!examesRedFairy.satTransf) eritronNovoFields.push(ERITRON_NOVO_TODOS[4])
  }
  // Onde fica o "primeiro campo dos exames" (alvo do salto após o ANO): o 1º campo do
  // bloco eritron-novo se ele existir, senão o 1º campo da grade (Leucócitos).
  const primeiroExameGridKey = eritronNovoFields.length ? null : 'leucocitos'
  // Só os indicadores de ferro (ferritina/sat) — sem hb/vcm/rdw → grupo "Reserva de Ferro".
  const soFerro = eritronNovoFields.length > 0 && eritronNovoFields.every(f => f.key === 'ferritina_novo' || f.key === 'sat_novo')

  if (etapa === 'eritron') return (
    <div style={OV}>
      <div style={CD} onClick={e => e.stopPropagation()}>
        <Header titulo={"Hemograma | OBA®"} sub={subPaciente} semFada />
        <div style={{ padding:'1.5rem', boxSizing:'border-box', width:'100%', overflowX:'hidden' }}>
          <p style={{ fontSize:'0.85rem', color:'#374151', marginBottom:'1rem', lineHeight:1.5 }}>
            {"Lance a DATA e o HEMOGRAMA do paciente (Hemoglobina, VCM e RDW)."}
          </p>
          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#374151', marginBottom:'0.5rem' }}>{"Data do hemograma"}</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.5fr', gap:'0.5rem', marginBottom:'1.1rem' }}>
            <div><label style={{ fontSize:'0.7rem', color:'#9CA3AF', fontWeight:600 }}>{"DIA"}</label>
              <input ref={refExDia} style={inpA} onWheel={noWheel} type="number" min="1" max="31" placeholder="DD" value={exDia}
                onChange={e => { setExDia(e.target.value); saltoPorDigitos(e.target.value, refExMes, 2) }} /></div>
            <div><label style={{ fontSize:'0.7rem', color:'#9CA3AF', fontWeight:600 }}>{"MÊS"}</label>
              <input ref={refExMes} style={inpA} onWheel={noWheel} type="number" min="1" max="12" placeholder="MM" value={exMes}
                onChange={e => { setExMes(e.target.value); saltoPorDigitos(e.target.value, refExAno, 2) }} /></div>
            <div><label style={{ fontSize:'0.7rem', color:'#374151', fontWeight:700 }}>{"ANO"}</label>
              <input ref={refExAno} style={inpA} onWheel={noWheel} type="number" min="2000" max="2030" placeholder="AAAA" value={exAno}
                onChange={e => setExAno(e.target.value)} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:'0.5rem' }}>
            {[{ k:'hb_novo', l:'Hemoglobina', u:'g/dL' }, { k:'vcm_novo', l:'VCM', u:'fL' }, { k:'rdw_novo', l:'RDW', u:'%' }].map(f => (
              <div key={f.k} style={{ display:'flex', flexDirection:'column', background:'#FEFCE8', border:'1.5px solid #FDE68A', borderRadius:7, padding:'0.3rem 0.38rem' }}>
                <span style={{ fontSize:'0.74rem', fontWeight:600, color:'#1F2937', lineHeight:1.15 }}>{f.l}</span>
                <span style={{ fontSize:'0.66rem', fontWeight:600, color:'#4B5563', lineHeight:1.1 }}>{f.u}</span>
                <input className="oba-exame-input" onWheel={noWheel} style={{ width:'100%', border:'1.5px solid #FACC15', borderRadius:5, padding:'0.3rem 0.34rem', fontSize:'0.92rem', fontWeight:700, outline:'none', textAlign:'right', fontFamily:'inherit', background:'#FFFDF5', color:'#111827', boxSizing:'border-box' }}
                  type="text" inputMode="decimal" value={exames[f.k] || ''} onChange={e => handleExameChangeOBA(f.k, e.target.value)} />
              </div>
            ))}
          </div>
          {erro && <p style={{ color:'#DC2626', fontSize:'0.8rem', fontWeight:700, marginTop:'0.8rem' }}>{erro}</p>}
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'1.3rem' }}>
            <PlayButton onClick={verAchadosEritron} label={"VER ACHADOS"} ringColor="rgba(250,204,21,0.75)" />
          </div>
        </div>
      </div>
      {showEritronPopup && eritronPopup && (
        <div style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#fff', borderRadius:16, maxWidth:380, width:'100%', overflow:'hidden', boxShadow:'0 10px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ background: corEritron(eritronPopup.color), padding:'1rem 1.2rem' }}>
              <p style={{ color:'#fff', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', margin:0, opacity:0.9 }}>{"Achados do Eritron"}</p>
              <p style={{ color:'#fff', fontSize:'1.05rem', fontWeight:900, margin:'0.2rem 0 0', lineHeight:1.2 }}>{eritronPopup.label || 'Eritrograma'}</p>
            </div>
            <div style={{ padding:'1.2rem' }}>
              <p style={{ fontSize:'0.85rem', color:'#374151', lineHeight:1.5, margin:'0 0 1rem' }}>
                {"Esse é o resultado da leitura do eritron. Você pode CONTINUAR a avaliação (anamnese + exames) agora, ou ENCERRAR e deixar o paciente completar a anamnese depois."}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                <button onClick={() => { setShowEritronPopup(false); setEtapa('anamnese') }} style={{ background:'#6B7280', color:'#facc15', border:'none', borderRadius:10, padding:'0.7rem', fontSize:'0.9rem', fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>{"CONTINUAR A AVALIAÇÃO"}</button>
                <button onClick={encerrarAvaliacao} style={{ background:'#fff', color:'#6B7280', border:'1.5px solid #D1D5DB', borderRadius:10, padding:'0.7rem', fontSize:'0.85rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>{"ENCERRAR (paciente completa depois)"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (etapa === 'exames') return (
    <div style={OV} onClick={pularExames}>
      {duvidaPopupEl}
      <div style={CD} onClick={e => e.stopPropagation()}>
        <Header titulo={"Exames | OBA®"} sub={subPaciente} semFada />
        <div style={{ padding:'1.5rem', boxSizing:'border-box', width:'100%', overflowX:'hidden' }}>

          <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
            <p style={{ fontSize:'0.8rem', fontWeight:700, color:'#166534', margin:0 }}>
              {"\u2713 Anamnese salva com sucesso!"}
            </p>
            <p style={{ fontSize:'0.75rem', color:'#15803D', marginTop:'0.3rem' }}>
              {coletarHemograma
                ? "Digite o seu novo HEMOGRAMA (Hemoglobina, VCM e RDW s\u00e3o obrigat\u00f3rios) e os exames que tiver em m\u00e3os."
                : "Preencha os exames que tiver em m\u00e3os. Pode pular se n\u00e3o tiver agora."}
            </p>
          </div>

          {examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && (
            <div style={{ background:'#FEF2F2', border:'1.5px solid #DC2626', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
              <p style={{ fontSize:'0.8rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.4px', color:'#7B1E1E', margin:'0 0 0.15rem' }}>
                {"VALORES DA TRIAGEM | ERITROGRAMA"}
              </p>
              <p style={{ fontSize:'0.62rem', fontWeight:700, letterSpacing:'1px', color:'#9F1239', marginBottom:'0.6rem' }}>
                {"\ud83d\udd12 SOMENTE LEITURA"}
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
            <div style={{ background:'#EFF6FF', border:'1.5px solid #2563EB', borderRadius:10, padding:'0.9rem 1rem', marginBottom:'1rem' }}>
              <p style={{ color:'#1E3A8A', fontSize:'0.8rem', lineHeight:'1.5', marginBottom:'0.8rem' }}>
                {"Se, na data em que voc\u00ea realizou o hemograma inicial, tamb\u00e9m fez alguns desses exames, pode inserir os resultados na plataforma. De todo modo, \u00e9 recomend\u00e1vel repetir ou complementar os exames em cerca de duas semanas, e, se desejar, podemos emitir a solicita\u00e7\u00e3o m\u00e9dica mediante o pagamento de uma pequena taxa. Isso costuma valer muito a pena, pois economiza tempo, reduz custos de deslocamento e evita a necessidade de uma nova consulta presencial apenas para esse fim. Se preferir, a plataforma tamb\u00e9m poder\u00e1 disponibilizar uma teleconsulta m\u00e9dica, especialmente caso os exames apresentem altera\u00e7\u00f5es mais significativas."}
              </p>
              <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', userSelect:'none' }}>
                <input
                  type="checkbox"
                  checked={form.temExamesMesmaData}
                  onChange={e => {
                    const checked = e.target.checked
                    sf('temExamesMesmaData', checked)
                    if (checked && examesRedFairy?.dataColeta) {
                      const [a, m, d] = examesRedFairy.dataColeta.split('-')
                      setExAno(a || ''); setExMes(m || ''); setExDia(d || '')
                    } else if (!checked) {
                      // Desmarcou → limpa a DATA DOS EXAMES (eram da data do hemograma).
                      setExAno(''); setExMes(''); setExDia('')
                    }
                  }}
                  style={{ width:'1.1rem', height:'1.1rem', accentColor:'#2563EB' }}
                />
                <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#7B1E1E' }}>
                  {"OS EXAMES QUE VOU DIGITAR SÃO DA MESMA DATA DO HEMOGRAMA ACIMA"}
                </span>
              </label>
              <p style={{ fontSize:'0.74rem', color:'#1E40AF', margin:'0.45rem 0 0', lineHeight:1.4 }}>
                {"Se são exames mais recentes, digite a nova data no campo abaixo."}
              </p>
            </div>
          )}

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#374151', marginBottom:'0.5rem' }}>Data dos exames</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.5fr', gap:'0.5rem' }}>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#9CA3AF', fontWeight:600 }}>DIA</label>
              <input ref={refExDia} style={inpA} onWheel={noWheel} type="number" min="1" max="31" placeholder="DD" value={exDia}
                onChange={e => { setExDia(e.target.value); saltoPorDigitos(e.target.value, refExMes, 2) }} onFocus={() => agendarSalto(null)} />
            </div>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#9CA3AF', fontWeight:600 }}>{"MÊS"}</label>
              <input ref={refExMes} style={inpA} onWheel={noWheel} type="number" min="1" max="12" placeholder="MM" value={exMes}
                onChange={e => { setExMes(e.target.value); saltoPorDigitos(e.target.value, refExAno, 2) }} onFocus={() => agendarSalto(null)} />
            </div>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#374151', fontWeight:700 }}>{"ANO"}</label>
              <input ref={refExAno} style={inpA} onWheel={noWheel} type="number" min="2000" max="2030" placeholder="AAAA" value={exAno}
                onChange={e => { setExAno(e.target.value); saltoPorDigitos(e.target.value, refPrimeiroExame, 4) }} onFocus={() => agendarSalto(null)} />
            </div>
          </div>
          {diasExames !== null && (
            <div style={{ background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:8, padding:'0.5rem 0.9rem', marginTop:'0.4rem', marginBottom:'0.8rem' }}>
              <p style={{ color:'#0369A1', fontSize:'0.85rem', fontWeight:700 }}>
                {diasExames === 0 ? 'Exames de hoje' : `Realizados h\u00e1 ${diasExames} dia${diasExames > 1 ? 's' : ''}`}
              </p>
            </div>
          )}

          {/* (d) Eritron de NOVA data / faltante na triagem \u2014 campos no TOPO dos exames. */}
          {eritronNovoFields.length > 0 && (
            <div style={{ margin:'0.2rem 0 0.9rem' }}>
              <p style={{ fontSize:'0.78rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.4px', color:'#7B1E1E', margin:'0 0 0.4rem' }}>
                {soFerro
                  ? "Indicadores | Reserva de Ferro"
                  : (novaDataExames ? "Lance os valores atualizados do eritron:" : "Lance os valores do eritron:")}
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:'0.3rem' }}>
                {eritronNovoFields.map((ex, i) => {
                  const ehFerro = ex.key === 'ferritina_novo' || ex.key === 'sat_novo'
                  return (
                  <div key={ex.key} style={{ display:'flex', flexDirection:'column', background:'#FEFCE8', border: ehFerro ? '1.5px solid #7B1E1E' : '1.5px solid #FDE68A', borderRadius:7, padding:'0.3rem 0.38rem' }}>
                    <span style={{ fontSize:'0.74rem', fontWeight:600, color:'#1F2937', lineHeight:1.15 }}>{ex.label}</span>
                    <span style={{ fontSize:'0.66rem', fontWeight:600, color:'#4B5563', minHeight:'0.72rem', lineHeight:1.1 }}>{ex.unit}</span>
                    <input
                      ref={i === 0 ? refPrimeiroExame : null}
                      className="oba-exame-input"
                      onWheel={noWheel}
                      style={{ width:'100%', border:'1.5px solid #FACC15', borderRadius:5, padding:'0.3rem 0.34rem', fontSize:'0.92rem', fontWeight:700, outline:'none', textAlign:'right', fontFamily:'inherit', background:'#FFFDF5', color:'#111827', boxSizing:'border-box' }}
                      type="text" inputMode="decimal"
                      value={exames[ex.key] || ''}
                      onChange={e => handleExameChangeOBA(ex.key, e.target.value)} />
                  </div>
                  )
                })}
                {soFerro && (
                  <div style={{ display:'flex', flexDirection:'column', background:'#FEFCE8', border:'1.5px solid #FDE68A', borderRadius:7, padding:'0.3rem 0.38rem' }}>
                    <span style={{ fontSize:'0.74rem', fontWeight:600, color:'#1F2937', lineHeight:1.15 }}>{"Ferro s\u00e9rico"}</span>
                    <span style={{ fontSize:'0.66rem', fontWeight:600, color:'#4B5563', minHeight:'0.72rem', lineHeight:1.1 }}>{"\u00b5g/dL"}</span>
                    <input className="oba-exame-input" onWheel={noWheel}
                      style={{ width:'100%', border:'1.5px solid #FACC15', borderRadius:5, padding:'0.3rem 0.34rem', fontSize:'0.92rem', fontWeight:700, outline:'none', textAlign:'right', fontFamily:'inherit', background:'#FFFDF5', color:'#111827', boxSizing:'border-box' }}
                      type="text" inputMode="decimal"
                      value={exames.ferro_serico || ''}
                      onChange={e => handleExameChangeOBA('ferro_serico', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* V.R. (por sexo) + unidade entram como M\u00c1SCARA do campo; classifica\u00e7\u00e3o
              vira um ponto colorido ap\u00f3s o input (verde=normal, \u00e2mbar=lim\u00edtrofe,
              vermelho=alterado). 3 colunas, campos amarelos. Sem seamless aqui. */}
          <style>{`
            .oba-exame-input::placeholder{font-size:0.5rem;color:#9CA3AF;font-weight:500;}
            .oba-exame-input::-webkit-outer-spin-button,
            .oba-exame-input::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
            .oba-exame-input{ -moz-appearance:textfield; appearance:textfield; }
            .oba-exame-input::placeholder{ color:#B5BBC3; opacity:1; font-size:0.76rem; }
          `}</style>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:'0.3rem' }}>
            {todosExames.filter(ex => !(examesRedFairy && (examesRedFairy.ferritina || examesRedFairy.hemoglobina) && ex.key === 'ferritina_oba')).map(ex => {
              const cl = classificarValor(ex.key, exames[ex.key], { bariatrica: true })
              const dotColor = cl ? (cl.nivel === 'alterado' ? '#DC2626' : cl.nivel === 'limitrofe' ? '#F59E0B' : '#16A34A') : null
              const mascara = ex.readOnly ? 'auto' : refPorSexo(ex.ref, isFem)   // só a referência; a unidade vai sob o nome
              return (
                <div key={ex.key} style={{ display:'flex', flexDirection:'column', background: ex.readOnly ? '#F9FAFB' : '#FEFCE8', border: aberrantesOBA[ex.key] ? '1.5px solid #EAB308' : '1.5px solid #FDE68A', borderRadius:7, padding:'0.3rem 0.38rem' }}>
                  <span style={{ fontSize:'0.74rem', fontWeight:600, color: ex.readOnly ? '#9CA3AF' : '#1F2937', lineHeight:1.15 }}>{ex.label}</span>
                  {ex.sublabel && <span style={{ fontSize:'0.74rem', fontWeight:600, color:'#1F2937', lineHeight:1.15 }}>{ex.sublabel}</span>}
                  <span style={{ fontSize:'0.66rem', fontWeight:600, color:'#4B5563', lineHeight:1.1 }}>{ex.unit || ''}</span>
                  {/* Sempre reserva a linha do subtexto (nbsp quando não há) p/ manter
                      os inputs alinhados horizontalmente com os campos que têm hint laranja. */}
                  <span style={{ fontSize:'0.5rem', color:'#F97316', minHeight:'0.6rem', lineHeight:1.1 }}>{ex.hint || ' '}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.25rem', marginTop:'auto', paddingTop:'0.25rem' }}>
                    <input
                      ref={ex.key === primeiroExameGridKey ? refPrimeiroExame : null}
                      className="oba-exame-input"
                      onWheel={noWheel}
                      style={{ flex:1, minWidth:0, border:'1.5px solid #FACC15', borderRadius:5, padding:'0.32rem 0.36rem', fontSize:'0.92rem', fontWeight:700, outline:'none', textAlign:'right', fontFamily:'inherit', background: ex.readOnly ? '#F0F0F0' : '#FFFDF5', color: ex.readOnly ? '#6B7280' : '#111827', boxSizing:'border-box' }}
                      type="text" inputMode="decimal" placeholder={mascara}
                      readOnly={ex.readOnly}
                      value={exames[ex.key] || ''}
                      onChange={e => !ex.readOnly && handleExameChangeOBA(ex.key, e.target.value)} />
                    {dotColor && <span title={cl.rotulo || ''} style={{ width:9, height:9, borderRadius:'50%', background:dotColor, flexShrink:0, boxShadow:'0 0 0 1.5px rgba(255,255,255,0.7)' }} />}
                  </div>
                  {aberrantesOBA[ex.key] && <span style={{ fontSize:'0.5rem', fontWeight:700, color:'#CA8A04', marginTop:'0.15rem' }}>{"\u26a0 ABERRANTE"}</span>}
                </div>
              )
            })}
          </div>

          {idadeNum >= 40 && (
            <div style={{ background:'#FEF9EC', border:'1px solid #FDE68A', borderRadius:8, padding:'0.5rem 0.9rem', margin:'0.5rem 0' }}>
              <p style={{ color:'#92400E', fontSize:'0.78rem', fontWeight:700 }}>
                {isFem ? "+ CEA e Estradiol (mulher \u2265 40 anos)" : "+ PSA Total, CA 19-9 e CEA (homem \u2265 40 anos)"}
              </p>
            </div>
          )}

          {/* ANTI-H.PYLORI IgG/IgM (sorologia qualitativa). IgM reagente sugere
              infecção ativa → oferta de prescrição do tratamento na conclusão. */}
          <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:8, padding:'0.6rem 0.8rem', margin:'0.6rem 0' }}>
            <p style={{ fontSize:'0.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px', color:'#9A3412', marginBottom:'0.5rem' }}>{"Anti-H. pylori (sorologia)"}</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem' }}>
              {[['IgG', 'antiHp_igg'], ['IgM', 'antiHp_igm']].map(([rotulo, campo]) => (
                <div key={campo} style={{ display:'flex', flexDirection:'column' }}>
                  <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:'0.2rem' }}>{rotulo}</label>
                  <select value={form[campo]} onChange={e => sf(campo, e.target.value)}
                    style={{ padding:'0.4rem 0.6rem', border:'1px solid #D1D5DB', borderRadius:6, fontSize:'0.85rem', background:'white', fontFamily:'inherit' }}>
                    <option value="">Selecione</option>
                    <option value="NÃO REAGENTE">Não reagente</option>
                    <option value="REAGENTE">Reagente</option>
                  </select>
                </div>
              ))}
            </div>
            {form.antiHp_igm === 'REAGENTE' && (
              <p style={{ fontSize:'0.72rem', color:'#9A3412', fontWeight:700, marginTop:'0.5rem' }}>
                {"⚠ IgM reagente sugere infecção ativa — a prescrição do tratamento será oferecida na conclusão."}
              </p>
            )}
          </div>

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

          <DuvidaCheck secao="exames" duvidas={form.duvidas} onToggle={toggleDuvida} />

          {/* Bot\u00e3o \u00fanico (gray piscante, \u25b6 vermelho, subtexto vinho "AVALIA\u00c7\u00c3O").
              salvarExames j\u00e1 cobre o caso de campos vazios (salva nulls e segue),
              ent\u00e3o substitui tanto o "concluir" quanto o antigo "pular". */}
          <div style={{ display:'flex', justifyContent:'center', marginTop:'1.5rem' }}>
            <PlayButton
              onClick={salvarExames}
              loading={loading}
              label={"AVALIA\u00c7\u00c3O"}
              playColor="#DC2626"
              ringColor="rgba(220,38,38,0.5)"
              ariaLabel={"Ir para a avalia\u00e7\u00e3o"}
            />
          </div>
        </div>
      </div>
    </div>
  )


  return (
    <>
      {duvidaPopupEl}
      {showPesquisa && (
        <div style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.95)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem', boxSizing:'border-box' }}>
          <div style={{ position:'relative', background:'white', borderRadius:16, maxWidth:440, width:'100%', padding:'1.7rem 1.4rem 1.4rem', boxShadow:'0 20px 60px rgba(0,0,0,0.35)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPesquisa(false)} aria-label="Fechar" style={{ position:'absolute', top:12, right:12, width:30, height:30, borderRadius:'50%', background:'#7B1E1E', color:'white', border:'none', fontSize:'1.05rem', fontWeight:800, cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>{"\u00d7"}</button>
            <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0 0 0.6rem' }}>{"Pesquisa M\u00e9dica"}</p>
            <p style={{ fontSize:'0.85rem', color:'#374151', lineHeight:1.55, margin:'0 0 1rem' }}>
              {"Se voc\u00ea quiser participar da PESQUISA M\u00c9DICA com o tratamento inofensivo e SIMBI\u00d3TICO para obstipa\u00e7\u00e3o e fibromialgia, marque a caixinha abaixo que enviaremos informa\u00e7\u00f5es detalhadas por WhatsApp."}
            </p>
            <label style={{ display:'flex', alignItems:'flex-start', gap:'0.6rem', cursor:'pointer', userSelect:'none', background:'#FBEAEA', border:'1px solid #E3B5B5', borderRadius:10, padding:'0.8rem 0.9rem' }}>
              <input type="checkbox" checked={pesquisaAceita} onChange={e => aceitarPesquisa(e.target.checked)} style={{ width:'1.1rem', height:'1.1rem', marginTop:'0.1rem', accentColor:'#7B1E1E', flexShrink:0 }} />
              <span style={{ fontSize:'0.8rem', fontWeight:700, color:'#7B1E1E', lineHeight:1.4 }}>{"Sim, quero participar e entendo que n\u00e3o h\u00e1 custos envolvidos para participar do estudo."}</span>
            </label>
            {pesquisaEnviado && (
              <p style={{ fontSize:'0.76rem', color:'#166534', fontWeight:700, margin:'0.8rem 0 0', textAlign:'center' }}>{"\u2713 Recebemos o seu interesse! Em breve entraremos em contato."}</p>
            )}
            <button onClick={() => setShowPesquisa(false)} style={{ display:'block', width:'100%', background:'none', border:'none', color:'#9CA3AF', fontSize:'0.78rem', fontWeight:600, textDecoration:'underline', cursor:'pointer', marginTop:'1rem' }}>{"N\u00e3o desejo participar da pesquisa"}</button>
          </div>
        </div>
      )}
      <div style={OV} onClick={onFechar}>
      <div style={CD} onClick={e => e.stopPropagation()}>
        <Header titulo={"Anamnese | OBA\u00ae"} sub={subPaciente} semFada />
        <div style={{ padding:'1.5rem', boxSizing:'border-box', width:'100%', overflowX:'hidden' }}>

          {/* Identifica\u00e7\u00e3o do paciente (nome, nascimento, sexo, CPF) */}
          <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem 1rem' }}>
            <div style={{ gridColumn:'1 / -1' }}>
              <p style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'1px', color:'#9CA3AF', fontWeight:700, margin:0 }}>{"Data da avaliação"}</p>
              <p style={{ fontSize:'0.85rem', color:'#7B1E1E', fontWeight:800, margin:0 }}>{hojeFmt}</p>
            </div>
            <div style={{ gridColumn:'1 / -1' }}>
              <p style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'1px', color:'#9CA3AF', fontWeight:700, margin:0 }}>{"Nome"}</p>
              <p style={{ fontSize:'0.9rem', color:'#374151', fontWeight:700, margin:0 }}>{nome || "\u2014"}</p>
            </div>
            <div>
              <p style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'1px', color:'#9CA3AF', fontWeight:700, margin:0 }}>{"Nascimento"}</p>
              <p style={{ fontSize:'0.85rem', color:'#374151', fontWeight:600, margin:0 }}>{dataNascFmt}</p>
            </div>
            <div>
              <p style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'1px', color:'#9CA3AF', fontWeight:700, margin:0 }}>{"Sexo"}</p>
              <p style={{ fontSize:'0.85rem', color:'#374151', fontWeight:600, margin:0 }}>{isFem ? 'Feminino' : 'Masculino'}</p>
            </div>
            <div style={{ gridColumn:'1 / -1' }}>
              <p style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'1px', color:'#9CA3AF', fontWeight:700, margin:0 }}>{"CPF"}</p>
              <p style={{ fontSize:'0.85rem', color:'#374151', fontWeight:600, margin:0 }}>{cpfFmt}</p>
            </div>
          </div>

          <div style={{ background:'#FEF2F2', border:'1px solid #FECDD3', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
            {modoFollowUp ? (
              <>
                <p style={{ fontSize:'0.95rem', color:'#7B1E1E', fontWeight:800, margin:'0 0 0.3rem' }}>{"Ol\u00e1, vamos a uma nova avalia\u00e7\u00e3o da sua sa\u00fade!"}</p>
                <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.4px', color:'#9B2C2C', fontWeight:600, lineHeight:1.5 }}>{"Os dados da sua cirurgia j\u00e1 est\u00e3o registrados. Preencha apenas o que mudou desde a \u00faltima vez."}</p>
              </>
            ) : (
              <>
                <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', fontWeight:700, marginBottom:'0.3rem' }}>{isFem ? "A bari\u00e1trica \u00e9 uma paciente complexa." : "O bari\u00e1trico \u00e9 um paciente complexo."}</p>
                <p style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'#9B2C2C' }}>{"Precisamos de mais informa\u00e7\u00f5es para cuidar de voc\u00ea. Marque os itens e preencha os campos:"}</p>
                <p style={{ fontSize:'0.66rem', textTransform:'uppercase', letterSpacing:'0.4px', color:'#9B2C2C', fontWeight:600, marginTop:'0.5rem', lineHeight:1.5 }}>{"Digite r\u00e1pido e com aten\u00e7\u00e3o que o processo ser\u00e1 r\u00e1pido e f\u00e1cil, mas se voc\u00ea errar alguma coisa voc\u00ea sempre pode tocar no campo e editar."}</p>
              </>
            )}
          </div>

          {/* FOLLOW-UP: resumo read-only da cirurgia (campos imutáveis ficam escondidos). */}
          {modoFollowUp && (
            <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:'0.7rem 1rem', marginBottom:'1rem' }}>
              <p style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'1px', color:'#9CA3AF', fontWeight:700, margin:'0 0 0.3rem' }}>{"Sua cirurgia (registrado)"}</p>
              <p style={{ fontSize:'0.82rem', color:'#374151', fontWeight:700, margin:0 }}>
                {[form.tipo_cirurgia, form.indicacao_cirurgia,
                  (form.cirurgia_ano ? `${form.cirurgia_mes ? String(form.cirurgia_mes).padStart(2,'0') + '/' : ''}${form.cirurgia_ano}` : null),
                  (form.peso_antes ? `peso antes ${form.peso_antes} kg` : null),
                ].filter(Boolean).join(' · ') || "—"}
              </p>
            </div>
          )}

          {!modoFollowUp && (<>
          <SectionTitle>Dados da Cirurgia</SectionTitle>

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>
            Data da cirurgia <span style={{ color:'#DC2626' }}>*</span>
            <span style={{ color:'#9CA3AF', fontWeight:400, marginLeft:'0.4rem' }}>{"(ANO obrigat\u00f3rio \u2014 M\u00caS importante \u2014 DIA opcional)"}</span>
          </label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.5fr', gap:'0.5rem', marginBottom:'0.4rem' }}>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#16A34A', fontWeight:600 }}>DIA (opcional)</label>
              <input ref={refDia} style={inpA} onWheel={noWheel} type="number" min="1" max="31" placeholder="DD" value={form.cirurgia_dia} onChange={e => { sf('cirurgia_dia', e.target.value); saltoPorDigitos(e.target.value, refMes, 2) }} onFocus={() => agendarSalto(null)} />
            </div>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#EA580C', fontWeight:600 }}>{"M\u00caS (importante)"}</label>
              <input ref={refMes} style={inpA} onWheel={noWheel} type="number" min="1" max="12" placeholder="MM" value={form.cirurgia_mes} onChange={e => { sf('cirurgia_mes', e.target.value); saltoPorDigitos(e.target.value, refAno, 2) }} onFocus={() => agendarSalto(null)} />
            </div>
            <div>
              <label style={{ fontSize:'0.7rem', color:'#DC2626', fontWeight:700 }}>{"ANO (obrigat\u00f3rio)"}</label>
              <input ref={refAno} style={{ ...inpA, borderColor: form.cirurgia_ano ? '#FACC15' : '#FCA5A5' }} onWheel={noWheel} type="number" min="2000" max="2030" placeholder="AAAA" value={form.cirurgia_ano} onChange={e => { sf('cirurgia_ano', e.target.value); agendarSalto(null) }} onFocus={() => agendarSalto(null)} />
              {/* ANO: após 4 dígitos o cursor NÃO salta (campos seguintes vêm por marcação). */}
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
          <RadioGroup options={TIPOS_CIRURGIA} value={form.tipo_cirurgia} onChange={v => sf('tipo_cirurgia', v)} cols={2} />

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>{"Indica\u00e7\u00e3o da cirurgia"}</label>
          <RadioGroup
            options={['OBESIDADE',"MET\u00c1BOLICA (S\u00cdNDROME METAB\u00d3LICA, DISLIPIDEMIA, HIPERTENS\u00c3O, APNEIA DO SONO)",'OBESIDADE + DIABETES','HEMOCROMATOSE','GASTRECTOMIA POR OUTRAS CAUSAS']}
            value={form.indicacao_cirurgia}
            onChange={v => setForm(p => ({
              ...p,
              indicacao_cirurgia: v,
              // OBESIDADE + DIABETES é incompatível com "não era e não sou diabético":
              // desmarca essa opção do Status Glicêmico se estiver selecionada.
              status_glicemico: (v === 'OBESIDADE + DIABETES' && p.status_glicemico === STATUS_GLICEMICO_OPS[0])
                ? '' : p.status_glicemico,
            }))}
          />
          </>)}

          <SectionTitle>Status Ponderal</SectionTitle>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem 0.8rem' }}>
            <div>
              <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>Peso antes da cirurgia (kg)</label>
              {modoFollowUp ? (
                <input style={{ ...inpA, background:'#F3F4F6', color:'#6B7280' }} type="number" value={form.peso_antes} readOnly />
              ) : (
                <input ref={refPesoAntes} style={inpA} onWheel={noWheel} type="number" min="0" max="220" placeholder="Ex: 120" value={form.peso_antes} onChange={e => { sf('peso_antes', e.target.value); saltoPorDigitos(e.target.value, refPesoMin, 3, true) }} onFocus={() => agendarSalto(null)} onBlur={handlePesoAntesBlur} />
              )}
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>{"Menor peso p\u00f3s (kg)"}</label>
              <input ref={refPesoMin} style={inpA} onWheel={noWheel} type="number" min="0" max="220" placeholder="Ex: 72" value={form.peso_minimo_pos} onChange={e => { sf('peso_minimo_pos', e.target.value); saltoPorDigitos(e.target.value, refPesoAtual, 3, true) }} onFocus={() => agendarSalto(null)} onBlur={handlePesoMinBlur} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>Peso atual (kg)</label>
              <input ref={refPesoAtual} style={inpA} onWheel={noWheel} type="number" placeholder="Ex: 78" value={form.peso_atual} onChange={e => { sf('peso_atual', e.target.value); saltoPorDigitos(e.target.value, refAltura, 3, true) }} onFocus={() => agendarSalto(null)} onBlur={handlePesoAtualBlur} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>Altura (cm)</label>
              {modoFollowUp ? (
                <input style={{ ...inpA, background:'#F3F4F6', color:'#6B7280' }} type="number" value={form.altura} readOnly />
              ) : (
                <input ref={refAltura} style={inpA} onWheel={noWheel} type="number" step="1" placeholder="Ex: 165" value={form.altura} onChange={e => { sf('altura', e.target.value) }} onFocus={() => agendarSalto(null)} />
              )}
            </div>
          </div>
          {alertaPeso && (
            <p style={{ color: '#d97706', fontSize: '0.75rem', marginTop: '0.4rem', lineHeight: 1.4 }}>
              {"\u26a0\ufe0f "}{alertaPeso}
            </p>
          )}
          <p style={{ fontSize:'0.65rem', color:'#6B7280', marginTop:'0.4rem' }}>{"O IMC \u00e9 calculado automaticamente a partir do peso e da altura."}</p>
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

          {/* QUEIXA PRINCIPAL + SECUND\u00c1RIAS \u2014 din\u00e2mica pela FASE p\u00f3s-operat\u00f3ria (tempo de
              cirurgia). Escolhe-se 1 principal; ao escolher, a lista some e surge a de
              secund\u00e1rias (at\u00e9 3). Registradas p/ comparar a evolu\u00e7\u00e3o em avalia\u00e7\u00f5es futuras. */}
          <SectionTitle>{"Queixa Principal"}</SectionTitle>
          {!faseQueixa ? (
            <div style={{ background:'#FEF9EC', border:'1px solid #FDE68A', borderRadius:8, padding:'0.7rem 0.9rem' }}>
              <p style={{ fontSize:'0.78rem', color:'#92400E', fontWeight:600, margin:0, lineHeight:1.5 }}>
                {"Informe o ANO da cirurgia (no in\u00edcio) para vermos as queixas mais comuns da sua fase p\u00f3s-operat\u00f3ria."}
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize:'0.72rem', color:'#6B7280', marginBottom:'0.6rem', lineHeight:1.5 }}>{FASE_QUEIXA_LABEL[faseQueixa]}</p>

              {!form.queixa_principal ? (
                <>
                  <p style={{ fontSize:'0.72rem', color:'#374151', fontWeight:700, marginBottom:'0.4rem' }}>{"Qual \u00e9 a sua queixa PRINCIPAL hoje?"}</p>
                  {queixasFase.map(q => (
                    <div key={q} onClick={() => escolherPrincipal(q)} style={queixaRowStyle(false)}>
                      <Radio16 active={false} />{gz(q, isFem)}
                    </div>
                  ))}
                  <p style={{ fontSize:'0.68rem', color:'#9CA3AF', marginTop:'0.2rem' }}>{"Se n\u00e3o tiver queixas, pode seguir sem marcar."}</p>
                </>
              ) : (
                <>
                  <div style={{ ...queixaRowStyle(true), marginBottom:0, justifyContent:'space-between' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}><Radio16 active={true} />{gz(form.queixa_principal, isFem)}</span>
                    <button onClick={trocarPrincipal} style={{ background:'none', border:'none', color:'#DC2626', fontSize:'0.7rem', fontWeight:800, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline', flexShrink:0 }}>{"trocar"}</button>
                  </div>

                  <SectionTitle>{"Queixas Secund\u00e1rias"}</SectionTitle>
                  <p style={{ fontSize:'0.72rem', color:'#6B7280', marginBottom:'0.4rem' }}>
                    {"Marque at\u00e9 3 outras queixas que tamb\u00e9m incomodam ("}{(form.queixas_secundarias || []).length}{"/3)."}
                  </p>
                  {(() => {
                    const cand = queixasFase.filter(q => q !== form.queixa_principal)
                    const sel = form.queixas_secundarias || []
                    // Com 3 marcadas, as demais somem (s\u00f3 as escolhidas ficam, ainda remov\u00edveis).
                    const visiveis = sel.length >= 3 ? cand.filter(q => sel.includes(q)) : cand
                    return visiveis.map(q => {
                      const on = sel.includes(q)
                      return (
                        <div key={q} onClick={() => toggleQueixaSec(q)} style={queixaRowStyle(on)}>
                          <input type="checkbox" readOnly checked={on} style={{ width:15, height:15, flexShrink:0 }} />{gz(q, isFem)}
                        </div>
                      )
                    })
                  })()}
                  {(form.queixas_secundarias || []).length >= 3 && (
                    <p style={{ fontSize:'0.68rem', color:'#9CA3AF', marginTop:'0.2rem' }}>{"3 queixas registradas. Toque em uma para remover e escolher outra."}</p>
                  )}
                </>
              )}
            </>
          )}

          {marcouIdeacao && (
            <div style={{ background:'#FEF2F2', border:'2px solid #DC2626', borderRadius:12, padding:'0.9rem 1rem', margin:'0.4rem 0 0.2rem' }}>
              <p style={{ fontSize:'0.82rem', fontWeight:800, color:'#991B1B', margin:'0 0 0.4rem' }}>{"VOC\u00ca N\u00c3O EST\u00c1 SOZINHO(A)."}</p>
              <p style={{ fontSize:'0.8rem', color:'#7F1D1D', lineHeight:1.5, margin:0 }}>
                {"Se voc\u00ea tem pensamentos de morte ou de se machucar, procure ajuda AGORA: "}
                <strong>{"CVV 188"}</strong>{" (liga\u00e7\u00e3o gratuita, 24h) ou "}<strong>{"emerg\u00eancia 192"}</strong>{". Voc\u00ea tamb\u00e9m pode conversar pelo site cvv.org.br. Pedir ajuda \u00e9 um ato de coragem \u2014 vamos te apoiar."}
              </p>
              <a href="tel:188" style={{ display:'inline-block', marginTop:'0.6rem', background:'#DC2626', color:'#fff', fontWeight:800, fontSize:'0.82rem', padding:'0.55rem 1rem', borderRadius:10, textDecoration:'none' }}>{"Ligar para o CVV 188"}</a>
            </div>
          )}

          <SectionTitle>{"Infec\u00e7\u00f5es Cr\u00f4nicas"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {INFECCOES_CRONICAS_OPS.map(op => (
              <CheckRow key={op} label={op} checked={form.infeccoes_cronicas.includes(op)} onClick={() => sf('infeccoes_cronicas', tog(form.infeccoes_cronicas, op))} />
            ))}
          </div>
          {form.infeccoes_cronicas.includes('HEPATITE B') && (
            <div style={SUB_INFEC_BOX}>
              <p style={SUB_INFEC_TIT}>{"Hepatite B"}</p>
              <RadioGroup options={['EM TRATAMENTO', 'RESOLVIDO']} value={form.hepb_status} cols={2} onChange={v => sf('hepb_status', form.hepb_status === v ? '' : v)} />
            </div>
          )}
          {form.infeccoes_cronicas.includes('HEPATITE C') && (
            <div style={SUB_INFEC_BOX}>
              <p style={SUB_INFEC_TIT}>{"Hepatite C"}</p>
              <RadioGroup options={['EM TRATAMENTO', 'RESOLVIDO']} value={form.hepc_status} cols={2} onChange={v => sf('hepc_status', form.hepc_status === v ? '' : v)} />
            </div>
          )}
          {form.infeccoes_cronicas.includes('HIV') && (
            <div style={SUB_INFEC_BOX}>
              <p style={SUB_INFEC_TIT}>{"HIV"}</p>
              {/* Marcar "em tratamento" aqui já marca hivTratamento (Medicamentos que
                  Afetam o Eritron), que o motor lê p/ macrocitose. Add-only: desmarcar
                  aqui não desmarca lá (o checkbox de lá segue independente). */}
              <CheckRow label={"EM TRATAMENTO"} checked={form.hiv_tratamento}
                onClick={() => setForm(p => {
                  const novo = !p.hiv_tratamento
                  return { ...p, hiv_tratamento: novo, ...(novo ? { hivTratamento: true } : {}) }
                })} />
            </div>
          )}
          {form.infeccoes_cronicas.includes('HERPES SIMPLES') && (
            <div style={SUB_INFEC_BOX}>
              <p style={SUB_INFEC_TIT}>{"Herpes Simples"}</p>
              <CheckRow label={"USO ACICLOVIR ORAL"} checked={form.herpes_simples_aciclovir} onClick={() => sf('herpes_simples_aciclovir', !form.herpes_simples_aciclovir)} />
            </div>
          )}
          {form.infeccoes_cronicas.includes('HERPES-Z\u00d3STER') && (
            <div style={SUB_INFEC_BOX}>
              <p style={SUB_INFEC_TIT}>{"Herpes-Z\u00f3ster"}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
                {HERPES_ZOSTER_OPS.map(op => (
                  <CheckRow key={op} label={op} checked={form.herpes_zoster.includes(op)} onClick={() => sf('herpes_zoster', tog(form.herpes_zoster, op))} />
                ))}
              </div>
            </div>
          )}
          {form.infeccoes_cronicas.includes('DOEN\u00c7A DE LYME (BORRELIOSE)') && (
            <div style={SUB_INFEC_BOX}>
              <p style={SUB_INFEC_TIT}>{"Doen\u00e7a de Lyme (Borreliose)"}</p>
              <RadioGroup options={['CR\u00d4NICA', 'RESOLVIDA']} value={form.borreliose_status} cols={2} onChange={v => sf('borreliose_status', form.borreliose_status === v ? '' : v)} />
            </div>
          )}
          {form.infeccoes_cronicas.includes('HPV') && (
            <div style={SUB_INFEC_BOX}>
              <p style={SUB_INFEC_TIT}>{"HPV"}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
                {HPV_OPS.map(op => (
                  <CheckRow key={op} label={op} checked={form.hpv_estado.includes(op)} onClick={() => sf('hpv_estado', tog(form.hpv_estado, op))} />
                ))}
              </div>
            </div>
          )}
          {form.infeccoes_cronicas.includes('EPSTEIN-BARR') && (
            <div style={SUB_INFEC_BOX}>
              <p style={SUB_INFEC_TIT}>{"Epstein-Barr"}</p>
              <RadioGroup options={['CR\u00d4NICA', 'RESOLVIDA']} value={form.ebv_status} cols={2} onChange={v => sf('ebv_status', form.ebv_status === v ? '' : v)} />
            </div>
          )}
          {form.infeccoes_cronicas.includes('HTLV I/II') && (
            <div style={SUB_INFEC_BOX}>
              <p style={SUB_INFEC_TIT}>{"HTLV I/II"}</p>
              <CheckRow label={"DOEN\u00c7A ATIVA"} checked={form.htlv_ativa} onClick={() => sf('htlv_ativa', !form.htlv_ativa)} />
            </div>
          )}

          <DuvidaCheck secao="infeccoes" duvidas={form.duvidas} onToggle={toggleDuvida} />

          <SectionTitle>{"Acompanhamento M\u00e9dico"}</SectionTitle>
          <RadioGroup options={ACOMPANHAMENTO_OPS} value={form.acompanhamento} onChange={v => {
            // "Não acompanha agora" (qualquer opção que não seja a 1ª, "FAÇO ACOMPANHAMENTO
            // MÉDICO E REPOSIÇÕES") → marca "Não estou sob acompanhamento" nos especialistas.
            const semAcomp = v !== ACOMPANHAMENTO_OPS[0]
            setForm(p => ({ ...p, acompanhamento: v, semEspecialista: semAcomp }))
          }} />

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Especialistas que me acompanham:</label>
          <CheckRow
            label={"N\u00c3O ESTOU SOB ACOMPANHAMENTO"}
            checked={form.semEspecialista}
            onClick={() => sf('semEspecialista', !form.semEspecialista)}
          />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem', marginTop:'0.4rem' }}>
            {/* Paciente masculino: sem GINECOLOGISTA/OBSTETRA na lista. */}
            {(isFem ? ESPECIALISTAS : ESPECIALISTAS.filter(e => e !== 'GINECOLOGISTA' && e !== 'OBSTETRA')).map(e => (
              <CheckRow key={e} label={e}
                checked={form.especialistas.includes(e)}
                disabled={form.semEspecialista}
                onClick={() => !form.semEspecialista && sf('especialistas', tog(form.especialistas, e))} />
            ))}
          </div>

          {isFem && (
            <>
              <SectionTitle>Status Gestacional</SectionTitle>

              {/* ESTOU GR\u00c1VIDA em linha pr\u00f3pria (j\u00e1 marcado quando veio da triagem);
                  abaixo, Semanas de gesta\u00e7\u00e3o e N\u00ba de gesta\u00e7\u00f5es anteriores LADO A LADO
                  (semanas s\u00f3 aparece quando gr\u00e1vida). Evita o desalinhamento do modal. */}
              <style>{`.oba-gest-input::placeholder{font-size:0.58rem;letter-spacing:0.2px;}`}</style>
              {idadeNum >= 15 && (
                <div style={{ marginBottom:'0.5rem' }}>
                  <CheckRow label={"ESTOU GR\u00c1VIDA"} checked={form.status_gestacional === "GR\u00c1VIDA"} onClick={() => sf('status_gestacional', form.status_gestacional === "GR\u00c1VIDA" ? '' : "GR\u00c1VIDA")} />
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem 0.8rem', alignItems:'end' }}>
                {form.status_gestacional === "GR\u00c1VIDA" && (
                  <div>
                    <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>{"Semanas de gesta\u00e7\u00e3o"}</label>
                    <input style={inpA} onWheel={noWheel} type="number" placeholder="Ex: 28" value={form.semanas_gestacao} onChange={e => sf('semanas_gestacao', e.target.value)} />
                  </div>
                )}
                <div>
                  <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>{"N\u00famero de gesta\u00e7\u00f5es anteriores"}</label>
                  <input
                    ref={refGestacoes}
                    className="oba-gest-input"
                    style={inpA}
                    onWheel={noWheel}
                    type="number"
                    min="0"
                    max="20"
                    step="1"
                    placeholder={"0, 1, 2, 3..."}
                    value={form.gestacoes_previas}
                    onChange={e => sf('gestacoes_previas', e.target.value)}
                    onFocus={() => agendarSalto(null)}
                  />
                </div>
              </div>

              {engravidouCedo && (
                <p style={{ fontSize:'0.75rem', fontWeight:700, color:'#DC2626', margin:'0.55rem 0 0', lineHeight:1.45 }}>
                  {"Ao engravidar antes de 18 meses após a bariátrica você infringiu uma RECOMENDAÇÃO CRÍTICA. Alerte o seu obstetra sobre isso."}
                </p>
              )}

              {form.gestacoes_previas !== '' && parseInt(form.gestacoes_previas) > 0 && (
                <>
                  <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>{"Um ou mais abortamentos espont\u00e2neos?"}</label>
                  <RadioGroup
                    options={['SIM',"N\u00c3O"]}
                    value={form.abortamentos_espontaneos === true ? 'SIM' : form.abortamentos_espontaneos === false ? "N\u00c3O" : ''}
                    onChange={v => sf('abortamentos_espontaneos', v === 'SIM')}
                  />
                  {form.abortamentos_espontaneos === true && (
                    <>
                      <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'#374151', margin:'0.5rem 0 0.3rem' }}>{"Quantos abortamentos espont\u00e2neos?"}</label>
                      <input style={{ ...inpA, maxWidth:120 }} onWheel={noWheel} type="number" min="1" max="20" step="1" placeholder={"1, 2, 3..."} value={form.abortamentos_numero} onChange={e => sf('abortamentos_numero', e.target.value)} />
                      <p style={{ fontSize:'0.75rem', fontWeight:700, color:'#7B1E1E', margin:'0.5rem 0 0', lineHeight:1.45 }}>
                        {"Essa informa\u00e7\u00e3o \u00e9 CR\u00cdTICA, informe a seu obstetra e marque teleconsulta com Hematologista."}
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <SectionTitle>{"Status End\u00f3crino"}</SectionTitle>

          <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0.2rem 0 0.5rem' }}>{"Glic\u00eamico"}</p>
          <RadioGroup
            options={STATUS_GLICEMICO_OPS.filter(o => !o.includes('DUMPING'))}
            value={form.status_glicemico}
            disabledOptions={form.indicacao_cirurgia === 'OBESIDADE + DIABETES' ? [STATUS_GLICEMICO_OPS[0]] : []}
            onChange={v => sf('status_glicemico', v)}
            mapLabel={o => gz(o, isFem)}
          />
          {/* DUMPING \u00e9 independente do radio acima: pode coexistir com qualquer status. */}
          <div style={{ marginTop:'0.5rem' }}>
            <CheckRow
              label={STATUS_GLICEMICO_OPS.find(o => o.includes('DUMPING'))}
              checked={form.dumping}
              onClick={() => sf('dumping', !form.dumping)}
            />
          </div>

          <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'1rem 0 0.5rem' }}>{"Hormonal"}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_HORMONAL_OPS.map(op => (
              <CheckRow key={op} label={op} checked={form.status_hormonal.includes(op)} onClick={() => sf('status_hormonal', tog(form.status_hormonal, op))} />
            ))}
            {isFem && idadeNum >= 45 && ['REPOSI\u00c7\u00c3O HORMONAL'].map(op => (
              <CheckRow key={op} label={op} checked={form.status_hormonal.includes(op)} onClick={() => sf('status_hormonal', tog(form.status_hormonal, op))} />
            ))}
            {!isFem && (
              <CheckRow label={"REPOSI\u00c7\u00c3O DE TESTOSTERONA"} checked={form.status_hormonal.includes("REPOSI\u00c7\u00c3O DE TESTOSTERONA")} onClick={() => sf('status_hormonal', tog(form.status_hormonal, "REPOSI\u00c7\u00c3O DE TESTOSTERONA"))} />
            )}
          </div>

          <DuvidaCheck secao="endocrino" duvidas={form.duvidas} onToggle={toggleDuvida} />

          {isFem && (<>
          <SectionTitle>{"Status Ginecol\u00f3gico"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_GINECOLOGICO_OPS.map(op => (
              <CheckRow key={op} label={op} checked={form.status_ginecologico.includes(op)} onClick={() => sf('status_ginecologico', tog(form.status_ginecologico, op))} />
            ))}
            {/* Corte em 32 (era 35; Dr. Ramos, jul/2026): falência ovariana precoce
                existe antes dos 35 — sem o checkbox, o red flag de sangramento
                pós-menopausa (buildModGinecologico) ficava inalcançável p/ elas. */}
            {idadeNum >= 32 && (
              <CheckRow label={"MENOPAUSA"} checked={form.status_ginecologico.includes('MENOPAUSA')} onClick={() => sf('status_ginecologico', tog(form.status_ginecologico, 'MENOPAUSA'))} />
            )}
          </div>
          {form.status_gestacional === "GRÁVIDA" && form.status_ginecologico.includes('SANGRAMENTO MENSTRUAL') && (
            <div style={{ marginTop:'0.6rem', background:'#FEF2F2', border:'2px solid #DC2626', borderRadius:10, padding:'0.7rem 0.9rem' }}>
              <p style={{ fontSize:'0.82rem', fontWeight:800, color:'#B91C1C', margin:0, lineHeight:1.45 }}>
                {"⚠️ Gestantes não menstruam. Se você está grávida e apresenta sangramento, procure uma unidade de emergência imediatamente."}
              </p>
            </div>
          )}
          {form.status_gestacional !== "GRÁVIDA" && form.status_ginecologico.includes('MENOPAUSA') && form.status_ginecologico.includes('SANGRAMENTO MENSTRUAL') && (
            <div style={{ marginTop:'0.6rem', background:'#FEF2F2', border:'2px solid #DC2626', borderRadius:10, padding:'0.7rem 0.9rem' }}>
              <p style={{ fontSize:'0.82rem', fontWeight:800, color:'#B91C1C', margin:0, lineHeight:1.45 }}>
                {"⚠️ Sangramento depois da menopausa não é menstruação — precisa de investigação ginecológica prioritária. O relatório vai detalhar."}
              </p>
            </div>
          )}
          {/* Com MENOPAUSA marcada as perguntas de padrão menstrual somem: o motor as
              ignora nesse ramo (sangramento pós-menopausa é red flag independente de
              intensidade/tempo — ver buildModGinecologico) e perguntar "quantos dias
              dura a menstruação" a quem não menstrua seria incoerente. */}
          {form.status_ginecologico.includes('SANGRAMENTO MENSTRUAL') && !form.status_ginecologico.includes('MENOPAUSA') && (
            <div style={{ marginTop:'0.5rem' }}>
              <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0 0 0.4rem' }}>{"Tipo de sangramento"}</p>
              <RadioGroup options={SANGRAMENTO_MENSTRUAL_OPS} value={form.sangramento_menstrual_tipo} cols={1} onChange={v => sf('sangramento_menstrual_tipo', form.sangramento_menstrual_tipo === v ? '' : v)} />
              {/* O TEMPO é o que define a gravidade — sem ele o tipo acima não diz quanto
                  ferro se perdeu. Ver a régua em buildModGinecologico (obaEngine). */}
              <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0.7rem 0 0.4rem' }}>{"Quantos dias dura a menstruação?"}</p>
              <RadioGroup options={SANGRAMENTO_DURACAO_OPS} value={form.sangramento_duracao} cols={1} onChange={v => sf('sangramento_duracao', form.sangramento_duracao === v ? '' : v)} />
              <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0.7rem 0 0.4rem' }}>{"Há quanto tempo é assim?"}</p>
              <RadioGroup options={SANGRAMENTO_PERSISTENCIA_OPS} value={form.sangramento_persistencia} cols={1} onChange={v => sf('sangramento_persistencia', form.sangramento_persistencia === v ? '' : v)} />
              <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0.7rem 0 0.4rem' }}>{"De quanto em quanto tempo vem a menstruação?"}</p>
              <RadioGroup options={SANGRAMENTO_FREQUENCIA_OPS} value={form.sangramento_frequencia} cols={1} onChange={v => sf('sangramento_frequencia', form.sangramento_frequencia === v ? '' : v)} />
            </div>
          )}
          {form.status_ginecologico.includes('C\u00c2NCER DE MAMA') && (
            <div style={{ marginTop:'0.5rem' }}>
              <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0 0 0.4rem' }}>{"C\u00e2ncer de mama"}</p>
              <RadioGroup options={['EM TRATAMENTO', 'RESOLVIDO']} value={form.cancer_mama_status} cols={2} onChange={v => sf('cancer_mama_status', form.cancer_mama_status === v ? '' : v)} />
            </div>
          )}
          </>)}

          {!isFem && idadeNum >= 38 && (<>
          <SectionTitle>{"Status Prost\u00e1tico"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_PROSTATICO_OPS.map(op => {
              const semMarcado = form.status_prostatico.includes('SEM SINTOMAS')
              const marcada = form.status_prostatico.includes(op)
              return (
                <CheckRow key={op} label={op} checked={marcada}
                  onClick={() => {
                    if (op === 'SEM SINTOMAS') {
                      sf('status_prostatico', marcada ? [] : ['SEM SINTOMAS'])
                    } else {
                      // Marcar qualquer outra limpa o "SEM SINTOMAS" (exclusivo).
                      const sem = form.status_prostatico.filter(x => x !== op && x !== 'SEM SINTOMAS')
                      sf('status_prostatico', marcada ? sem : [...sem, op])
                    }
                  }} />
              )
            })}
          </div>
          {form.status_prostatico.includes('C\u00c2NCER') && (
            <div style={{ marginTop:'0.5rem' }}>
              <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0 0 0.4rem' }}>{"C\u00e2ncer de pr\u00f3stata"}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
                {PROSTATA_CANCER_OPS.map(op => (
                  <CheckRow key={op} label={op} checked={form.prostata_cancer_tratamentos.includes(op)} onClick={() => sf('prostata_cancer_tratamentos', tog(form.prostata_cancer_tratamentos, op))} />
                ))}
              </div>
            </div>
          )}
          </>)}

          <SectionTitle>{"Status Press\u00f3rico"}</SectionTitle>
          <RadioGroup options={STATUS_PRESSORICO_OPS} value={form.status_pressorico} onChange={v => sf('status_pressorico', v)} mapLabel={o => gz(o, isFem)} />

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
          {form.status_endoscopico.includes("VARIZES DE ESÔFAGO") && (
            <div style={{ marginTop:'0.4rem' }}>
              <CheckRow label={"OPEREI VARIZES DE ESÔFAGO"} checked={form.operou_varizes_esofago} onClick={() => sf('operou_varizes_esofago', !form.operou_varizes_esofago)} />
            </div>
          )}

          <DuvidaCheck secao="endoscopico" duvidas={form.duvidas} onToggle={toggleDuvida} />

          <SectionTitle>Status Vascular</SectionTitle>

          <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0.2rem 0 0.5rem' }}>{"Venoso"}</p>
          <CheckRow label={"TENHO / TIVE TROMBOSE"} checked={!!form.trombose} onClick={() => sf('trombose', !form.trombose)} />
          {form.trombose && (
            <>
              <CheckRow label="INVESTIGUEI AS CAUSAS DA TROMBOSE" checked={form.investigou_trombose} onClick={() => sf('investigou_trombose', !form.investigou_trombose)} />
              <CheckRow label="USEI ANTICOAGULANTE" checked={form.usou_anticoagulante} onClick={() => sf('usou_anticoagulante', !form.usou_anticoagulante)} />
              <CheckRow label="USO ANTICOAGULANTE ATUALMENTE" checked={form.usa_anticoagulante} onClick={() => sf('usa_anticoagulante', !form.usa_anticoagulante)} />
            </>
          )}

          <div style={{ marginTop:'0.8rem' }}>
            <CheckRow label={"TENHO VARIZES NAS PERNAS"} checked={!!form.varizes} onClick={() => sf('varizes', !form.varizes)} />
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
          {/* VARIZES DE ES\u00d4FAGO migrou para o STATUS ENDOSC\u00d3PICO (round 3). */}

          {/* \u2500\u2500 ARTERIAL \u2500\u2500 */}
          <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'1rem 0 0.5rem' }}>{"Arterial"}</p>
          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>{"Doppler de car\u00f3tidas e vertebrais"}</label>
          <RadioGroup options={['NORMAL', 'ANORMAL']} value={form.doppler_carotidas} onChange={v => sf('doppler_carotidas', v)} cols={2} />
          {form.doppler_carotidas === 'ANORMAL' && (
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.5rem' }}>
              <input style={{ ...inpA, width:130 }} onWheel={noWheel} type="number" min="0" max="100" placeholder="Ex: 70" value={form.estenose_maxima} onChange={e => sf('estenose_maxima', e.target.value)} />
              <span style={{ fontSize:'0.8rem', color:'#6B7280' }}>{"% \u2014 grau m\u00e1ximo de estenose"}</span>
            </div>
          )}
          <div style={{ marginTop:'0.8rem' }}>
            <CheckRow label={"DOEN\u00c7A ARTERIAL PERIF\u00c9RICA"} checked={!!form.doenca_arterial_periferica} onClick={() => sf('doenca_arterial_periferica', !form.doenca_arterial_periferica)} />
          </div>

          <DuvidaCheck secao="vascular" duvidas={form.duvidas} onToggle={toggleDuvida} />

          <SectionTitle>{"Status Cardiovascular"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_CARDIOVASCULAR_OPS.map(opt => {
              const ehBem = opt === 'ESTOU BEM'
              const bemMarcado = form.status_cardiovascular.includes('ESTOU BEM')
              const marcada = form.status_cardiovascular.includes(opt)
              return (
                <CheckRow key={opt} label={opt} checked={marcada} disabled={!ehBem && bemMarcado}
                  onClick={() => {
                    if (ehBem) {
                      sf('status_cardiovascular', marcada ? [] : ['ESTOU BEM'])
                    } else {
                      const sem = form.status_cardiovascular.filter(x => x !== opt && x !== 'ESTOU BEM')
                      sf('status_cardiovascular', marcada ? sem : [...sem, opt])
                    }
                  }} />
              )
            })}
          </div>

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>{"ECG"}</label>
          <RadioGroup options={["NORMAL | RITMO SINUSAL", 'ALTERADO']} value={form.ecg} onChange={v => sf('ecg', v)} cols={2} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem', marginTop:'0.4rem' }}>
            <CheckRow label={"TENHO ARRITMIA"} checked={form.ecg_arritmia} onClick={() => sf('ecg_arritmia', !form.ecg_arritmia)} />
            <CheckRow label={"USO MARCAPASSO"} checked={form.ecg_marcapasso} onClick={() => sf('ecg_marcapasso', !form.ecg_marcapasso)} />
          </div>

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>{"Ecocardiograma"}</label>
          <RadioGroup options={['NORMAL', 'ANORMAL']} value={form.ecocardiograma} onChange={v => sf('ecocardiograma', v)} cols={2} />
          {form.ecocardiograma === 'ANORMAL' && (
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.5rem' }}>
              <input style={{ ...inpA, width:120 }} onWheel={noWheel} type="number" placeholder="Ex: 55" value={form.fracao_ejecao} onChange={e => sf('fracao_ejecao', e.target.value)} />
              <span style={{ fontSize:'0.8rem', color:'#6B7280' }}>{"% — fração de ejeção (Teichholz)"}</span>
            </div>
          )}

          <div style={{ marginTop:'0.8rem' }}>
            <CheckRow label={"FIZ ANGIOTOMOGRAFIA CORONARIANA"} checked={form.angiotomografia_coronariana} onClick={() => sf('angiotomografia_coronariana', !form.angiotomografia_coronariana)} />
          </div>
          {form.angiotomografia_coronariana && (
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.4rem' }}>
              <input style={{ ...inpA, width:120 }} onWheel={noWheel} type="number" placeholder="Ex: 120" value={form.score_calcio} onChange={e => sf('score_calcio', e.target.value)} />
              <span style={{ fontSize:'0.8rem', color:'#6B7280' }}>{"score de cálcio"}</span>
            </div>
          )}

          <DuvidaCheck secao="cardiovascular" duvidas={form.duvidas} onToggle={toggleDuvida} />

          <SectionTitle>{"Status Respiratório"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_RESPIRATORIO_OPS.map(opt => {
              const ehNormal = opt === 'NORMAL'
              const normalMarcado = form.status_respiratorio.includes('NORMAL')
              const marcada = form.status_respiratorio.includes(opt)
              return (
                <CheckRow key={opt} label={opt} checked={marcada} disabled={!ehNormal && normalMarcado}
                  onClick={() => {
                    if (ehNormal) {
                      sf('status_respiratorio', marcada ? [] : ['NORMAL'])
                    } else {
                      const sem = form.status_respiratorio.filter(x => x !== opt && x !== 'NORMAL')
                      sf('status_respiratorio', marcada ? sem : [...sem, opt])
                    }
                  }} />
              )
            })}
          </div>

          <SectionTitle>{"Status Alérgico"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_ALERGICO_OPS.map(op => (
              <CheckRow key={op} label={op} checked={form.status_alergico.includes(op)} onClick={() => sf('status_alergico', tog(form.status_alergico, op))} />
            ))}
          </div>
          {form.status_alergico.includes('ALIMENTAR') && (
            <div style={{ marginTop:'0.5rem', padding:'0.6rem', background:'#FEF3C7', borderRadius:8, border:'1px solid #FDE68A' }}>
              <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#92400E', marginBottom:'0.5rem' }}>{"Alergia alimentar — marque quais:"}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
                {ALERGIAS_ALIMENTARES_OPS.map(op => (
                  <CheckRow key={op} label={op} checked={form.alergias_alimentares.includes(op)} onClick={() => sf('alergias_alimentares', tog(form.alergias_alimentares, op))} />
                ))}
              </div>
              {form.alergias_alimentares.includes('OUTRA') && (
                <input style={{ ...inp, marginTop:'0.5rem' }} type="text" placeholder={"Especifique a alergia alimentar"} value={form.alergias_alimentares_outra} onChange={e => sf('alergias_alimentares_outra', e.target.value)} />
              )}
            </div>
          )}
          {form.status_alergico.includes('MEDICAMENTOSA') && (
            <div style={{ marginTop:'0.5rem', padding:'0.6rem', background:'#FEF3C7', borderRadius:8, border:'1px solid #FDE68A' }}>
              <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#92400E', marginBottom:'0.5rem' }}>{"Alergia medicamentosa — marque quais:"}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
                {ALERGIA_MEDICAMENTOSA_OPS.map(op => (
                  <CheckRow key={op} label={op} checked={form.alergia_medicamentosa.includes(op)} onClick={() => sf('alergia_medicamentosa', tog(form.alergia_medicamentosa, op))} />
                ))}
              </div>
              {form.alergia_medicamentosa.includes('OUTRA') && (
                <input style={{ ...inp, marginTop:'0.5rem' }} type="text" placeholder="Especifique o medicamento" value={form.alergia_outra_texto} onChange={e => sf('alergia_outra_texto', e.target.value)} />
              )}
            </div>
          )}

          <SectionTitle>Status Dental</SectionTitle>
          {["BOA SA\u00daDE ORAL, DENTI\u00c7\u00c3O OK.", 'PRECISO TRATAMENTO ODONTOL\u00d3GICO', 'PERDI MAIS DE UM DENTE AP\u00d3S A CIRURGIA'].map(op => (
            <div key={op} onClick={() => sf('status_dental', form.status_dental === op ? '' : op)} style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.8rem', borderRadius:8, border:`1.5px solid ${form.status_dental === op ? '#DC2626' : '#E5E7EB'}`, background: form.status_dental === op ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', marginBottom:'0.4rem', fontSize:'0.72rem', fontWeight: form.status_dental === op ? 700 : 500, color: form.status_dental === op ? '#7B1E1E' : '#374151' }}>
              <Radio16 active={form.status_dental === op} />{op}
            </div>
          ))}

          <SectionTitle>{"Status \u00d3sseo | Articular"}</SectionTitle>
          {marcouDoresOsseas && (
            <div style={{ marginBottom:'0.7rem' }}>
              <p style={{ fontSize:'0.75rem', fontWeight:700, color:'#7B1E1E', margin:'0 0 0.35rem', lineHeight:1.4 }}>
                {"Voc\u00ea informou dores, se sabe mais sobre isso informe aqui:"}
              </p>
              <input style={inp} type="text" placeholder={"Ex.: dor no quadril ao caminhar, piora \u00e0 noite\u2026"} value={form.dores_osseas_detalhe} onChange={e => sf('dores_osseas_detalhe', e.target.value)} />
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:'0.4rem' }}>
            {["DENSITOMETRIA \u00d3SSEA NORMAL", 'OSTEOPENIA', 'OSTEOPOROSE', "N\u00c3O FIZ DENSITOMETRIA"].map(op => (
              <div key={op} onClick={() => sf('status_osseo', form.status_osseo === op ? '' : op)} style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.5rem 0.7rem', borderRadius:8, border:`1.5px solid ${form.status_osseo === op ? '#DC2626' : '#E5E7EB'}`, background: form.status_osseo === op ? '#FEF2F2' : '#FAFAFA', cursor:'pointer', fontSize:'0.72rem', fontWeight: form.status_osseo === op ? 700 : 500, color: form.status_osseo === op ? '#7B1E1E' : '#374151' }}>
                <Radio16 active={form.status_osseo === op} />{op}
              </div>
            ))}
          </div>
          <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0.8rem 0 0.5rem' }}>{"Articular"}</p>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:'0.4rem' }}>
            {STATUS_ARTICULAR_OPS.map(op => (
              <CheckRow key={op} label={op} checked={form.status_articular.includes(op)} onClick={() => setForm(p => { const novo = tog(p.status_articular, op); return { ...p, status_articular: novo, ...(novo.includes('ARTRITE') ? {} : { fan: '', fan_titulo: '' }) }; })} />
            ))}
          </div>
          {form.status_articular.includes('ARTRITE') && (
            <>
              <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:'#7B1E1E', margin:'0.8rem 0 0.5rem' }}>{"FAN (Anticorpo Anti-C\u00e9lula)"}</p>
              <RadioGroup
                options={['REAGENTE', "N\u00c3O REAGENTE"]}
                value={form.fan}
                cols={2}
                onChange={v => setForm(p => ({ ...p, fan: p.fan === v ? '' : v, fan_titulo: v === 'REAGENTE' ? p.fan_titulo : '' }))}
              />
              {form.fan === 'REAGENTE' && (
                <div style={{ marginTop:'0.5rem' }}>
                  <p style={{ fontSize:'0.7rem', fontWeight:700, color:'#374151', margin:'0 0 0.35rem' }}>{"T\u00edtulo"}</p>
                  <RadioGroup
                    options={['1/80', '1/160', '1/320', '1/640+']}
                    value={form.fan_titulo}
                    cols={4}
                    onChange={v => sf('fan_titulo', form.fan_titulo === v ? '' : v)}
                  />
                </div>
              )}
            </>
          )}

          <DuvidaCheck secao="osseo" duvidas={form.duvidas} onToggle={toggleDuvida} />

          <SectionTitle>{"Status Neurol\u00f3gico"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:'0.4rem' }}>
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

          <DuvidaCheck secao="neurologico" duvidas={form.duvidas} onToggle={toggleDuvida} />

          <SectionTitle>Status Intestinal</SectionTitle>
          <RadioGroup options={STATUS_INTESTINAL_OPS} value={form.status_intestinal} onChange={v => {
            const novo = form.status_intestinal === v ? '' : v
            const fibroObst = STATUS_FIBROMIALGIA_OPS.find(o => o.indexOf('OBSTIPA') === 0)
            const eraObst = (form.status_intestinal || '').indexOf('OBSTIPA') === 0
            const ehObst = !!novo && novo.indexOf('OBSTIPA') === 0
            setForm(p => {
              const fibro = new Set(p.status_fibromialgia || [])
              // Obstipação no intestinal → marca também a obstipação no fibromiálgico.
              if (ehObst && fibroObst) fibro.add(fibroObst)
              // Saiu da obstipação → desfaz a auto-marcação (senão os exames de
              // calprotectina/indican ficavam visíveis mesmo em "INTESTINO FUNCIONA BEM").
              else if (eraObst && !ehObst && fibroObst) fibro.delete(fibroObst)
              const fibroArr = Array.from(fibro)
              // Os exames complementares só aparecem se houver alteração intestinal,
              // fibromialgia diagnosticada ou obstipação no fibromiálgico. Quando somem,
              // zera os valores digitados (evita reaproveitar dado de marcação errada).
              const mostra = (novo && novo !== 'INTESTINO FUNCIONA BEM')
                || fibroArr.includes("TENHO FIBROMIALGIA DIAGNOSTICADA")
                || (fibroObst && fibroArr.includes(fibroObst))
              return {
                ...p,
                status_intestinal: novo,
                status_fibromialgia: fibroArr,
                calprotectina: mostra ? p.calprotectina : '',
                indican: mostra ? p.indican : '',
              }
            })
          }} />

          {(
            (form.status_intestinal && form.status_intestinal !== 'INTESTINO FUNCIONA BEM') ||
            form.status_fibromialgia.includes("TENHO FIBROMIALGIA DIAGNOSTICADA") ||
            form.status_fibromialgia.includes("OBSTIPA\u00c7\u00c3O CR\u00d4NICA")
          ) && (
            <div style={{ marginTop:'0.6rem', padding:'0.6rem', background:'#FEF3C7', borderRadius:'8px', border:'1px solid #FDE68A' }}>
              <p style={{ fontSize:'0.72rem', color:'#92400E', fontWeight:600, marginBottom:'0.5rem' }}>
                {"\ud83d\udd2c Exames Intestinais Complementares (sugeridos)"}
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:'0.6rem' }}>

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
                      width:'100%',
                      boxSizing:'border-box',
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
                      width:'100%',
                      boxSizing:'border-box',
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

          <SectionTitle>{"Intoler\u00e2ncias Alimentares"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {INTOLERANCIAS_OPS.map(op => (
              <CheckRow key={op} label={op} checked={form.intolerancias_alimentares.includes(op)} onClick={() => sf('intolerancias_alimentares', tog(form.intolerancias_alimentares, op))} />
            ))}
          </div>

          <SectionTitle>{"Status Fibromi\u00e1lgico | ME/CFS"}</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.5rem' }}>{"Marque os sintomas que apresenta com frequ\u00eancia:"}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {STATUS_FIBROMIALGIA_OPS.map(op => (
              <CheckRow key={op}
                label={FIBRO_SUBLABEL[op]
                  ? <span>{op}<span style={{ display:'block', fontSize:'0.6rem', fontWeight:500, color:'#6B7280', lineHeight:1.15 }}>{FIBRO_SUBLABEL[op]}</span></span>
                  : op}
                checked={form.status_fibromialgia.includes(op)}
                onClick={() => toggleFibro(op)} />
            ))}
          </div>
          {form.status_fibromialgia.includes('EM USO DE CANNABIS MEDICINAL') && (
            <div style={{ marginTop:'0.5rem', padding:'0.6rem', background:'#F5F3FF', borderRadius:8, border:'1px solid #DDD6FE' }}>
              <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#6D28D9', marginBottom:'0.5rem' }}>{"Qual canabinoide voc\u00ea usa?"}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
                {CANABINOIDES_OPS.map(op => (
                  <CheckRow key={op} label={op} checked={form.cannabinoides_tipos.includes(op)} onClick={() => sf('cannabinoides_tipos', tog(form.cannabinoides_tipos, op))} />
                ))}
              </div>
            </div>
          )}

          <DuvidaCheck secao="fibromialgico" duvidas={form.duvidas} onToggle={toggleDuvida} />

          <SectionTitle>Status COVID-19</SectionTitle>
          <CheckRow label="TIVE COVID-19" checked={form.teve_covid} onClick={() => sf('teve_covid', !form.teve_covid)} />
          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.6rem' }}>Vacina:</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {['VACINA PFIZER', 'VACINA JANSSEN', 'VACINA ASTRAZENECA', 'VACINA CORONAVAC', "TOMEI VACINAS, N\u00c3O SEI QUAIS", "N\u00c3O TOMEI VACINA"].map(v => (
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
              return <CheckRow key={at} label={gz(at, isFem)} checked={form.atividade_fisica.includes(at)} disabled={disabled} onClick={() => toggleAtividade(at)} />
            })}
          </div>

          <SectionTitle>{"Cirurgia Pl\u00e1stica P\u00f3s-Bari\u00e1trica"}</SectionTitle>
          <CheckRow label={"FIZ CIRURGIA PL\u00c1STICA P\u00d3S-BARI\u00c1TRICA"} checked={!!form.cirurgia_plastica} onClick={() => sf('cirurgia_plastica', !form.cirurgia_plastica)} />

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

          <SectionTitle>{"H\u00e1bitos Sociais | Estilo de Vida"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {HABITOS_SOCIAIS_OPS.map(op => (
              <CheckRow key={op} label={gz(op, isFem)} checked={form.habitos_sociais.includes(op)} onClick={() => sf('habitos_sociais', tog(form.habitos_sociais, op))} />
            ))}
          </div>

          <SectionTitle>{"Compuls\u00f5es | H\u00e1bitos Nocivos"}</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {COMPULSOES.map(c => <CheckRow key={c} label={c} checked={form.compulsoes.includes(c)} onClick={() => sf('compulsoes', tog(form.compulsoes, c))} />)}
          </div>

          <SectionTitle>Medicamentos em Uso</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
            {MEDICAMENTOS.map(m => <CheckRow key={m} label={m} checked={form.medicamentos.includes(m)} disabled={m === "REM\u00c9DIO PARA PRESS\u00c3O" && form.status_pressorico === "N\u00c3O SOU HIPERTENSO"} onClick={() => {
              const novoMeds = tog(form.medicamentos, m)
              setForm(p => ({
                ...p,
                medicamentos: novoMeds,
                // Rem\u00e9dio para tire\u00f3ide marcado \u2192 marca automaticamente TIROXINA nos
                // "medicamentos que afetam o eritron".
                tiroxina: (m === "REM\u00c9DIO PARA TIRE\u00d3IDE" && novoMeds.includes("REM\u00c9DIO PARA TIRE\u00d3IDE")) ? true : p.tiroxina,
              }))
            }} />)}
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

          <SectionTitle>{"Outra Condição de Saúde"}</SectionTitle>
          <label style={{ display:'block', fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', lineHeight:1.4 }}>{"Descreva aqui algum problema de saúde que você tem e não foi abordado:"}</label>
          <textarea value={form.outra_condicao} onChange={e => sf('outra_condicao', e.target.value)}
            rows={3} maxLength={500}
            style={{ width:'100%', boxSizing:'border-box', borderRadius:8, border:'2px solid #E5E7EB', padding:'0.6rem 0.7rem', fontSize:'0.85rem', fontFamily:'inherit', resize:'vertical', color:'#374151' }}
            placeholder={"Opcional"} />

          {erro && <p style={{ color:'#DC2626', fontSize:'0.85rem', marginTop:'0.8rem' }}>{erro}</p>}

          <div style={{ display:'flex', justifyContent:'center', marginTop:'1.5rem' }}>
            <PlayButton
              onClick={salvarAnamnese}
              loading={loading}
              label={"AVAN\u00c7AR PARA EXAMES"}
              hint={"Voc\u00ea vai precisar dos seus exames mais recentes"}
              ariaLabel={"Avan\u00e7ar para os exames"}
            />
          </div>
          <button style={btnS} onClick={onFechar}>{"\u2190 Voltar"}</button>
        </div>
      </div>
      </div>
    </>
  )
}
