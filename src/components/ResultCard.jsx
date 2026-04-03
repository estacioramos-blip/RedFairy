import { useState } from 'react';

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

function calcularFerroEV(hbAtual, sexo) {
  const pesoReferencia = 70;
  const hbAlvo = sexo === 'M' ? 14.0 : 12.5;
  const deficit = Math.max(hbAlvo - hbAtual, 0);
  const doseTotal = Math.round((pesoReferencia * deficit * 2.4 + 500) / 100) * 100;
  const sessoes = Math.ceil(doseTotal / 200);
  return { doseTotal, sessoes, hbAlvo, deficit: deficit.toFixed(1) };
}

function ModalFerroEV({ onClose, hbAtual, sexo }) {
  const { doseTotal, sessoes, hbAlvo, deficit } = calcularFerroEV(hbAtual, sexo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="bg-red-700 text-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-bold">💉 Reposição de Ferro Endovenoso</h2>
          <p className="text-red-200 text-xs mt-1">Estimativa baseada na Fórmula de Ganzoni</p>
        </div>

        <div className="p-6 space-y-4">

          {/* Cálculo */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Cálculo da Dose Total</p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Fórmula de Ganzoni:</span><br/>
              Dose (mg) = Peso × (Hb alvo − Hb atual) × 2,4 + 500
            </p>
            <div className="border-t border-red-200 pt-2 text-sm text-gray-700 space-y-1">
              <p>• Peso de referência: <strong>70 kg</strong></p>
              <p>• Hb atual: <strong>{hbAtual} g/dL</strong></p>
              <p>• Hb alvo: <strong>{hbAlvo} g/dL</strong></p>
              <p>• Déficit: <strong>{deficit} g/dL</strong></p>
            </div>
            <div className="bg-red-700 text-white rounded-lg px-4 py-2 text-center mt-2">
              <p className="text-xs opacity-80">Dose Total Estimada</p>
              <p className="text-2xl font-black">{doseTotal} mg</p>
            </div>
          </div>

          {/* Protocolo */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Opções de Reposição</p>

            {/* Opção 1 — Ferro Sacarato */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
              <p className="font-semibold text-gray-800">Opção 1 — Ferro Sacarato (200 mg/ampola)</p>
              <p>• Diluir <strong>200 mg</strong> em <strong>100 mL de SF 0,9%</strong></p>
              <p>• Infundir em <strong>30–60 minutos</strong></p>
              <p>• Intervalo mínimo entre sessões: <strong>48–72 horas</strong></p>
              <p>• Sessões necessárias: <strong>{sessoes} sessão(ões) de 200 mg</strong></p>
            </div>

            {/* Opção 2 — Ferrinject */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
              <p className="font-semibold text-gray-800">Opção 2 — Ferrinject® Carboximaltose (500 mg/ampola)</p>
              <p>• Cada ampola contém <strong>500 mg</strong> de ferro</p>
              <p>• Pode-se infundir <strong>até 1.000 mg</strong> (2 ampolas) em sessão única</p>
              <p>• Diluir em <strong>250 mL de SF 0,9%</strong> e infundir em <strong>15–30 minutos</strong></p>
              <p>• Sessões necessárias: <strong>{Math.ceil(doseTotal / 1000)} sessão(ões) de 1.000 mg</strong> ou <strong>{Math.ceil(doseTotal / 500)} de 500 mg</strong></p>
              <p>• Intervalo mínimo entre sessões: <strong>7 dias</strong></p>
            </div>

            {/* Vitamina D */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
              <p className="font-semibold">☀️ Vitamina D — Importante!</p>
              <p>
                A <strong>hipofosfatemia pós-reposição de ferro</strong> é um risco real, especialmente em pacientes com deficiência de vitamina D.
              </p>
              <p>
                Idealmente, administre <strong>10.000 UI de vitamina D</strong> no dia anterior à primeira dose de ferro endovenoso.
              </p>
            </div>

            {/* Precauções */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 space-y-2">
              <p className="font-semibold">⚠️ Precauções:</p>
              <p>• Ter disponível adrenalina e anti-histamínico</p>
              <p>• Observar o paciente por <strong>30 min</strong> após a infusão</p>
              <p>• Suspender imediatamente se sinais de reação alérgica</p>
              <p>• Não infundir com outros medicamentos na mesma via</p>
            </div>

            {/* Monitoramento */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 space-y-2">
              <p className="font-semibold">✅ Monitoramento:</p>
              <p>• Repetir hemograma após <strong>4 semanas</strong></p>
              <p>• Repetir ferritina e saturação após <strong>8 semanas</strong></p>
              <p>• Esperar elevação de Hb de <strong>1–2 g/dL</strong> por sessão de 200 mg</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            * Estimativa para paciente de 70 kg. Dose final deve ser ajustada pelo médico assistente conforme peso real e resposta clínica.
          </p>

          <button onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultCard({ resultado, onCopiar, copiado }) {
  const [showFerroEV, setShowFerroEV] = useState(false);

  if (!resultado.encontrado) {
    return (
      <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 text-center text-gray-600">
        <p className="text-lg font-medium">⚠️ Combinação não encontrada</p>
        <p className="text-sm mt-2">{resultado.mensagem}</p>
      </div>
    );
  }

  const scheme = colorScheme[resultado.color] || colorScheme.yellow;

  const precisaFerroEV =
    resultado.diagnostico?.toUpperCase().includes('ENDOVENOSA') ||
    resultado.diagnostico?.toUpperCase().includes('FERRO ENDOVENOSO') ||
    resultado.recomendacao?.toUpperCase().includes('ENDOVENOSA') ||
    resultado.recomendacao?.toUpperCase().includes('FERRO ENDOVENOSO');

  const hbAtual = resultado._inputs?.hemoglobina || 0;
  const sexo = resultado._inputs?.sexo || 'M';

  return (
    <>
      {showFerroEV && (
        <ModalFerroEV
          onClose={() => setShowFerroEV(false)}
          hbAtual={hbAtual}
          sexo={sexo}
        />
      )}

      <div className={`rounded-2xl border-2 ${scheme.border} ${scheme.bg} shadow-lg overflow-hidden`}>

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

          <div className={`rounded-xl border px-4 py-3 text-sm ${fraseDataColor[resultado.fraseData.tipo]}`}>
            <span className="font-semibold">
              📅 {resultado.diasDesdeColeta} dia(s) desde a coleta
            </span>
            <p className="mt-1">{resultado.fraseData.texto}</p>
          </div>

          <div>
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>
              🏷️ Diagnóstico
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
              {resultado.diagnostico}
            </p>
          </div>

          <div>
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>
              📋 Recomendação
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
              {resultado.recomendacao}
            </p>
          </div>

          {precisaFerroEV && (
            <button
              onClick={() => setShowFerroEV(true)}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              💉 Como repor o Ferro Endovenoso
            </button>
          )}

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
    </>
  );
}