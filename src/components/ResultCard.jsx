import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

const obaLevelScheme = {
  grave:    { bg: 'bg-red-50',    border: 'border-red-400',    badge: 'bg-red-600',    text: 'text-red-800',    dot: 'bg-red-500'    },
  moderado: { bg: 'bg-orange-50', border: 'border-orange-400', badge: 'bg-orange-500', text: 'text-orange-800', dot: 'bg-orange-500' },
  leve:     { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-500', text: 'text-yellow-800', dot: 'bg-yellow-400' },
  normal:   { bg: 'bg-green-50',  border: 'border-green-300',  badge: 'bg-green-600',  text: 'text-green-800', dot: 'bg-green-500'  },
};

const obaLevelLabel = {
  grave:    '🔴 URGENTE',
  moderado: '🟠 ATENÇÃO',
  leve:     '🟡 MONITORAR',
  normal:   '🟢 NORMAL',
};

const WHATSAPP_MEDICO = '5571997110804';

function calcularFerroEV(hbAtual, sexo, gestante) {
  const pesoReferencia = 70;
  // Na gestacao a Hb alvo e 11.5 (hemodilucao fisiologica, OMS)
  const hbAlvo = sexo === 'M' ? 14.0 : (gestante ? 11.5 : 12.5);
  const deficit = Math.max(hbAlvo - hbAtual, 0);
  // FIX: se deficit = 0, dose = 0 (sem o +500 de reserva espuria)
  const doseTotal = deficit > 0
    ? Math.round((pesoReferencia * deficit * 2.4 + 500) / 100) * 100
    : 0;
  const sessoes = doseTotal > 0 ? Math.ceil(doseTotal / 200) : 0;
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

function ModalFerroEV({ onClose, hbAtual, sexo, gestante }) {
  const { doseTotal, sessoes, hbAlvo, deficit } = calcularFerroEV(hbAtual, sexo, gestante);
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
                <input type="number" value={peso} onChange={e => setPeso(e.target.value)} placeholder="Ex: 70"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <button onClick={handleCalcular} disabled={!peso || Number(peso) < 30}
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
                <p className="text-orange-700 font-medium">• Dosar ferritina + sat. transferrina antes da {resultado.penultima}ª sangria</p>
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


// ── Botões WhatsApp OBA (obstipação e fibromialgia) ───────────────────────────
function OBAWhatsAppButtons({ oba, pacienteNome, pacienteCelular }) {
  const [salvandoObs, setSalvandoObs] = useState(false)
  const [salvandoFib, setSalvandoFib] = useState(false)
  const [salvoObs, setSalvoObs] = useState(false)
  const [salvoFib, setSalvoFib] = useState(false)

  const WA_PLATAFORMA = '5571997110804'

  // Verificar obstipação via módulo intestinal
  const temObstipacao = !!modIntestData && modIntestData.linhas?.some(l => l.includes('OBSTIPAÇÃO'))

  // Verificar fibromialgia — trigger: diagnostico OU obstipacao + 2 sintomas
  const modFibroData = oba?.modulos?.find(m => m.id === 'fibromialgia')
  const temFibromialgia = !!modFibroData && (modFibroData.nivel === 'moderado' || modFibroData.nivel === 'grave' ||
    (modFibroData.nivel === 'leve' && modFibroData.linhas?.some(l => l.includes('SINTOMAS FIBROMIÁLGICOS'))))

  // Verificar obstipação no módulo intestinal
  const modIntestData = oba?.modulos?.find(m => m.id === 'intestinal')
  const temObstipacaoModulo = !!modIntestData && modIntestData.linhas?.some(l => l.includes('OBSTIPAÇÃO'))

  if (!temObstipacao && !temFibromialgia) return null

  async function registrar(tipo) {
    try {
      await supabase.from('leads_comerciais').insert({
        nome: pacienteNome || null,
        celular: pacienteCelular || null,
        tipo,
        status: 'pendente',
        created_at: new Date().toISOString(),
      })
    } catch(e) {}
  }

  function enviarObstipacao() {
    setSalvandoObs(true)
    registrar('obstipacao')
    const msg = `Olá! Desejo testar a solução de RedFairy para obstipação. Entendo que receberei uma amostra grátis (pagarei apenas o valor do SEDEX), e que se eu quiser continuar o uso, vocês me garantem a continuidade do fornecimento a custo muito baixo. Obrigado!`
    window.open(`https://wa.me/${WA_PLATAFORMA}?text=${encodeURIComponent(msg)}`, '_blank')
    setSalvandoObs(false)
    setSalvoObs(true)
  }

  function enviarFibromialgia() {
    setSalvandoFib(true)
    registrar('fibromialgia')
    const msg = `Olá! Desejo testar a solução de RedFairy para os sintomas da fibromialgia. Entendo que receberei uma amostra grátis (pagarei apenas o valor do SEDEX), e que se eu quiser continuar o uso, vocês me garantem a continuidade do fornecimento a custo muito baixo. Obrigado!`
    window.open(`https://wa.me/${WA_PLATAFORMA}?text=${encodeURIComponent(msg)}`, '_blank')
    setSalvandoFib(false)
    setSalvoFib(true)
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {temObstipacao && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-xs font-bold uppercase tracking-wide mb-2">💊 Solução para Obstipação</p>
          <p className="text-amber-700 text-xs mb-3 leading-relaxed">
            Identificamos obstipação crônica no seu perfil. Temos uma solução inovadora — amostras grátis disponíveis (você paga apenas o SEDEX).
          </p>
          {salvoObs ? (
            <p className="text-green-700 text-xs font-bold">✅ Mensagem enviada! Aguarde o contato da plataforma.</p>
          ) : (
            <button onClick={enviarObstipacao} disabled={salvandoObs}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              📲 Quero testar — Enviar mensagem
            </button>
          )}
        </div>
      )}
      {temFibromialgia && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-purple-800 text-xs font-bold uppercase tracking-wide mb-2">🌿 Solução para Fibromialgia</p>
          <p className="text-purple-700 text-xs mb-3 leading-relaxed">
            Identificamos sintomas fibromiálgicos no seu perfil. Temos uma solução inovadora — amostras grátis disponíveis (você paga apenas o SEDEX).
          </p>
          {salvoFib ? (
            <p className="text-green-700 text-xs font-bold">✅ Mensagem enviada! Aguarde o contato da plataforma.</p>
          ) : (
            <button onClick={enviarFibromialgia} disabled={salvandoFib}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              📲 Quero testar — Enviar mensagem
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Seção Achados Paralelos ───────────────────────────────────────────────────
function AchadosParalelosSection({ achados }) {
  const [expandido, setExpandido] = useState(null);
  if (!achados || achados.length === 0) return null;

  const schemeBy = {
    red:    { bg: 'bg-red-50',    border: 'border-red-400',    badge: 'bg-red-600',    text: 'text-red-800',    dot: 'bg-red-500',    label: '🔴 GRAVE'     },
    orange: { bg: 'bg-orange-50', border: 'border-orange-400', badge: 'bg-orange-500', text: 'text-orange-800', dot: 'bg-orange-500', label: '🟠 IMPORTANTE' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-500', text: 'text-yellow-800', dot: 'bg-yellow-400', label: '🟡 ATENÇÃO'   },
  };

  return (
    <div className="mt-6 rounded-2xl border-2 border-gray-300 bg-white shadow-lg overflow-hidden">
      <div className="bg-gray-700 text-white px-6 py-4">
        <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Achados Paralelos</p>
        <h3 className="text-xl font-bold">Outros Achados Relevantes</h3>
        <p className="text-gray-300 text-xs mt-1">
          {achados.length} achado{achados.length > 1 ? 's' : ''} detectado{achados.length > 1 ? 's' : ''} além do diagnóstico principal
        </p>
      </div>
      <div className="p-4 space-y-2">
        {achados.map((ach, i) => {
          const scheme = schemeBy[ach.color] || schemeBy.yellow;
          const aberto = expandido === i;
          return (
            <div key={ach.id} className={`rounded-xl border ${scheme.border} ${scheme.bg} overflow-hidden`}>
              <button
                onClick={() => setExpandido(aberto ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${scheme.dot}`} />
                  <span className={`font-semibold text-sm truncate ${scheme.text}`}>{ach.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap ${scheme.badge}`}>
                    {scheme.label}
                  </span>
                  <span className={`text-xl leading-none font-light ${scheme.text} transition-transform duration-200 ${aberto ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                </div>
              </button>
              {aberto && (
                <div className="px-4 pb-4 border-t border-white/60 pt-3">
                  <p className={`text-sm leading-relaxed ${scheme.text}`}>{ach.texto}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Seção OBA ─────────────────────────────────────────────────────────────────
function OBASection({ oba }) {
  const [expandido, setExpandido] = useState(null);

  const alertasGraves = oba.alertas?.filter(a => a.nivel === 'grave') || [];
  const alertasMod    = oba.alertas?.filter(a => a.nivel === 'moderado') || [];

  return (
    <div className="mt-6 rounded-2xl border-2 border-purple-300 bg-purple-50 shadow-lg overflow-hidden">
      <div className="bg-purple-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Extensão Bariátrica</p>
            <h3 className="text-xl font-bold">Avaliação OBA</h3>
            <p className="text-purple-200 text-xs mt-1">
              {oba.tipoCirurgia} · {oba.mesesPosCirurgia} meses pós-cirurgia
            </p>
          </div>
          <div className="text-right">
            <p className="text-purple-300 text-xs mb-1">Disabsorção</p>
            <div className="flex gap-1 justify-end">
              {[1,2,3].map(n => (
                <div key={n}
                  className={`w-4 h-4 rounded-sm ${n <= oba.grauDisabsorcao ? 'bg-white' : 'bg-purple-500'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {(alertasGraves.length > 0 || alertasMod.length > 0) && (
        <div className="px-4 pt-4 space-y-2">
          {alertasGraves.map((a, i) => (
            <div key={i} className="flex items-start gap-3 bg-red-100 border border-red-300 rounded-xl px-4 py-3">
              <span className="text-red-600 font-black text-lg leading-none mt-0.5">!</span>
              <p className="text-red-800 text-sm font-semibold leading-snug">{a.texto}</p>
            </div>
          ))}
          {alertasMod.map((a, i) => (
            <div key={i} className="flex items-start gap-3 bg-orange-100 border border-orange-300 rounded-xl px-4 py-3">
              <span className="text-orange-600 font-bold text-sm leading-none mt-0.5">▲</span>
              <p className="text-orange-800 text-sm font-medium leading-snug">{a.texto}</p>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 space-y-2">
        {oba.modulos.map((mod, i) => {
          const scheme = obaLevelScheme[mod.nivel] || obaLevelScheme.normal;
          const aberto = expandido === i;
          return (
            <div key={i} className={`rounded-xl border ${scheme.border} ${scheme.bg} overflow-hidden`}>
              <button
                onClick={() => setExpandido(aberto ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${scheme.dot}`} />
                  <span className={`font-semibold text-sm truncate ${scheme.text}`}>{mod.titulo}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap ${scheme.badge}`}>
                    {obaLevelLabel[mod.nivel] || mod.nivel}
                  </span>
                  <span className={`text-xl leading-none font-light ${scheme.text} transition-transform duration-200 ${aberto ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                </div>
              </button>
              {aberto && (
                <div className="px-4 pb-4 space-y-2 border-t border-white/60 pt-3">
                  {mod.linhas.map((linha, j) => (
                    <p key={j} className={`text-sm leading-relaxed ${scheme.text}`}>
                      {linha}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <OBAWhatsAppButtons oba={oba} pacienteNome={oba._pacienteNome} pacienteCelular={oba._pacienteCelular} />

      {oba.examesComplementares?.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl border border-purple-200 p-4">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-3">
              🧪 Exames Complementares OBA
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {oba.examesComplementares.map((ex, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>
                  <span>{ex}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Painel do Médico (substitui DocumentoMedicoPanel no modo médico) ──────────
function PainelMedico({ resultado, medicoNome, medicoCRM, medicoDados }) {
  const [querReceber, setQuerReceber] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const isSaudavel = resultado.color === 'green'
  const sexo = resultado._inputs?.sexo || 'M'
  const pronome = sexo === 'F' ? 'a sua' : 'o seu'

  async function salvarPreferencia() {
    if (!medicoCRM) return
    setSalvando(true)
    const cpf = resultado._inputs?.cpf?.replace(/\D/g, '') || null
    await supabase.from('avaliacoes')
      .update({ medico_quer_receber: true })
      .eq('medico_crm', medicoCRM)
      .order('created_at', { ascending: false })
      .limit(1)
      .catch(() => {})
    setSalvando(false)
    setSalvo(true)
  }

  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden shadow-sm">
      <div className="bg-blue-700 px-4 py-3">
        <p className="text-white font-bold text-sm">🩺 Orientação ao Médico</p>
      </div>
      <div className="p-4 space-y-4">

        {/* Mensagem principal conforme resultado */}
        {isSaudavel ? (
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              Doutor, oriente {pronome} paciente a se cadastrar no RedFairy para futuras avaliações e acompanhamento.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-orange-200 p-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              Doutor: esse paciente precisa de reavaliação e prescrição médica. Quando ele se cadastrar na plataforma o sistema irá sinalizar, e ele terá a sua avaliação revisada por HEMATOLOGISTA, que emitirá os documentos. Você receberá um WhatsApp com essas informações.
            </p>
          </div>
        )}

        {/* Checkbox: quero receber futuras avaliações */}
        <div className="bg-white rounded-xl border border-blue-100 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={querReceber}
              onChange={e => {
                setQuerReceber(e.target.checked)
                if (e.target.checked) salvarPreferencia()
              }}
              className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0"
            />
            <div>
              <p className="font-bold text-sm text-gray-700">Quero receber as avaliações futuras deste paciente</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Se marcar, você receberá o resultado das novas avaliações por WhatsApp.
              </p>
            </div>
          </label>
          {salvo && (
            <p className="text-green-600 text-xs font-semibold mt-2 ml-7">✅ Preferência salva!</p>
          )}
        </div>

        {/* Info KlipBit */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-3">
          <span className="text-green-600 text-lg flex-shrink-0">💰</span>
          <p className="text-green-800 text-xs leading-relaxed">
            Quando este paciente se cadastrar no RedFairy, você receberá uma notificação por WhatsApp e um crédito de <strong>10 dólares digitais</strong> na sua carteira KlipBit.
          </p>
        </div>

      </div>
    </div>
  )
}

// ── Painel do Paciente (modo paciente — com documentos) ───────────────────────
function DocumentoMedicoPanel({ resultado }) {
  const [valorDoc, setValorDoc] = useState(null);
  const [pixChave, setPixChave] = useState('');
  const [etapa, setEtapa] = useState('oferta');
  const [dadosPaciente, setDadosPaciente] = useState({ nome: '', dataNasc: '', celular: '', cpf: '' });
  const [tiposDoc, setTiposDoc] = useState({ exames: false, prescricao: false });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const temExames = resultado.proximosExames && resultado.proximosExames.length > 0;
  const temPrescricao = resultado.recomendacao && (
    resultado.recomendacao.includes('FERRO') ||
    resultado.recomendacao.includes('VITAMINA') ||
    resultado.recomendacao.includes('ÁCIDO FÓLICO') ||
    resultado.recomendacao.includes('SUPLEMENTA') ||
    resultado.recomendacao.includes('PRESCRI') ||
    (resultado._oba && resultado._oba.alertas && resultado._oba.alertas.length > 0)
  );

  useEffect(() => {
    async function carregarTudo() {
      const { data: docConf } = await supabase.from('config').select('valor').eq('chave', 'valor_documento_medico').single();
      const { data: pixConf } = await supabase.from('config').select('valor').eq('chave', 'pix_chave').single();
      if (docConf?.valor) setValorDoc(parseFloat(docConf.valor));
      if (pixConf?.valor) setPixChave(pixConf.valor);

      const cpfInput = resultado?._inputs?.cpf?.replace(/\D/g, '');
      if (cpfInput) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome, data_nascimento, celular, cpf')
          .eq('cpf', cpfInput)
          .single();
        if (profile) {
          setDadosPaciente({
            nome:      profile.nome || '',
            dataNasc:  profile.data_nascimento || '',
            celular:   profile.celular || '',
            cpf:       profile.cpf || cpfInput,
          });
        } else {
          setDadosPaciente(p => ({ ...p, cpf: cpfInput }));
        }
      }
    }
    carregarTudo();
  }, []);

  function montarTextoExames() {
    if (!resultado.proximosExames?.length) return '';
    return 'PEDIDO DE EXAMES:\n' + resultado.proximosExames.map(e => `- ${e}`).join('\n');
  }

  function montarTextoPrescricao() {
    const linhas = [];
    if (resultado.recomendacao) {
      const frases = resultado.recomendacao.split('\n').filter(l =>
        l.includes('FERRO') || l.includes('VITAMINA') || l.includes('ÁCIDO FÓLICO') ||
        l.includes('SUPLEMENTA') || l.includes('REPOSIÇÃO')
      );
      linhas.push(...frases);
    }
    if (resultado._oba?.modulos) {
      resultado._oba.modulos.forEach(mod => {
        mod.linhas?.forEach(l => {
          if (l.includes('mg') || l.includes('µg') || l.includes('UI') || l.includes('COMPRIMIDO') || l.includes('SUBLINGUAL') || l.includes('INJETÁVEL') || l.includes('ENDOVENOSO')) {
            linhas.push(l);
          }
        });
      });
    }
    if (!linhas.length) return '';
    return 'PRESCRIÇÃO MÉDICA:\n' + linhas.join('\n');
  }

  async function enviarWhatsApp() {
    if (!dadosPaciente.nome.trim()) { setErro('Informe seu nome completo.'); return; }
    if (!dadosPaciente.dataNasc.trim()) { setErro('Informe sua data de nascimento.'); return; }
    if (!dadosPaciente.celular.trim()) { setErro('Informe seu celular com DDD.'); return; }
    if (!tiposDoc.exames && !tiposDoc.prescricao) { setErro('Selecione pelo menos um documento.'); return; }

    setEnviando(true); setErro('');

    const documentos = [];
    if (tiposDoc.exames && temExames) documentos.push(montarTextoExames());
    if (tiposDoc.prescricao && temPrescricao) documentos.push(montarTextoPrescricao());

    const total = (valorDoc || 0) * documentos.length;
    const msgs = [
      'ATENÇÃO | RedFairy!',
      `CPF: ${dadosPaciente.cpf || 'Não informado'}`,
      `PACIENTE: ${dadosPaciente.nome.trim().toUpperCase()}`,
      `NASCIMENTO: ${dadosPaciente.dataNasc}`,
      `CELULAR: ${dadosPaciente.celular}`,
      ...documentos,
    ];

    const textoCompleto = msgs.join('\n---\n');

    await supabase.from('pedidos_documento').insert({
      cpf: dadosPaciente.cpf || null,
      nome: dadosPaciente.nome.trim(),
      data_nascimento: dadosPaciente.dataNasc,
      celular: dadosPaciente.celular,
      tipos_documento: documentos.map((_, i) => tiposDoc.exames && i === 0 ? 'exames' : 'prescricao'),
      texto_documentos: textoCompleto,
      valor_total: total,
      status: 'aguardando_pagamento',
      created_at: new Date().toISOString(),
    }).catch(() => {});

    const urlWA = `https://wa.me/${WHATSAPP_MEDICO}?text=${encodeURIComponent(msgs.join('%0A---%0A'))}`;
    window.open(urlWA, '_blank');

    setEnviando(false);
    setEtapa('pix');
  }

  async function confirmarPagamento() {
    const msgPago = `${dadosPaciente.nome.trim().toUpperCase()} — PAGO. Emita o(s) documento(s).`;
    const urlPago = `https://wa.me/${WHATSAPP_MEDICO}?text=${encodeURIComponent(msgPago)}`;
    window.open(urlPago, '_blank');

    await supabase.from('pedidos_documento')
      .update({ status: 'pago', pago_em: new Date().toISOString() })
      .eq('celular', dadosPaciente.celular)
      .order('created_at', { ascending: false })
      .limit(1)
      .catch(() => {});

    setEtapa('concluido');
  }

  if (!temExames && !temPrescricao) return null;
  if (valorDoc === null) return null;

  const inputStyle = { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  if (etapa === 'concluido') return (
    <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-5 text-center space-y-2">
      <p className="text-2xl">✅</p>
      <p className="font-bold text-green-800">Pedido enviado com sucesso!</p>
      <p className="text-sm text-green-700">O médico do Projeto RedFairy receberá seus documentos em breve via WhatsApp.</p>
    </div>
  );

  if (etapa === 'pix') return (
    <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-red-700 px-4 py-3">
        <p className="text-white font-bold text-sm">💳 Efetue o pagamento via Pix</p>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-gray-600 text-sm">Valor: <strong className="text-red-700 text-lg">R$ {((valorDoc || 0) * ([tiposDoc.exames, tiposDoc.prescricao].filter(Boolean).length || 1)).toFixed(2)}</strong></p>
        {pixChave && (
          <>
            <div className="flex justify-center">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixChave)}`}
                alt="QR Code Pix" className="rounded-xl border border-gray-200" width={180} height={180} />
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Chave Pix (Copia e Cola):</p>
              <p className="text-xs font-mono text-gray-700 break-all select-all">{pixChave}</p>
            </div>
          </>
        )}
        <p className="text-xs text-gray-500 text-center">Após o pagamento, clique no botão abaixo para confirmar.</p>
        <button onClick={confirmarPagamento}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
          ✅ Já paguei — Confirmar pagamento
        </button>
        <button onClick={() => setEtapa('oferta')}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs py-2 rounded-xl transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );

  if (etapa === 'dados') return (
    <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-red-700 px-4 py-3">
        <p className="text-white font-bold text-sm">📋 Seus dados para o documento</p>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Nome completo</label>
          <input style={inputStyle} type="text" placeholder="Como no RG" value={dadosPaciente.nome} onChange={e => setDadosPaciente(p => ({ ...p, nome: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Data de nascimento</label>
          <input style={inputStyle} type="date" value={dadosPaciente.dataNasc} onChange={e => setDadosPaciente(p => ({ ...p, dataNasc: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Celular com DDD</label>
          <input style={inputStyle} type="tel" placeholder="(00) 00000-0000" value={dadosPaciente.celular} onChange={e => setDadosPaciente(p => ({ ...p, celular: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">CPF (opcional)</label>
          <input style={inputStyle} type="text" placeholder="000.000.000-00" value={dadosPaciente.cpf} onChange={e => setDadosPaciente(p => ({ ...p, cpf: e.target.value }))} />
        </div>
        {erro && <p className="text-red-500 text-xs">{erro}</p>}
        <button onClick={enviarWhatsApp} disabled={enviando}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
          {enviando ? 'Enviando...' : '📲 Enviar pedido via WhatsApp →'}
        </button>
        <button onClick={() => setEtapa('oferta')}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs py-2 rounded-xl transition-colors">
          Voltar
        </button>
      </div>
    </div>
  );

  return (
    <div className="mt-4 bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-red-700 px-4 py-3 flex items-center gap-2">
        <span className="text-xl">📄</span>
        <div>
          <p className="text-white font-bold text-sm">Quer que um médico emita os documentos?</p>
          <p className="text-red-200 text-xs">Pedido de exames e/ou prescrição via WhatsApp</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-gray-600 text-sm">Um médico do Projeto RedFairy gera e envia por WhatsApp:</p>
        <div className="space-y-2">
          {temExames && (
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
              style={{ borderColor: tiposDoc.exames ? '#DC2626' : '#E5E7EB', background: tiposDoc.exames ? '#FEF2F2' : 'white' }}>
              <input type="checkbox" checked={tiposDoc.exames} onChange={e => setTiposDoc(p => ({ ...p, exames: e.target.checked }))}
                className="w-4 h-4 cursor-pointer" />
              <div>
                <p className="font-bold text-sm text-gray-700">📋 Pedido de Exames</p>
                <p className="text-xs text-gray-500">{resultado.proximosExames?.length} exame(s) sugeridos</p>
              </div>
              <span className="ml-auto font-bold text-red-700">R$ {valorDoc?.toFixed(2)}</span>
            </label>
          )}
          {temPrescricao && (
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
              style={{ borderColor: tiposDoc.prescricao ? '#DC2626' : '#E5E7EB', background: tiposDoc.prescricao ? '#FEF2F2' : 'white' }}>
              <input type="checkbox" checked={tiposDoc.prescricao} onChange={e => setTiposDoc(p => ({ ...p, prescricao: e.target.checked }))}
                className="w-4 h-4 cursor-pointer" />
              <div>
                <p className="font-bold text-sm text-gray-700">💊 Prescrição Médica</p>
                <p className="text-xs text-gray-500">Suplementos e medicamentos indicados</p>
              </div>
              <span className="ml-auto font-bold text-red-700">R$ {valorDoc?.toFixed(2)}</span>
            </label>
          )}
        </div>
        {(tiposDoc.exames || tiposDoc.prescricao) && (
          <p className="text-center font-bold text-red-700">
            Total: R$ {((valorDoc || 0) * [tiposDoc.exames, tiposDoc.prescricao].filter(Boolean).length).toFixed(2)}
          </p>
        )}
        <button
          onClick={() => { if (!tiposDoc.exames && !tiposDoc.prescricao) { setErro('Selecione pelo menos um documento.'); return; } setErro(''); setEtapa('dados'); }}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors text-sm">
          Quero receber os documentos →
        </button>
        {erro && <p className="text-red-500 text-xs text-center">{erro}</p>}
        <p className="text-xs text-gray-400 text-center">Pagamento via Pix · Documento entregue em até 24h</p>
      </div>
    </div>
  );
}

// ── ResultCard principal ──────────────────────────────────────────────────────
export default function ResultCard({ resultado, onCopiar, copiado, modoPaciente = false, medicoNome, medicoCRM, medicoDados }) {
  const [showFerroEV, setShowFerroEV] = useState(false);
  const [showSangria, setShowSangria] = useState(false);

  if (!resultado.encontrado) {
    return (
      <div className="bg-white border-2 border-amber-300 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-amber-50 px-6 py-5 flex items-start gap-4">
          <span style={{ fontSize: '28px', lineHeight: 1 }}>🔍</span>
          <div>
            <p className="font-semibold text-amber-800 text-base">Combinação não reconhecida pelo algoritmo</p>
            <p className="text-amber-700 text-sm mt-1 leading-relaxed">
              Os valores informados não correspondem a nenhum padrão catalogado.
              Isso pode indicar um resultado laboratorial atípico, um erro de digitação,
              ou uma combinação que ainda não está mapeada no RedFairy.
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

  // FIX: guards contra disparo espurio em paciente verde ou sem deficit real de Hb
  // Consideramos gestante (Hb alvo gestacional = 11.5 g/dL por hemodilucao fisiologica)
  const _hbAtualFerroEV = Number(resultado._inputs?.hemoglobina ?? 0);
  const _sexoFerroEV = resultado._inputs?.sexo || 'M';
  const _gestanteFerroEV = Boolean(resultado._inputs?.gestante);
  const _hbAlvoFerroEV = _sexoFerroEV === 'M' ? 14.0 : (_gestanteFerroEV ? 11.5 : 12.5);
  const _deficitHbFerroEV = Math.max(_hbAlvoFerroEV - _hbAtualFerroEV, 0);
  const _bloqueioVerde = resultado.color === 'green';

  const precisaFerroEV =
    !_bloqueioVerde && _deficitHbFerroEV > 0 && (
      resultado.diagnostico?.toUpperCase().includes('ENDOVENOSA') ||
      resultado.diagnostico?.toUpperCase().includes('INTRAVENOSA') ||
      resultado.diagnostico?.toUpperCase().includes('FERRO ENDOVENOSO') ||
      resultado.recomendacao?.toUpperCase().includes('ENDOVENOSA') ||
      resultado.recomendacao?.toUpperCase().includes('INTRAVENOSA') ||
      resultado.recomendacao?.toUpperCase().includes('FERRO ENDOVENOSO')
    );

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
  const hbAtual   = resultado._inputs?.hemoglobina || 0;
  const sexo      = resultado._inputs?.sexo || 'M';
  const ferritina = resultado._inputs?.ferritina || 0;
  const satTransf = resultado._inputs?.satTransf || 0;
  const oba       = resultado._oba || null;

  return (
    <>
      {showFerroEV && <ModalFerroEV onClose={() => setShowFerroEV(false)} hbAtual={hbAtual} sexo={sexo} gestante={resultado._inputs?.gestante} />}
      {showSangria && (
        <ModalSangria
          onClose={() => setShowSangria(false)}
          ferritina={ferritina} satTransf={satTransf}
          sexo={sexo} hbAtual={hbAtual} isPolicitemiaVera={isPolicitemiaVera}
        />
      )}

      {/* ── SEÇÃO 1: ERITRON ─────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border-2 ${scheme.border} ${scheme.bg} shadow-lg overflow-hidden`}>

        <div className={`${scheme.badge} text-white px-6 py-4 flex items-center justify-between`}>
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Diagnóstico</p>
            <h3 className="text-xl font-bold">{resultado.label}</h3>
            {/* Subtexto de parametros (facilita testes via screenshot) */}
            {resultado._inputs && (() => {
              const inp = resultado._inputs
              const labs = []
              if (inp.hemoglobina !== undefined && inp.hemoglobina !== '') labs.push(`Hb ${inp.hemoglobina}`)
              if (inp.ferritina   !== undefined && inp.ferritina   !== '') labs.push(`Ferr ${inp.ferritina}`)
              if (inp.vcm         !== undefined && inp.vcm         !== '') labs.push(`VCM ${inp.vcm}`)
              if (inp.rdw         !== undefined && inp.rdw         !== '') labs.push(`RDW ${inp.rdw}`)
              if (inp.satTransf   !== undefined && inp.satTransf   !== '') labs.push(`Sat ${inp.satTransf}`)
              const cabecalho = `${inp.sexo || '?'} ${inp.idade ? inp.idade + 'a' : ''}`.trim()
              const flagsAtivas = []
              const FLAGS_MAP = {
                bariatrica: 'bariátrica', vegetariano: 'vegetariana', perda: 'perda',
                hipermenorreia: 'hipermenorreia', gestante: 'gestante', alcoolista: 'alcoolista',
                transfundido: 'transfundido', aspirina: 'aspirina', vitaminaB12: 'B12',
                ferroOral: 'ferro oral', tiroxina: 'tiroxina', hidroxiureia: 'hidroxiureia',
                anticonvulsivante: 'anticonvulsivante', testosterona: 'testosterona',
                metformina: 'metformina', ibp: 'IBP', methotrexato: 'metotrexato',
                hivTratamento: 'HIV', anemiaPrevia: 'anemia prévia', sideropenia: 'sideropenia',
                sobrecargaFerro: 'sobrecarga ferro', hbAlta: 'Hb alta prévia', celiaco: 'celíaco',
                g6pd: 'G6PD', endometriose: 'endometriose', doadorSangue: 'doador sangue'
              }
              for (const k of Object.keys(FLAGS_MAP)) {
                if (inp[k] === true) flagsAtivas.push(FLAGS_MAP[k])
              }
              return (
                <div className="text-xs opacity-75 mt-1 leading-snug">
                  <div>{cabecalho} · {labs.join(' · ')}</div>
                  <div>Flags: {flagsAtivas.length > 0 ? flagsAtivas.join(', ') : 'nenhuma'}</div>
                </div>
              )
            })()}
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

          {resultado.g6pdAlerta && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-2 text-purple-700">⚠️ G-6-PD</h4>
              <p className="text-gray-700 text-sm leading-relaxed bg-purple-50 rounded-xl p-4 border border-purple-200">
                {resultado.g6pdAlerta}
              </p>
            </div>
          )}

          {resultado.g6pdAlerta && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-2 text-purple-700">⚠️ G-6-PD</h4>
              <p className="text-gray-700 text-sm leading-relaxed bg-purple-50 rounded-xl p-4 border border-purple-200">
                {resultado.g6pdAlerta}
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

        </div>
      </div>

      {/* ── SEÇÃO 1.5: ACHADOS PARALELOS ─────────────────────────────────────── */}
      <AchadosParalelosSection achados={resultado.achadosParalelos} />

      {/* ── SEÇÃO 2: OBA ─────────────────────────────────────────────────────── */}
      {oba && <OBASection oba={oba} />}

      {/* ── SEÇÃO 3: Painel conforme modo ────────────────────────────────────── */}
      {!modoPaciente ? (
        // MODO MÉDICO — orientações + checkbox
        <PainelMedico
          resultado={resultado}
          medicoNome={medicoNome}
          medicoCRM={medicoCRM}
          medicoDados={medicoDados}
        />
      ) : (
        // MODO PACIENTE — oferta de documentos
        <DocumentoMedicoPanel resultado={resultado} />
      )}

      {/* ── BOTÃO FINAL: COPIAR RESULTADO COMPLETO PARA WHATSAPP ─────────────── */}
      <button onClick={onCopiar}
        className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all
          ${copiado ? 'bg-green-500 text-white' : `${scheme.badge} text-white hover:opacity-90`}`}>
        {copiado ? '✅ Resultado Copiado!' : '📋 Copiar Resultado Completo para WhatsApp'}
      </button>
    </>
  );
}
