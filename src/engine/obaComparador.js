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

import { OBA_CUTOFFS, CUTOFFS_BARIATRICA, classificarValor } from './obaCutoffs'
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
// de classificarValor com contexto.bariatrica=true).
function resolverCutoff(chave) {
  return CUTOFFS_BARIATRICA[chave] || OBA_CUTOFFS[chave] || null
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

    const cutoff = resolverCutoff(chave)
    if (!cutoff) continue

    const limiarPct = opts.limiaresExamePct?.[chave] ?? opts.limiarExamePctDefault ?? LIMIAR_EXAME_PCT_DEFAULT
    const status = statusEvolucaoAnalito(valorRef, valorAtu, cutoff, limiarPct)
    const classRef = classificarValor(chave, valorRef, { bariatrica: true })?.nivel || null
    const classAtu = classificarValor(chave, valorAtu, { bariatrica: true })?.nivel || null

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

function contarResumo(modulos, examesSugeridos, exames) {
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
  return r
}

// -----------------------------------------------------------------------------
// Diff PAR-A-PAR entre dois ciclos canônicos. Chamada 2x pelo consumidor (uma
// vez vs anterior, uma vez vs baseline) — não sabe de "anterior"/"baseline",
// só compara A vs B. Fase 0: estado + módulos + peso/IMC. Fase 2: exames
// sugeridos. Fase 3: exames laboratoriais numéricos. Fase seguinte: `categoricos`.
// -----------------------------------------------------------------------------
export function compararCiclos(cicloAtual, cicloReferencia, opts = {}) {
  if (!cicloAtual || !cicloReferencia) return null
  const modulos = compararModulos(cicloAtual, cicloReferencia)
  const examesSugeridos = compararExamesSugeridos(cicloAtual, cicloReferencia)
  const exames = compararExames(cicloAtual, cicloReferencia, opts)
  return {
    meta: {
      dataAtual: cicloAtual.data,
      dataReferencia: cicloReferencia.data,
      diasEntre: diasEntreDatas(cicloReferencia.data, cicloAtual.data),
    },
    resumo: contarResumo(modulos, examesSugeridos, exames),
    estado: compararEstado(cicloAtual, cicloReferencia),
    ponderal: compararPonderal(cicloAtual, cicloReferencia, opts),
    modulos,
    examesSugeridos,
    exames,
  }
}
