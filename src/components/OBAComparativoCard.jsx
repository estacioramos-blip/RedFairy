// =============================================================================
// OBAComparativoCard — exibe o diff produzido por obaComparador.compararCiclos.
// Fase 1: estado clínico global, módulos (por id) e peso/IMC. Fase 2: exames
// sugeridos (novos/resolvidos/mantidos). Fase 3: exames laboratoriais numéricos.
// Fase seguinte (status categóricos) só adiciona seção quando `diff` trouxer
// essa chave — nada a mudar na estrutura.
// =============================================================================

const SETA = {
  MELHOROU: { txt: '↑ melhorou', cor: '#16A34A' },
  PIOROU: { txt: '↓ piorou', cor: '#DC2626' },
  ESTAVEL: { txt: '→ estável', cor: '#6B7280' },
  NOVO: { txt: '● novo', cor: '#B45309' },
  RESOLVIDO: { txt: '✓ resolvido', cor: '#15803D' },
}
const seta = (status) => SETA[status] || { txt: '—', cor: '#6B7280' }

// Prioridade de leitura clínica: o que piorou/é novo primeiro, o que melhorou
// depois — um médico escaneando a lista vê o que precisa de atenção antes.
const PRIORIDADE = { PIOROU: 0, NOVO: 1, MELHOROU: 2, RESOLVIDO: 3, ESTAVEL: 4 }

function formatarDataISO(iso) {
  if (!iso) return null
  return String(iso).slice(0, 10).split('-').reverse().join('/')
}

const cellStyle = { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0.5rem 0.6rem' }
const labelStyle = { fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.2rem' }
const valueStyle = { fontSize: '0.74rem', color: '#374151', fontWeight: 700, margin: 0 }
const setaStyle = (cor) => ({ fontSize: '0.66rem', fontWeight: 800, color: cor, margin: '0.15rem 0 0' })

export default function OBAComparativoCard({ diff, titulo }) {
  if (!diff) return null
  const { meta, resumo, estado, ponderal, modulos, examesSugeridos, exames } = diff
  const dataRefFmt = formatarDataISO(meta.dataReferencia)

  const chips = [
    resumo.pioraram > 0 && { n: resumo.pioraram, label: `piorou`, cor: '#DC2626' },
    resumo.novos > 0 && { n: resumo.novos, label: `novo(s)`, cor: '#B45309' },
    resumo.melhoraram > 0 && { n: resumo.melhoraram, label: `melhorou`, cor: '#16A34A' },
    resumo.resolvidos > 0 && { n: resumo.resolvidos, label: `resolvido(s)`, cor: '#15803D' },
  ].filter(Boolean)

  const modulosMudaram = (modulos || [])
    .filter(m => m.status !== 'ESTAVEL')
    .sort((a, b) => (PRIORIDADE[a.status] ?? 9) - (PRIORIDADE[b.status] ?? 9))
  const examesMudaram = (exames || [])
    .filter(e => e.status !== 'ESTAVEL')
    .sort((a, b) => (PRIORIDADE[a.status] ?? 9) - (PRIORIDADE[b.status] ?? 9))
  const temSecaoExamesLab = examesMudaram.length > 0
  const temSecaoExamesSugeridos = !!examesSugeridos && (examesSugeridos.novos.length > 0 || examesSugeridos.resolvidos.length > 0 || examesSugeridos.mantidos.length > 0)

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.9rem 1rem', marginBottom: '0.9rem' }}>
      <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1F2937', margin: '0 0 0.2rem' }}>{titulo}</p>
      {dataRefFmt && (
        <p style={{ fontSize: '0.68rem', color: '#6B7280', margin: '0 0 0.55rem' }}>
          {"Comparado com "}{dataRefFmt}{meta.diasEntre != null ? ` (${meta.diasEntre} dias)` : ''}
        </p>
      )}

      {chips.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.7rem' }}>
          {chips.map((c, i) => (
            <span key={i} style={{ fontSize: '0.66rem', fontWeight: 800, color: 'white', background: c.cor, borderRadius: 999, padding: '0.2rem 0.55rem', whiteSpace: 'nowrap' }}>
              {c.n} {c.label}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '0 0 0.7rem' }}>{"Sem mudanças relevantes nos módulos clínicos."}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0.4rem', marginBottom: modulosMudaram.length ? '0.6rem' : 0 }}>
        <div style={cellStyle}>
          <p style={labelStyle}>{"Estado clínico"}</p>
          <p style={valueStyle}>{estado.anterior || '—'}{" → "}{estado.atual || '—'}</p>
          <p style={setaStyle(seta(estado.status).cor)}>{seta(estado.status).txt}</p>
        </div>
        <div style={cellStyle}>
          <p style={labelStyle}>{"Peso"}</p>
          <p style={valueStyle}>
            {ponderal.pesoRef != null ? `${ponderal.pesoRef} → ` : ''}{ponderal.pesoAtu != null ? `${ponderal.pesoAtu} kg` : '—'}
          </p>
          <p style={setaStyle(seta(ponderal.status).cor)}>
            {ponderal.status ? `${seta(ponderal.status).txt}${ponderal.deltaPesoPct != null ? ` (${ponderal.deltaPesoPct > 0 ? '+' : ''}${ponderal.deltaPesoPct}%)` : ''}` : '—'}
          </p>
        </div>
      </div>

      {modulosMudaram.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: (temSecaoExamesLab || temSecaoExamesSugeridos) ? '0.6rem' : 0 }}>
          {modulosMudaram.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0.4rem 0.6rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#374151', fontWeight: 600 }}>{m.titulo}</span>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: seta(m.status).cor, whiteSpace: 'nowrap' }}>{seta(m.status).txt}</span>
            </div>
          ))}
        </div>
      )}

      {temSecaoExamesLab && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: temSecaoExamesSugeridos ? '0.6rem' : 0 }}>
          {examesMudaram.map(e => (
            <div key={e.chave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0.4rem 0.6rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#374151', fontWeight: 600 }}>
                {e.rotulo}{" "}
                <span style={{ fontWeight: 400, color: '#6B7280' }}>{e.valorRef}{" → "}{e.valorAtu}{e.unidade ? ` ${e.unidade}` : ''}</span>
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: seta(e.status).cor, whiteSpace: 'nowrap' }}>{seta(e.status).txt}</span>
            </div>
          ))}
        </div>
      )}

      {temSecaoExamesSugeridos && (
        <div>
          <p style={labelStyle}>{"Exames sugeridos"}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {examesSugeridos.novos.map((nome, i) => (
              <div key={'novo-' + i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0.4rem 0.6rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#374151', fontWeight: 600 }}>{nome}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: seta('NOVO').cor, whiteSpace: 'nowrap' }}>{seta('NOVO').txt}</span>
              </div>
            ))}
            {examesSugeridos.resolvidos.map((nome, i) => (
              <div key={'resolvido-' + i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0.4rem 0.6rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#374151', fontWeight: 600 }}>{nome}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: seta('RESOLVIDO').cor, whiteSpace: 'nowrap' }}>{seta('RESOLVIDO').txt}</span>
              </div>
            ))}
          </div>
          {examesSugeridos.mantidos.length > 0 && (
            <p style={{ fontSize: '0.68rem', color: '#6B7280', margin: '0.35rem 0 0' }}>
              {"Ainda pendente"}{examesSugeridos.mantidos.length > 1 ? 's' : ''}{": "}{examesSugeridos.mantidos.join(' • ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
