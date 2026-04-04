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

function calcularSangria(ferritina, satTransf, sexo, peso, hbAtual, isPolicitemiaVera) {
  const ferritinAlvo = sexo === 'M' ? 150 : 100;
  const hbMin = sexo === 'M' ? 13.0 : 12.0;
  const volume = peso >= 65 ? 450 : peso >= 50 ? 400 : 350;
  let intervalo = 30;
  if (sexo === 'M' && ferritina >= 1200) intervalo = 25;
  if (sexo === 'F' && ferritina >= 800)  intervalo = 25;
  const sangriaEstimadas = Math.max(Math.ceil((ferritina - ferritinAlvo) / 100), 1);
  const penultima = Math.max(sangriaEstimadas - 1, 1);
  return { volume, intervalo, sangriaEstimadas, penultima, ferritinAlvo, hbMin };
}

function ModalFerroEV({ onClose, hbAtual, sexo }) {
  const { doseTotal, sessoes, hbAlvo, deficit } = calcularFerroEV(hbAtual, sexo);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-y-auto"
        style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="bg-red-700 text-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-bold">💉 Reposição de Ferro Endovenoso</h2>
          <p className="text-red-200 text-xs mt-1">Estimativa baseada na Fórmula de Ganzoni</p>
        </div>
        <div className="p-6 space-y-4">
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
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Opções de Reposição</p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
              <p className="font-semibold text-gray-800">Opção 1 — Ferro Sacarato (100 mg/ampola)</p>
              <p>• Usar <strong>2 ampolas (200 mg)</strong> por sessão, diluídas em <strong>100 mL de SF 0,9%</strong></p>
              <p>• Infundir em <strong>30–60 minutos</strong></p>
              <p>• Intervalo mínimo entre sessões: <strong>48–72 horas</strong></p>
              <p>• Sessões necessárias: <strong>{sessoes} sessão(ões) de 200 mg</strong></p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
              <p className="font-semibold text-gray-800">Opção 2 — Ferrinject® Carboximaltose (500 mg/ampola)</p>
              <p>• Cada ampola contém <strong>500 mg</strong> de ferro</p>
              <p>• Pode-se infundir <strong>até 1.000 mg</strong> (2 ampolas) em sessão única</p>
              <p>• Diluir em <strong>250 mL de SF 0,9%</strong> e infundir em <strong>15–30 minutos</strong></p>
              <p>• Sessões necessárias: <strong>{Math.ceil(doseTotal / 1000)} sessão(ões) de 1.000 mg</strong> ou <strong>{Math.ceil(doseTotal / 500)} de 500 mg</strong></p>
              <p>• Intervalo mínimo entre sessões: <strong>7 dias</strong></p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
              <p className="font-semibold">☀️ Vitamina D — Importante!</p>
              <p>A <strong>hipofosfatemia pós-reposição de ferro</strong> é um risco real, especialmente em pacientes com deficiência de vitamina D.</p>
              <p>Idealmente, administre <strong>10.000 UI de vitamina D</strong> no dia anterior à primeira dose de ferro endovenoso.</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 space-y-2">
              <p className="font-semibold">⚠️ Precauções:</p>
              <p>• Ter disponível adrenalina e anti-histamínico</p>
              <p>• Observar o paciente por <strong>30 min</strong> após a infusão</p>
              <p>• Suspender imediatamente se sinais de reação alérgica</p>
              <p>• Não infundir com outros medicamentos na mesma via</p>
            </div>
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

function ModalSangria({ onClose, ferritina, satTransf, sexo, hbAtual, isPolicitemiaVera }) {
  const [peso, setPeso] = useState('');
  const [calculado, setCalculado] = useState(false);
  const [resultado, setResultado] = useState(null);

  function handleCalcular() {
    const pesoNum = Number(peso);
    if (!pesoNum || pesoNum < 30 || pesoNum > 200) return;
    setResultado(calcularSangria(ferritina, satTransf, sexo, pesoNum, hbAtual, isPolicitemiaVera));
    setCalculado(true);
  }

  const hbMin = sexo === 'M' ? 13.0 : 12.0;
  const hbSegura = hbAtual >= hbMin;
  const isotonico = sexo === 'M' ? '500 mL' : '300 mL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-y-auto"
        style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>

        <div className="bg-red-800 text-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-bold">🩸 Sangria Terapêutica</h2>
          <p className="text-red-200 text-xs mt-1">Protocolo individualizado</p>
        </div>

        <div className="p-6 space-y-4">
          {!hbSegura && (
            <div className="bg-red-50 border border-red-400 rounded-xl p-4 text-sm text-red-800">
              <p className="font-bold">⛔ Atenção!</p>
              <p>A Hb atual ({hbAtual} g/dL) está abaixo do mínimo seguro ({hbMin} g/dL). <strong>Não realizar sangria</strong> até normalização da Hb.</p>
            </div>
          )}

          {isPolicitemiaVera && (
            <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 text-sm text-orange-800">
              <p className="font-bold">⚠️ Policitemia Vera</p>
              <p>Na policitemia vera as sangrias são indicadas mesmo na ausência de siderose. O objetivo é manter o hematócrito abaixo de 45%.</p>
            </div>
          )}

          {!calculado && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Informe o peso do paciente para calcular o volume por sessão:</p>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Peso (kg)</label>
                <input type="number" value={peso}
                  onChange={e => setPeso(e.target.value)}
                  placeholder="Ex: 70"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <button onClick={handleCalcular}
                disabled={!peso || Number(peso) < 30}
                className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                Calcular Protocolo
              </button>
            </div>
          )}

          {calculado && resultado && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Volume por Sessão</p>
                <div className="bg-red-700 text-white rounded-lg px-4 py-2 text-center">
                  <p className="text-xs opacity-80">Para {peso} kg</p>
                  <p className="text-3xl font-black">{resultado.volume} mL</p>
                  <p className="text-xs opacity-80">por sessão</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
                <p className="font-semibold text-gray-800">Planejamento</p>
                <p>• Intervalo recomendado: <strong>{resultado.intervalo} dias</strong></p>
                <p>• Ferritina atual: <strong>{ferritina} ng/mL</strong></p>
                <p>• Ferritina alvo: <strong>{resultado.ferritinAlvo} ng/mL</strong></p>
                <p>• Sangrias estimadas até o alvo: <strong>~{resultado.sangriaEstimadas} sessão(ões)</strong></p>
                <p className="text-orange-700 font-medium">
                  • Dosar ferritina + sat. transferrina antes da {resultado.penultima}ª sangria
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 space-y-2">
                <p className="font-semibold">⚠️ Segurança:</p>
                <p>• Suspender se Hb cair abaixo de <strong>{resultado.hbMin} g/dL</strong></p>
                <p>• Verificar Hb e pressão arterial antes de cada sessão</p>
                <p>• <strong>Não realizar</strong> se pressão arterial sistólica &gt; <strong>160 mmHg</strong></p>
                <p>• O paciente deve consumir <strong>{isotonico}</strong> de bebida isotônica (Gatorade, Powerade ou similar) <strong>30 minutos antes</strong> do procedimento</p>
                <p>• Observar por <strong>15–30 min</strong> após o procedimento</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
                <p className="font-semibold text-gray-800">Técnica:</p>
                <p>• Acesso venoso periférico calibroso</p>
                <p>• Bolsa de coleta padrão de hemocomponente</p>
                <p>• Duração: <strong>20–40 minutos</strong></p>
                <p>• Pode ser feita em clínica de hematologia ou banco de sangue</p>
              </div>

              <button onClick={() => { setCalculado(false); setPeso(''); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-2 rounded-xl transition-colors">
                ← Recalcular com outro peso
              </button>
            </div>
          )}

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
  const [showSangria, setShowSangria] = useState(false);

  // ── Combinação não reconhecida ────────────────────────────────────────────
  if (!resultado.encontrado) {
    return (
      <div className="bg-white border-2 border-amber-300 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-amber-50 px-6 py-5 flex items-start gap-4">
          <span style={{ fontSize: '28px', lineHeight: 1 }}>🔍</span>
          <div>
            <p className="font-semibold text-amber-800 text-base">
              Combinação não reconhecida pelo algoritmo
            </p>
            <p className="text-amber-700 text-sm mt-1 leading-relaxed">
              Os valores informados não correspondem a nenhum padrão catalogado.
              Isso pode indicar um resultado laboratorial atípico, um erro de digitação,
              ou uma combinação que ainda não está mapeada no RedFairy, ou corresponder ao efeito de medicamentos ministrados recentemente, alterando os parâmetros de forma incomum.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm font-semibold text-gray-600">O que fazer:</p>
          <div className="space-y-2">
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-amber-500 mt-0.5">①</span>
              <span>Confira se os valores foram digitados corretamente, comparando com o laudo original.</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-amber-500 mt-0.5">②</span>
              <span>Verifique se o laboratório utilizou as mesmas unidades de medida (ng/mL, g/dL, fL, %).</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-amber-500 mt-0.5">③</span>
              <span>Se os valores estiverem corretos, consulte seu médico — resultados muito atípicos podem indicar erro laboratorial ou condição clínica rara.</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 mt-2 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Valores informados</p>
            <p className="text-xs text-gray-500 font-mono leading-relaxed">
              Hb: {resultado.mensagem.match(/Hb=([\d.]+)/)?.[1] ?? '—'} g/dL &nbsp;|&nbsp;
              Ferritina: {resultado.mensagem.match(/Ferritina=([\d.]+)/)?.[1] ?? '—'} ng/mL &nbsp;|&nbsp;
              VCM: {resultado.mensagem.match(/VCM=([\d.]+)/)?.[1] ?? '—'} fL<br/>
              RDW: {resultado.mensagem.match(/RDW=([\d.]+)/)?.[1] ?? '—'} % &nbsp;|&nbsp;
              Sat: {resultado.mensagem.match(/Sat=([\d.]+)/)?.[1] ?? '—'} %
            </p>
          </div>
        </div>
      </div>
    );
  }

  const scheme = colorScheme[resultado.color] || colorScheme.yellow;

  const precisaFerroEV =
    resultado.diagnostico?.toUpperCase().includes('ENDOVENOSA') ||
    resultado.diagnostico?.toUpperCase().includes('INTRAVENOSA') ||
    resultado.diagnostico?.toUpperCase().includes('FERRO ENDOVENOSO') ||
    resultado.recomendacao?.toUpperCase().includes('ENDOVENOSA') ||
    resultado.recomendacao?.toUpperCase().includes('INTRAVENOSA') ||
    resultado.recomendacao?.toUpperCase().includes('FERRO ENDOVENOSO');

  const precisaSangria =
    resultado.diagnostico?.toUpperCase().includes('SANGRIA TERAPÊUTICA') ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIA TERAPEUTICA') ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIAS TERAPÊUTICAS') ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIAS TERAPEUTICAS') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIA TERAPÊUTICA') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIA TERAPEUTICA') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIAS TERAPÊUTICAS') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIAS TERAPEUTICAS');

  const isPolicitemiaVera = resultado.id === 81;
  const hbAtual = resultado._inputs?.hemoglobina || 0;
  const sexo = resultado._inputs?.sexo || 'M';
  const ferritina = resultado._inputs?.ferritina || 0;
  const satTransf = resultado._inputs?.satTransf || 0;

  return (
    <>
      {showFerroEV && (
        <ModalFerroEV onClose={() => setShowFerroEV(false)} hbAtual={hbAtual} sexo={sexo} />
      )}
      {showSangria && (
        <ModalSangria
          onClose={() => setShowSangria(false)}
          ferritina={ferritina}
          satTransf={satTransf}
          sexo={sexo}
          hbAtual={hbAtual}
          isPolicitemiaVera={isPolicitemiaVera}
        />
      )}

      <div className={`rounded-2xl border-2 ${scheme.border} ${scheme.bg} shadow-lg overflow-hidden`}>

        <div className={`${scheme.badge} text-white px-6 py-4 flex items-center justify-between`}>
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Diagnóstico</p>
            <h3 className="text-xl font-bold">{resultado.label}</h3>
          </div>
          <button onClick={onCopiar}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all
              ${copiado ? 'bg-white text-green-700' : 'bg-white/20 hover:bg-white/30 text-white'}`}>
            {copiado ? '✅ Copiado!' : '📋 Copiar'}
          </button>
        </div>

        <div className="p-6 space-y-5">

          <div className={`rounded-xl border px-4 py-3 text-sm ${fraseDataColor[resultado.fraseData.tipo]}`}>
            <span className="font-semibold">📅 {resultado.diasDesdeColeta} dia(s) desde a coleta</span>
            <p className="mt-1">{resultado.fraseData.texto}</p>
          </div>

          <div>
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>🏷️ Diagnóstico</h4>
            <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
              {resultado.diagnostico}
            </p>
          </div>

          <div>
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>📋 Recomendação</h4>
            <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
              {resultado.recomendacao}
            </p>
          </div>

          {precisaFerroEV && (
            <button onClick={() => setShowFerroEV(true)}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              💉 Como repor o Ferro Endovenoso
            </button>
          )}

          {precisaSangria && (
            <button onClick={() => setShowSangria(true)}
              className="w-full bg-red-900 hover:bg-red-950 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              🩸 Protocolo de Sangria Terapêutica
            </button>
          )}

          {resultado.fraseHipermenorreia && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-2 text-pink-700">⚠️ Hipermenorreia</h4>
              <p className="text-gray-700 text-sm leading-relaxed bg-pink-50 rounded-xl p-4 border border-pink-200">
                {resultado.fraseHipermenorreia}
              </p>
            </div>
          )}

          {resultado.comentarios.length > 0 && (
            <div>
              <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>💊 Medicamentos / Suplementos</h4>
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
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>🧪 Próximos Exames Sugeridos</h4>
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

          <button onClick={onCopiar}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all
              ${copiado ? 'bg-green-500 text-white' : `${scheme.badge} text-white hover:opacity-90`}`}>
            {copiado ? '✅ Resultado Copiado!' : '📋 Copiar Resultado para WhatsApp'}
          </button>

        </div>
      </div>
    </>
  );
}
