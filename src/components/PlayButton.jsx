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
    circleClass = 'bg-gray-300 hover:bg-gray-400',
    playColor = '#7B1E1E',
    labelColor = '#7B1E1E',
    ringColor = 'rgba(123,30,30,0.55)',
    labelShadow,
  },
  ref
) {
  return (
    <div className="flex flex-col items-center gap-1">
      <style>{`@keyframes rfPbBlink { 0%,100%{box-shadow:0 0 0 0 var(--rf-pb-ring,rgba(123,30,30,0.55));} 50%{box-shadow:0 0 0 9px transparent;} } .rf-pb{ animation: rfPbBlink 1.1s ease-in-out infinite; }`}</style>
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled || loading}
        aria-label={ariaLabel || label}
        style={{ '--rf-pb-ring': ringColor }}
        className={`rf-pb w-14 h-14 rounded-full ${circleClass} flex items-center justify-center transition-colors shadow-md disabled:opacity-50`}>
        <span style={{ color: playColor, fontSize: '1.4rem', lineHeight: 1, marginLeft: 3 }}>{loading ? '…' : '▶'}</span>
      </button>
      {label && <span className="text-xs font-bold tracking-wide text-center" style={{ color: labelColor, textShadow: labelShadow }}>{loading ? '...' : label}</span>}
      {hint && <span className="text-[10px] font-medium text-center leading-tight" style={{ color: '#ea580c' }}>{hint}</span>}
    </div>
  )
})

export default PlayButton
