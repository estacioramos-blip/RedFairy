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

function contarResumo(modulos) {
  const r = { melhoraram: 0, pioraram: 0, estaveis: 0, novos: 0, resolvidos: 0 }
  for (const m of modulos) {
    if (m.status === STATUS.MELHOROU) r.melhoraram++
    else if (m.status === STATUS.PIOROU) r.pioraram++
    else if (m.status === STATUS.ESTAVEL) r.estaveis++
    else if (m.status === STATUS.NOVO) r.novos++
    else if (m.status === STATUS.RESOLVIDO) r.resolvidos++
  }
  return r
}

// -----------------------------------------------------------------------------
// Diff PAR-A-PAR entre dois ciclos canônicos. Chamada 2x pelo consumidor (uma
// vez vs anterior, uma vez vs baseline) — não sabe de "anterior"/"baseline",
// só compara A vs B. Fase 0: cobre estado + módulos + peso/IMC. Fases seguintes
// adicionam `exames`, `categoricos` e `examesSugeridos` ao objeto de saída.
// -----------------------------------------------------------------------------
export function compararCiclos(cicloAtual, cicloReferencia, opts = {}) {
  if (!cicloAtual || !cicloReferencia) return null
  const modulos = compararModulos(cicloAtual, cicloReferencia)
  return {
    meta: {
      dataAtual: cicloAtual.data,
      dataReferencia: cicloReferencia.data,
      diasEntre: diasEntreDatas(cicloReferencia.data, cicloAtual.data),
    },
    resumo: contarResumo(modulos),
    estado: compararEstado(cicloAtual, cicloReferencia),
    ponderal: compararPonderal(cicloAtual, cicloReferencia, opts),
    modulos,
  }
}
