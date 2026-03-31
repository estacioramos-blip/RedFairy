const colorScheme = {
  green:  { bg: 'bg-green-50',  border: 'border-green-400',  badge: 'bg-green-600',  text: 'text-green-800'  },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-400', badge: 'bg-yellow-500', text: 'text-yellow-800' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-400', badge: 'bg-orange-500', text: 'text-orange-800' },
  red:    { bg: 'bg-red-50',    border: 'border-red-500',    badge: 'bg-red-600',    text: 'text-red-800'    },
};

const fraseDataColor = {
  A: 'bg-green-100  text-green-800  border-green-300',
  B: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  C: 'bg-red-100    text-red-800    border-red-300',
};

export default function ResultCard({ resultado, onCopiar, copiado }) {

  if (!resultado.encontrado) {
    return (
      <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 text-center text-gray-600">
        <p className="text-lg font-medium">⚠️ Combinação não encontrada</p>
        <p className="text-sm mt-2">{resultado.mensagem}</p>
      </div>
    );
  }

  const scheme = colorScheme[resultado.color] || colorScheme.yellow;

  return (
    <div className={`rounded-2xl border-2 ${scheme.border} ${scheme.bg} shadow-lg overflow-hidden`}>

      {/* HEADER */}
      <div className={`${scheme.badge} text-white px-6 py-4 flex items-center justify-between`}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Diagnóstico</p>
          <h3 className="text-xl font-bold">{resultado.label}</h3>
        </div>
        <button
          onClick={onCopiar}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all
            ${copiado ? 'bg-white text-green-700' : 'bg-white/20 hover:bg-white/30 text-white'}`}
        >
          {copiado ? '✅ Copiado!' : '📋 Copiar'}
        </button>
      </div>

      <div className="p-6 space-y-5">

        {/* FRASE DATA */}
        <div className={`rounded-xl border px-4 py-3 text-sm ${fraseDataColor[resultado.fraseData.tipo]}`}>
          <span className="font-semibold">
            📅 {resultado.diasDesdeColeta} dia(s) desde a coleta
          </span>
          <p className="mt-1">{resultado.fraseData.texto}</p>
        </div>

        {/* DIAGNÓSTICO */}
        <div>
          <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>
            🏷️ Diagnóstico
          </h4>
          <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
            {resultado.diagnostico}
          </p>
        </div>

        {/* RECOMENDAÇÃO */}
        <div>
          <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>
            📋 Recomendação {resultado.isAge2 ? '(Faixa +40/+41)' : '(Faixa Jovem)'}
          </h4>
          <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
            {resultado.recomendacao}
          </p>
        </div>

        {/* HIPERMENORREIA */}
        {resultado.fraseHipermenorreia && (
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wide mb-2 text-pink-700">
              ⚠️ Hipermenorreia
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed bg-pink-50 rounded-xl p-4 border border-pink-200">
              {resultado.fraseHipermenorreia}
            </p>
          </div>
        )}

        {/* COMENTÁRIOS DE MEDICAMENTOS */}
        {resultado.comentarios.length > 0 && (
          <div>
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>
              💊 Medicamentos / Suplementos
            </h4>
            <div className="space-y-2">
              {resultado.comentarios.map((c, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">{c.titulo}</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{c.texto}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRÓXIMOS EXAMES */}
        <div>
          <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>
            🧪 Próximos Exames Sugeridos
          </h4>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="grid grid-cols-2 gap-1">
              {resultado.proximosExames.map((exame, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-gray-400">•</span>
                  {exame}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTÃO COPIAR GRANDE */}
        <button
          onClick={onCopiar}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all
            ${copiado
              ? 'bg-green-500 text-white'
              : `${scheme.badge} text-white hover:opacity-90`
            }`}
        >
          {copiado ? '✅ Resultado Copiado!' : '📋 Copiar Resultado para WhatsApp'}
        </button>

      </div>
    </div>
  );
}