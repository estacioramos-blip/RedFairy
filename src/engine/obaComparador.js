// =============================================================================
// obaComparador.js — motor de comparação longitudinal do OBA ("de foto pra filme").
// Puro (sem React/Supabase): recebe dois CICLOS canônicos (ver cicloFromRow) e
// devolve um objeto de diffs. Testável isoladamente com dados de exemplo.
//
// Vocabulário de MOVIMENTO (não confundir com o vocabulário CLÍNICO do motor —
// grave|moderado|leve|normal em obaEngine.js, ou normal|limitrofe|alterado em
// obaCutoffs.classificarValor). Isto aqui descreve a DIREÇÃO da mudança entre
// dois ciclos, não a gravidade em si.
// =============================================================================

import { OBA_CUTOFFS, CUTOFFS_BARIATRICA, CUTOFFS_POR_SEXO, classificarValor } from './obaCutoffs'
import { LABEL_POR_CHAVE, UNIT_POR_CHAVE } from './obaExamesRef'

export const STATUS = {
  MELHOROU: 'MELHOROU',
  PIOROU: 'PIOROU',
  ESTAVEL: 'ESTAVEL',
  NOVO: 'NOVO',
  RESOLVIDO: 'RESOLVIDO',
}

// Pior → melhor. Mesma ordem já usada no `cmp` embrionário do OBAModal.
const ORDEM_ESTADO = ['CRITICO', 'RUIM', 'RAZOAVEL', 'BOM', 'OTIMO']
const ORDEM_NIVEL = ['grave', 'moderado', 'leve', 'normal']

function statusPorOrdem(ordem, valAnterior, valAtual) {
  const iAnt = ordem.indexOf(valAnterior)
  const iAtu = ordem.indexOf(valAtual)
  if (iAnt < 0 || iAtu < 0) return null
  const d = Math.sign(iAtu - iAnt)
  return d > 0 ? STATUS.MELHOROU : d < 0 ? STATUS.PIOROU : STATUS.ESTAVEL
}

function diasEntreDatas(dataReferencia, dataAtual) {
  if (!dataReferencia || !dataAtual) return null
  const dRef = new Date(dataReferencia)
  const dAtu = new Date(dataAtual)
  if (isNaN(dRef) || isNaN(dAtu)) return null
  return Math.round((dAtu - dRef) / 86400000)
}

// -----------------------------------------------------------------------------
// CICLOS EFETIVOS — de linhas cruas para "um item por avaliação de verdade".
//
// Nem toda linha de `oba_anamnese` é um ciclo. A REVISÃO MÉDICA insere linha
// nova de propósito (para preservar o retrato original do paciente em
// `relatorio_oba._paciente_original`), e ela não é uma avaliação a mais — é a
// versão CORRIGIDA da avaliação anterior. Daí a regra: revisão SUBSTITUI o
// último ciclo acumulado, não empilha.
//
// Isso conserta três coisas de uma vez, que antes divergiam:
//   · o número da avaliação (contava revisão como ciclo — "2ª" virava "3ª");
//   · o BASELINE, que era `linhas[0]` cru: se o médico revisasse um paciente
//     que só tem o baseline (caso comum — o paciente marca dúvidas já na 1ª
//     anamnese), toda comparação "vs baseline" seguia usando exatamente o dado
//     que o médico tinha acabado de corrigir, produzindo deltas falsos de
//     peso/IMC/exames;
//   · o ciclo ANTERIOR, que já vinha certo por acidente (a revisão é a última
//     linha), e agora vem certo por construção.
//
// A regra vale porque a revisão sempre mira a ÚLTIMA linha do CPF
// (`carregarPacienteAvaliar`, no Calculator) — as linhas ficam na ordem
// [ciclo, rev?, rev?, ciclo, rev?, ...]. Revisão órfã (sem ciclo antes) é
// ignorada em vez de virar ciclo fantasma.
// -----------------------------------------------------------------------------
export function ciclosEfetivos(linhas) {
  const out = []
  for (const r of (linhas || [])) {
    if (!r) continue
    if (r.revisao_medica) {
      if (out.length) out[out.length - 1] = r
    } else {
      out.push(r)
    }
  }
  return out
}

// -----------------------------------------------------------------------------
// Normaliza uma linha crua de `oba_anamnese` num "ciclo" canônico — isola o
// motor do formato de banco. `relatorio_oba` = { ...retorno do avaliarOBA,
// form_snapshot: form, ... } (ver OBAModal.jsx salvarAnamnese/gerarRelatorio).
// -----------------------------------------------------------------------------
export function cicloFromRow(row) {
  if (!row) return null
  const relatorioOba = row.relatorio_oba || {}
  const formSnapshot = relatorioOba.form_snapshot || {}

  // IMC não é coluna própria — replica o cálculo do OBAModal (peso / altura²),
  // usando a altura guardada no form_snapshot daquele ciclo.
  const alturaCm = parseFloat(formSnapshot.altura)
  const alturaM = (Number.isFinite(alturaCm) && alturaCm > 0) ? alturaCm / 100 : null
  const peso = row.peso_atual != null ? Number(row.peso_atual) : null
  const imc = (alturaM && Number.isFinite(peso)) ? +(peso / (alturaM * alturaM)).toFixed(1) : null

  return {
    data: row.data_exames || (row.created_at ? String(row.created_at).slice(0, 10) : null),
    estadoClinico: row.estado_clinico || null,
    relatorio: {
      modulos: relatorioOba.modulos || [],
      alertas: relatorioOba.alertas || [],
      examesComplementares: relatorioOba.examesComplementares || [],
    },
    formSnapshot,
    exames: row,   // linha crua — fases seguintes extraem as colunas de exame direto daqui
    peso,
    imc,
  }
}

// -----------------------------------------------------------------------------
// Dimensão: ESTADO CLÍNICO GLOBAL (CRITICO..OTIMO)
// -----------------------------------------------------------------------------
function compararEstado(cicloAtual, cicloReferencia) {
  const anterior = cicloReferencia.estadoClinico
  const atual = cicloAtual.estadoClinico
  return { anterior, atual, status: statusPorOrdem(ORDEM_ESTADO, anterior, atual) }
}

// -----------------------------------------------------------------------------
// Dimensão: PESO / IMC. Limiar por PERCENTUAL do peso (decisão do Dr. Ramos) —
// default 3%, PROVISÓRIO, passar opts.limiarPesoPct para ajustar sem mexer aqui.
// Segue o precedente já usado no OBAModal (perder peso = melhora, ganhar = piora).
// -----------------------------------------------------------------------------
function compararPonderal(cicloAtual, cicloReferencia, opts) {
  const pesoRef = cicloReferencia.peso
  const pesoAtu = cicloAtual.peso
  const imcRef = cicloReferencia.imc
  const imcAtu = cicloAtual.imc
  let deltaPesoPct = null
  let status = null
  if (Number.isFinite(pesoRef) && Number.isFinite(pesoAtu) && pesoRef > 0) {
    deltaPesoPct = +(((pesoAtu - pesoRef) / pesoRef) * 100).toFixed(1)
    const limiarPct = opts.limiarPesoPct ?? 3   // PROVISÓRIO — ajustar quando o Dr. Ramos calibrar
    status = deltaPesoPct <= -limiarPct ? STATUS.MELHOROU
      : deltaPesoPct >= limiarPct ? STATUS.PIOROU
      : STATUS.ESTAVEL
  }
  return { pesoRef, pesoAtu, deltaPesoPct, imcRef, imcAtu, status }
}

// -----------------------------------------------------------------------------
// Dimensão: MÓDULOS por `id` estável. RESOLVIDO = módulo desapareceu OU virou
// 'normal' vindo de um nível pior (decisão do Dr. Ramos — trata os dois casos
// como resolvido, evita alarme de "sumiu sem explicação").
// -----------------------------------------------------------------------------
function compararModulos(cicloAtual, cicloReferencia) {
  const porId = (lista) => {
    const m = new Map()
    for (const item of (lista || [])) if (item?.id) m.set(item.id, item)
    return m
  }
  const mapRef = porId(cicloReferencia.relatorio.modulos)
  const mapAtu = porId(cicloAtual.relatorio.modulos)
  const ids = new Set([...mapRef.keys(), ...mapAtu.keys()])

  const out = []
  for (const id of ids) {
    const ref = mapRef.get(id)
    const atu = mapAtu.get(id)
    const nivelRef = ref?.nivel || null
    const nivelAtu = atu?.nivel || null
    const titulo = atu?.titulo || ref?.titulo || id
    let status

    if (ref && !atu) {
      status = STATUS.RESOLVIDO                              // desapareceu
    } else if (!ref && atu) {
      status = nivelAtu === 'normal' ? STATUS.ESTAVEL : STATUS.NOVO   // achado novo (a menos que já nasça normal)
    } else if (nivelAtu === 'normal' && nivelRef !== 'normal') {
      status = STATUS.RESOLVIDO                              // normalizou vindo de um nível pior
    } else {
      status = statusPorOrdem(ORDEM_NIVEL, nivelRef, nivelAtu) || STATUS.ESTAVEL
    }
    out.push({ id, titulo, nivelRef, nivelAtu, status })
  }
  return out
}

// -----------------------------------------------------------------------------
// Dimensão: EXAMES SUGERIDOS (examesComplementares) — diff de CONJUNTO por nome
// (strings já deduplicadas pelo motor, ver sweep de dedup do obaEngine.js).
// NOVOS = pedido apareceu agora; RESOLVIDOS = pedido sumiu (feito ou não é mais
// necessário); MANTIDOS = segue pendente nos dois ciclos.
// -----------------------------------------------------------------------------
function compararExamesSugeridos(cicloAtual, cicloReferencia) {
  const ref = new Set(cicloReferencia.relatorio.examesComplementares || [])
  const atu = new Set(cicloAtual.relatorio.examesComplementares || [])
  const novos = [...atu].filter(x => !ref.has(x))
  const resolvidos = [...ref].filter(x => !atu.has(x))
  const mantidos = [...atu].filter(x => ref.has(x))
  return { novos, resolvidos, mantidos }
}

// -----------------------------------------------------------------------------
// Dimensão: EXAMES LABORATORIAIS NUMÉRICOS. Reaproveita o princípio de
// HistoricoChartModal.calcularStatus (distância até a faixa normal + limiar de
// ruído) generalizado para qualquer analito com cutoff em obaCutoffs.js, e
// classificarValor (vocabulário normal|limitrofe|alterado, DIFERENTE do
// grave|moderado|leve/normal de módulo — usado só para rótulo/cor, não para
// decidir o STATUS de movimento).
//
// LIMIAR PROVISÓRIO: 10% relativo ao valor de referência (só Hb/ferritina têm
// limiar calibrado hoje, em HistoricoChartModal). Ajustável por analito via
// opts.limiaresExamePct = { chave: percentual }, ou globalmente via
// opts.limiarExamePctDefault — sem tocar este arquivo quando o Dr. Ramos calibrar.
// -----------------------------------------------------------------------------
const LIMIAR_EXAME_PCT_DEFAULT = 10

function distForaDaFaixa(v, lo, hi) {
  if (v < lo) return lo - v
  if (v > hi) return v - hi
  return 0
}

// Todo ciclo do OBA é de paciente bariátrico (é a tabela do sub-algoritmo
// bariátrico) — sempre resolve o cutoff ajustado quando existir (mesma regra
// de classificarValor com contexto.bariatrica=true). Prioridade IDÊNTICA à de
// classificarValor: dimórfico por sexo (testosterona/prolactina) > bariátrica
// (B12/vit D) > genérico sexo-cego. Sem isso, um homem com testosterona
// 50→80 ng/dL (hipogonádico nas duas medidas) caía no envelope sexo-cego
// 15-1000 — distância zero nas duas pontas — e o card de evolução mostrava
// ESTÁVEL/normal em vez de reconhecer que ele segue fora da faixa masculina.
function resolverCutoff(chave, sexo) {
  return (sexo && CUTOFFS_POR_SEXO[sexo]?.[chave]) || CUTOFFS_BARIATRICA[chave] || OBA_CUTOFFS[chave] || null
}

function statusEvolucaoAnalito(valorRef, valorAtu, { min, max }, limiarPct) {
  const dRef = distForaDaFaixa(valorRef, min, max)
  const dAtu = distForaDaFaixa(valorAtu, min, max)
  if (dRef === 0 && dAtu === 0) return STATUS.ESTAVEL
  const aproximou = dRef - dAtu   // > 0 = aproximou-se da faixa (melhora)
  const limiarAbs = (limiarPct / 100) * Math.max(Math.abs(valorRef), 1)
  if (aproximou >= limiarAbs) return STATUS.MELHOROU
  if (aproximou <= -limiarAbs) return STATUS.PIOROU
  return STATUS.ESTAVEL
}

function compararExames(cicloAtual, cicloReferencia, opts) {
  const out = []
  for (const chave of Object.keys(OBA_CUTOFFS)) {
    // Guarda EXPLÍCITA contra null/undefined/'' ANTES de Number(...): Number(null)
    // é 0 (não NaN!) — sem esta guarda, um exame NÃO PREENCHIDO num dos ciclos
    // vazaria como "valor 0" e produziria uma melhora/piora falsa.
    const bruteRef = cicloReferencia.exames?.[chave]
    const bruteAtu = cicloAtual.exames?.[chave]
    if (bruteRef == null || bruteRef === '' || bruteAtu == null || bruteAtu === '') continue
    const valorRef = Number(bruteRef)
    const valorAtu = Number(bruteAtu)
    if (!Number.isFinite(valorRef) || !Number.isFinite(valorAtu)) continue

    const cutoff = resolverCutoff(chave, opts.sexo)
    if (!cutoff) continue

    const limiarPct = opts.limiaresExamePct?.[chave] ?? opts.limiarExamePctDefault ?? LIMIAR_EXAME_PCT_DEFAULT
    const status = statusEvolucaoAnalito(valorRef, valorAtu, cutoff, limiarPct)
    const classRef = classificarValor(chave, valorRef, { bariatrica: true, sexo: opts.sexo })?.nivel || null
    const classAtu = classificarValor(chave, valorAtu, { bariatrica: true, sexo: opts.sexo })?.nivel || null

    out.push({
      chave,
      rotulo: LABEL_POR_CHAVE[chave] || chave,
      unidade: UNIT_POR_CHAVE[chave] || '',
      valorRef, valorAtu,
      deltaPct: +(((valorAtu - valorRef) / (valorRef || 1)) * 100).toFixed(1),
      classRef, classAtu,
      status,
    })
  }
  return out
}

// -----------------------------------------------------------------------------
// Dimensão: STATUS CATEGÓRICOS (queixas/achados declarados na anamnese) — diff
// via `formSnapshot` de cada ciclo (o formulário inteiro daquele ciclo, já
// persistido em `relatorio_oba.form_snapshot`). Cobre os ~16 campos status_*
// (arrays multi-select E enums de valor único — normalizados pro MESMO formato
// de conjunto). ENTROU = NOVO (âmbar), SAIU = RESOLVIDO (verde) — mesma
// convenção do card de exames sugeridos (decisão do Dr. Ramos: escopo = todos
// os ~16; cor sem distinção fina de polaridade por item, mesmo padrão).
// -----------------------------------------------------------------------------
const CAMPOS_CATEGORICOS = [
  { campo: 'status_ginecologico',   rotulo: 'Status Ginecológico' },
  { campo: 'status_hormonal',       rotulo: 'Status Hormonal' },
  { campo: 'status_cardiovascular', rotulo: 'Status Cardiovascular' },
  { campo: 'status_osseo',          rotulo: 'Status Ósseo' },
  { campo: 'status_intestinal',     rotulo: 'Status Intestinal' },
  { campo: 'status_respiratorio',   rotulo: 'Status Respiratório' },
  { campo: 'status_prostatico',     rotulo: 'Status Prostático' },
  { campo: 'status_alergico',       rotulo: 'Status Alérgico' },
  { campo: 'status_articular',      rotulo: 'Status Articular' },
  { campo: 'status_dental',         rotulo: 'Status Dental' },
  { campo: 'status_endoscopico',    rotulo: 'Achados Endoscópicos' },
  { campo: 'status_neurologico',    rotulo: 'Sintomas Neurológicos' },
  { campo: 'status_glicemico',      rotulo: 'Status Glicêmico' },
  { campo: 'status_pressorico',     rotulo: 'Status Pressórico' },
  { campo: 'status_gestacional',    rotulo: 'Status Gestacional' },
  { campo: 'status_fibromialgia',   rotulo: 'Sintomas de Fibromialgia' },
]

// Normaliza um valor de form_snapshot (array multi-select OU string única, o
// campo pode ser qualquer um dos dois conforme a seção da anamnese) num Set —
// string vazia/ausente/null vira conjunto vazio (nenhuma queixa marcada).
function comoConjunto(valor) {
  if (Array.isArray(valor)) return new Set(valor.filter(Boolean))
  if (valor) return new Set([valor])
  return new Set()
}

function compararCategoricos(cicloAtual, cicloReferencia) {
  const snapRef = cicloReferencia.formSnapshot || {}
  const snapAtu = cicloAtual.formSnapshot || {}
  const out = []
  for (const { campo, rotulo } of CAMPOS_CATEGORICOS) {
    const ref = comoConjunto(snapRef[campo])
    const atu = comoConjunto(snapAtu[campo])
    const entraram = [...atu].filter(x => !ref.has(x))
    const sairam = [...ref].filter(x => !atu.has(x))
    if (entraram.length === 0 && sairam.length === 0) continue   // sem mudança — não polui o diff
    out.push({ campo, rotulo, entraram, sairam })
  }
  return out
}

// -----------------------------------------------------------------------------
// Dimensão: ALERTAS — agora comparável de verdade, graças ao `codigo` estável
// que cada `alertas.push({codigo, nivel, texto})` do obaEngine.js ganhou no
// sweep da Fase 5 (~160 pontos, 1 codigo único por achado/condição). Antes,
// alertas eram texto livre sem chave estável — impossível saber se "o mesmo
// achado clínico" persiste entre ciclos sem regex frágil (a v1 desta feature
// deixou a seção de fora por causa disso).
//
// NOVOS = alerta que não existia no ciclo de referência; RESOLVIDOS = existia
// lá e sumiu; PERSISTENTES = está nos dois (mesmo codigo). Não há MELHOROU/
// PIOROU aqui — o `nivel` de um alerta é fixo no ponto do código que o gera,
// não varia ciclo a ciclo; o que muda é só a PRESENÇA do achado.
//
// LIMITAÇÃO CONHECIDA: ciclos salvos ANTES deste sweep têm `alertas` sem
// `codigo` (schema aditivo, como já é o padrão do `relatorio_oba`) — esses
// alertas são ignorados aqui (guarda `a?.codigo`), não aparecem como
// novos/resolvidos/persistentes. A comparação de alertas passa a funcionar
// de verdade a partir do primeiro ciclo salvo IGUAL ou POSTERIOR a este deploy.
// -----------------------------------------------------------------------------
function compararAlertas(cicloAtual, cicloReferencia) {
  const porCodigo = (lista) => {
    const m = new Map()
    for (const a of (lista || [])) if (a?.codigo) m.set(a.codigo, a)
    return m
  }
  const mapRef = porCodigo(cicloReferencia.relatorio.alertas)
  const mapAtu = porCodigo(cicloAtual.relatorio.alertas)
  const novos = [...mapAtu.entries()].filter(([c]) => !mapRef.has(c)).map(([codigo, a]) => ({ codigo, nivel: a.nivel, texto: a.texto }))
  const resolvidos = [...mapRef.entries()].filter(([c]) => !mapAtu.has(c)).map(([codigo, a]) => ({ codigo, nivel: a.nivel, texto: a.texto }))
  const persistentes = [...mapAtu.entries()].filter(([c]) => mapRef.has(c)).map(([codigo, a]) => ({ codigo, nivel: a.nivel, texto: a.texto }))
  return { novos, resolvidos, persistentes }
}

function contarResumo(modulos, examesSugeridos, exames, categoricos, alertas) {
  const r = { melhoraram: 0, pioraram: 0, estaveis: 0, novos: 0, resolvidos: 0 }
  for (const m of modulos) {
    if (m.status === STATUS.MELHOROU) r.melhoraram++
    else if (m.status === STATUS.PIOROU) r.pioraram++
    else if (m.status === STATUS.ESTAVEL) r.estaveis++
    else if (m.status === STATUS.NOVO) r.novos++
    else if (m.status === STATUS.RESOLVIDO) r.resolvidos++
  }
  if (examesSugeridos) {
    r.novos += examesSugeridos.novos.length
    r.resolvidos += examesSugeridos.resolvidos.length
  }
  if (exames) {
    for (const e of exames) {
      if (e.status === STATUS.MELHOROU) r.melhoraram++
      else if (e.status === STATUS.PIOROU) r.pioraram++
      else if (e.status === STATUS.ESTAVEL) r.estaveis++
    }
  }
  if (categoricos) {
    for (const c of categoricos) {
      r.novos += c.entraram.length
      r.resolvidos += c.sairam.length
    }
  }
  if (alertas) {
    r.novos += alertas.novos.length
    r.resolvidos += alertas.resolvidos.length
  }
  return r
}

// -----------------------------------------------------------------------------
// Diff PAR-A-PAR entre dois ciclos canônicos. Chamada 2x pelo consumidor (uma
// vez vs anterior, uma vez vs baseline) — não sabe de "anterior"/"baseline",
// só compara A vs B. Fase 0: estado + módulos + peso/IMC. Fase 2: exames
// sugeridos. Fase 3: exames laboratoriais numéricos. Fase 4: status
// categóricos. Fase 5: alertas (por codigo estável) — última dimensão do plano.
// -----------------------------------------------------------------------------
export function compararCiclos(cicloAtual, cicloReferencia, opts = {}) {
  if (!cicloAtual || !cicloReferencia) return null
  const modulos = compararModulos(cicloAtual, cicloReferencia)
  const examesSugeridos = compararExamesSugeridos(cicloAtual, cicloReferencia)
  const exames = compararExames(cicloAtual, cicloReferencia, opts)
  const categoricos = compararCategoricos(cicloAtual, cicloReferencia)
  const alertas = compararAlertas(cicloAtual, cicloReferencia)
  return {
    meta: {
      dataAtual: cicloAtual.data,
      dataReferencia: cicloReferencia.data,
      diasEntre: diasEntreDatas(cicloReferencia.data, cicloAtual.data),
    },
    resumo: contarResumo(modulos, examesSugeridos, exames, categoricos, alertas),
    estado: compararEstado(cicloAtual, cicloReferencia),
    ponderal: compararPonderal(cicloAtual, cicloReferencia, opts),
    modulos,
    examesSugeridos,
    exames,
    categoricos,
    alertas,
  }
}
