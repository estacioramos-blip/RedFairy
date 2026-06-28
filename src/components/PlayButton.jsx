import { forwardRef } from 'react'

/**
 * PlayButton — botão circular piscante com o símbolo PLAY (▶), subtexto em caixa
 * alta e, opcionalmente, uma linha menor laranja (hint).
 *
 * Padrão visual único de "confirmar/avançar" do RedFairy (substitui os botões
 * alongados antigos). Reaproveitado em: CompletarPerfil (CONFIRMO),
 * BoasVindas (CONTINUAR), banner OBA (ENTRAR) e final do OBAModal (AVANÇAR PARA EXAMES).
 *
 * VARIANTES DE COR (props opcionais — o default reproduz o visual original:
 * círculo cinza + ▶ vinho + glow vinho):
 *   circleClass — classes Tailwind do círculo (ex.: 'bg-red-700 hover:bg-red-800')
 *   playColor   — cor do ▶ (ex.: '#2563eb' azul)
 *   labelColor  — cor do subtexto
 *   ringColor   — cor (rgba) do glow piscante
 *
 * Props base:
 *   onClick, disabled, loading
 *   label    — subtexto em caixa alta (ex.: "CONFIRMO")
 *   hint     — linha menor laranja abaixo do label (opcional)
 *   ariaLabel
 */
const PlayButton = forwardRef(function PlayButton(
  {
    onClick, disabled, loading, label, hint, ariaLabel,
    // PADRÃO ÚNICO (Estácio): TODO PlayButton é igual — círculo CINZA do logo + CONTORNO
    // PRETO + ▶ DOURADO + FLASH AMARELO-DOURADO. As props de cor antigas (circleClass/
    // playColor/ringColor) foram aposentadas (ignoradas) p/ garantir a uniformidade.
    labelColor = '#7B1E1E',
    labelShadow,
  },
  ref
) {
  return (
    <div className="flex flex-col items-center gap-1">
      <style>{`@keyframes rfPbBlink { 0%,100%{box-shadow:0 0 0 0 var(--rf-pb-ring,rgba(250,204,21,0.75));} 50%{box-shadow:0 0 0 9px transparent;} } .rf-pb{ animation: rfPbBlink 1.1s ease-in-out infinite; }`}</style>
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled || loading}
        aria-label={ariaLabel || label}
        style={{ '--rf-pb-ring': 'rgba(250,204,21,0.75)', borderColor: '#000' }}
        className="rf-pb w-12 h-12 rounded-full bg-gray-500 hover:bg-gray-600 border-2 flex items-center justify-center transition-colors shadow-md disabled:opacity-50">
        <span style={{ color: '#E3AE37', fontSize: '1.25rem', lineHeight: 1, marginLeft: 3 }}>{loading ? '…' : '▶'}</span>
      </button>
      {label && <span className="text-xs font-bold tracking-wide text-center" style={{ color: labelColor, textShadow: labelShadow }}>{loading ? '...' : label}</span>}
      {hint && <span className="text-[10px] font-medium text-center leading-tight" style={{ color: '#ea580c' }}>{hint}</span>}
    </div>
  )
})

export default PlayButton
