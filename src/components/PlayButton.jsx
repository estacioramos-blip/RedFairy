import { forwardRef } from 'react'

/**
 * PlayButton — botão circular cinza piscante com o símbolo PLAY (▶) em vinho,
 * subtexto vinho em caixa alta e, opcionalmente, uma linha menor laranja (hint).
 *
 * Padrão visual único de "confirmar/avançar" do RedFairy (substitui os botões
 * alongados antigos). Reaproveitado em: CompletarPerfil (CONFIRMO),
 * BoasVindas (CONTINUAR), banner OBA (ENTRAR) e final do OBAModal (AVANÇAR PARA EXAMES).
 *
 * Props:
 *   onClick, disabled, loading
 *   label    — subtexto vinho em caixa alta (ex.: "CONFIRMO")
 *   hint     — linha menor laranja abaixo do label (opcional)
 *   ariaLabel
 */
const PlayButton = forwardRef(function PlayButton(
  { onClick, disabled, loading, label, hint, ariaLabel },
  ref
) {
  return (
    <div className="flex flex-col items-center gap-1">
      <style>{`@keyframes rfPlayBlinkWine { 0%,100%{box-shadow:0 0 0 0 rgba(123,30,30,0.55);} 50%{box-shadow:0 0 0 9px rgba(123,30,30,0);} } .rf-play-wine{ animation: rfPlayBlinkWine 1.1s ease-in-out infinite; }`}</style>
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled || loading}
        aria-label={ariaLabel || label}
        className="rf-play-wine w-14 h-14 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors shadow-md disabled:opacity-50">
        <span style={{ color: '#7B1E1E', fontSize: '1.4rem', lineHeight: 1, marginLeft: 3 }}>{loading ? '…' : '▶'}</span>
      </button>
      <span className="text-xs font-bold tracking-wide text-center" style={{ color: '#7B1E1E' }}>{loading ? '...' : label}</span>
      {hint && <span className="text-[10px] font-medium text-center leading-tight" style={{ color: '#ea580c' }}>{hint}</span>}
    </div>
  )
})

export default PlayButton
