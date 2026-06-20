import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import HistoricoChartModal from './HistoricoChartModal';
import { calcularDeficitFerroGanzoni, calcReceita } from '../engine/ferroProtocol';

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
  grave:    "\ud83d\udd34 URGENTE",
  moderado: "\ud83d\udfe0 ATEN\u00c7\u00c3O",
  leve:     "\ud83d\udfe1 MONITORAR",
  normal:   "\ud83d\udfe2 NORMAL",
};

const WHATSAPP_MEDICO = '5571997110804';

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

const CLASSES_RECEITA = [
  { id: 'alta_dose',       rotulo: 'Alta dose',       custo: 'Custo mais alto | Menor número de infusões',  acesso: 'plano de saúde · centro de infusão · compra' },
  { id: 'dose_fracionada', rotulo: 'Dose fracionada', custo: 'Custo mais baixo | Maior número de infusões', acesso: 'sacarato · disponível no SUS' },
];

function ModalFerroEV({ onClose, hbAtual, sexo, gestante, pesoInicial }) {
  const [meds, setMeds] = useState(null); // null = carregando; [] = sem catálogo
  useEffect(() => {
    let alive = true;
    supabase.from('medicamentos').select('*').eq('ativo', true)
      .then(({ data }) => { if (alive) setMeds(data || []); })
      .catch(() => { if (alive) setMeds([]); });
    return () => { alive = false; };
  }, []);
  const pesoIni = (pesoInicial !== undefined && pesoInicial !== null && String(pesoInicial).trim() !== '') ? String(pesoInicial) : '';
  const [peso, setPeso] = useState(pesoIni);
  const pesoNum = Number(peso);
  const pesoValido = Number.isFinite(pesoNum) && pesoNum >= 30 && pesoNum <= 250;
  const calc = pesoValido ? calcularDeficitFerroGanzoni({ sexo, peso: pesoNum, hb: hbAtual, gestante }) : null;
  const doseTotal = calc ? calc.deficitMg : 0;
  const hbAlvo = calc ? calc.hbAlvo : (sexo === 'M' ? 13.5 : (gestante ? 11.5 : 12.0));
  const deficit = Math.max(hbAlvo - Number(hbAtual), 0).toFixed(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-y-auto"
        style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="bg-red-700 text-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-bold">{"\ud83d\udc89 Reposi\u00e7\u00e3o de Ferro Endovenoso"}</h2>
          <p className="text-red-200 text-xs mt-1">{"Estimativa baseada na F\u00f3rmula de Ganzoni"}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{"C\u00e1lculo da Dose Total"}</p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{"F\u00f3rmula de Ganzoni:"}</span><br/>
              {"Dose (mg) = Peso \u00d7 (Hb alvo \u2212 Hb atual) \u00d7 2,4 + 500"}
            </p>
            <div className="border-t border-red-200 pt-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{"Peso do paciente (kg)"}</label>
              <input type="number" value={peso} onChange={e => setPeso(e.target.value)} placeholder="Ex: 72"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              {peso !== '' && !pesoValido && <p className="text-red-500 text-xs mt-1">{"Peso deve estar entre 30 e 250 kg."}</p>}
            </div>
            {pesoValido ? (
              <>
                <div className="border-t border-red-200 pt-2 text-sm text-gray-700 space-y-1">
                  <p>{"\u2022 Peso: "}<strong>{pesoNum} kg</strong></p>
                  <p>{"\u2022 Hb atual: "}<strong>{hbAtual} g/dL</strong></p>
                  <p>{"\u2022 Hb alvo: "}<strong>{hbAlvo} g/dL</strong></p>
                  <p>{"\u2022 D\u00e9ficit: "}<strong>{deficit} g/dL</strong></p>
                </div>
                <div className="bg-red-700 text-white rounded-lg px-4 py-2 text-center mt-2">
                  <p className="text-xs opacity-80">Dose Total Estimada</p>
                  <p className="text-2xl font-black">{doseTotal} mg</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 pt-1">{"Informe o peso do paciente para calcular a dose."}</p>
            )}
          </div>
          {pesoValido && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">{"Receitas sugeridas"}</p>
            <p className="text-xs font-bold text-gray-700" style={{ marginTop: '-4px' }}>{"A plataforma sugere duas receitas, mas NUNCA USE as duas: Uma exclui a outra. O excesso de ferro \u00e9 nocivo."}</p>
            {meds === null ? (
              <p className="text-sm text-gray-400">{"Carregando medicamentos..."}</p>
            ) : CLASSES_RECEITA.map(cl => {
              const med = meds.find(m => m.classe === cl.id);
              if (!med) return (
                <div key={cl.id} className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
                  <p className="font-semibold text-gray-700">{cl.rotulo}</p>
                  <p className="text-xs mt-1">{"Nenhuma marca configurada nesta classe (defina no painel admin \u2192 \ud83d\udc8a Medicamentos)."}</p>
                </div>
              );
              const r = calcReceita(doseTotal, med);
              return (
                <div key={cl.id} className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-1">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{cl.rotulo}</p>
                  {cl.custo && <p className="text-xs font-semibold text-gray-600">{cl.custo}</p>}
                  <p className="text-xs text-gray-400">{cl.acesso}</p>
                  <p className="font-semibold text-gray-800 pt-1">{med.nome_comercial}
                    <span className="font-normal text-gray-500 text-xs">{" \u00b7 "}{med.principio_ativo}</span></p>
                  {med.fabricante && <p className="text-xs text-gray-400">{"Fabricante: "}{med.fabricante}</p>}
                  <p>{"\u2022 Dose total: "}<strong>{doseTotal} mg</strong></p>
                  <p>{"\u2022 Frascos: "}<strong>{r.frascos}{" de "}{r.frasco} mg</strong></p>
                  <p>{"\u2022 Sess\u00f5es: "}<strong>{r.sessoes}{" de at\u00e9 "}{r.maxSessao} mg</strong></p>
                  {med.diluicao && <p>{"\u2022 Diluir em "}<strong>{med.diluicao}</strong>{med.tempo_infusao ? <>{", infundir em "}<strong>{med.tempo_infusao}</strong></> : null}</p>}
                  {med.intervalo_sessoes && med.intervalo_sessoes !== '\u2014' && <p>{"\u2022 Intervalo entre sess\u00f5es: "}<strong>{med.intervalo_sessoes}</strong></p>}
                  {med.observacoes && <p className="text-xs text-gray-500 italic pt-1">{med.observacoes}</p>}
                </div>
              );
            })}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
              <p className="font-semibold">{"\u2600\ufe0f Vitamina D \u2014 Importante!"}</p>
              <p>{"A "}<strong>{"hipofosfatemia p\u00f3s-reposi\u00e7\u00e3o de ferro"}</strong>{" \u00e9 um risco real, especialmente em pacientes com defici\u00eancia de vitamina D."}</p>
              <p>{"Idealmente, administre "}<strong>10.000 UI de vitamina D</strong>{" no dia anterior \u00e0 primeira dose de ferro endovenoso."}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 space-y-2">
              <p className="font-semibold">{"\u26a0\ufe0f Precau\u00e7\u00f5es:"}</p>
              <p>{"\u2022 Ter dispon\u00edvel adrenalina e anti-histam\u00ednico"}</p>
              <p>{"\u2022 Observar o paciente por "}<strong>30 min</strong>{" ap\u00f3s a infus\u00e3o"}</p>
              <p>{"\u2022 Suspender imediatamente se sinais de rea\u00e7\u00e3o al\u00e9rgica"}</p>
              <p>{"\u2022 N\u00e3o infundir com outros medicamentos na mesma via"}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 space-y-2">
              <p className="font-semibold">{"\u2705 Monitoramento:"}</p>
              <p>{"\u2022 Repetir hemograma ap\u00f3s "}<strong>4 semanas</strong></p>
              <p>{"\u2022 Repetir ferritina e satura\u00e7\u00e3o ap\u00f3s "}<strong>8 semanas</strong></p>
              <p>{"\u2022 Esperar eleva\u00e7\u00e3o de Hb de "}<strong>{"1\u20132 g/dL"}</strong>{" por sess\u00e3o de 200 mg"}</p>
            </div>
          </div>
          )}
          {pesoValido && (
          <p className="text-xs text-gray-400 text-center">
            {"* Dose final deve ser ajustada pelo m\u00e9dico assistente conforme resposta cl\u00ednica."}
          </p>
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
          <h2 className="text-lg font-bold">{"\ud83e\ude78 Sangria Terap\u00eautica"}</h2>
          <p className="text-red-200 text-xs mt-1">Protocolo individualizado</p>
        </div>
        <div className="p-6 space-y-4">
          {!hbSegura && (
            <div className="bg-red-50 border border-red-400 rounded-xl p-4 text-sm text-red-800">
              <p className="font-bold">{"\u26d4 Aten\u00e7\u00e3o!"}</p>
              <p>{"A Hb atual ("}{hbAtual}{" g/dL) est\u00e1 abaixo do m\u00ednimo seguro ("}{hbMin}{" g/dL). "}<strong>{"N\u00e3o realizar sangria"}</strong>{" at\u00e9 normaliza\u00e7\u00e3o da Hb."}</p>
            </div>
          )}
          {isPolicitemiaVera && (
            <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 text-sm text-orange-800">
              <p className="font-bold">{"\u26a0\ufe0f Policitemia Vera"}</p>
              <p>{"Na policitemia vera as sangrias s\u00e3o indicadas mesmo na aus\u00eancia de siderose. O objetivo \u00e9 manter o hemat\u00f3crito abaixo de 45%."}</p>
            </div>
          )}
          {!calculado && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">{"Informe o peso do paciente para calcular o volume por sess\u00e3o:"}</p>
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
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{"Volume por Sess\u00e3o"}</p>
                <div className="bg-red-700 text-white rounded-lg px-4 py-2 text-center">
                  <p className="text-xs opacity-80">Para {peso} kg</p>
                  <p className="text-3xl font-black">{resultado.volume} mL</p>
                  <p className="text-xs opacity-80">{"por sess\u00e3o"}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
                <p className="font-semibold text-gray-800">Planejamento</p>
                <p>{"\u2022 Intervalo recomendado: "}<strong>{resultado.intervalo} dias</strong></p>
                <p>{"\u2022 Ferritina atual: "}<strong>{ferritina} ng/mL</strong></p>
                <p>{"\u2022 Ferritina alvo: "}<strong>{resultado.ferritinAlvo} ng/mL</strong></p>
                <p>{"\u2022 Sangrias estimadas at\u00e9 o alvo: "}<strong>{"~"}{resultado.sangriaEstimadas}{" sess\u00e3o(\u00f5es)"}</strong></p>
                <p className="text-orange-700 font-medium">{"\u2022 Dosar ferritina + sat. transferrina antes da "}{resultado.penultima}{"\u00aa sangria"}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 space-y-2">
                <p className="font-semibold">{"\u26a0\ufe0f Seguran\u00e7a:"}</p>
                <p>{"\u2022 Suspender se Hb cair abaixo de "}<strong>{resultado.hbMin} g/dL</strong></p>
                <p>{"\u2022 Verificar Hb e press\u00e3o arterial antes de cada sess\u00e3o"}</p>
                <p>{"\u2022 "}<strong>{"N\u00e3o realizar"}</strong>{" se press\u00e3o arterial sist\u00f3lica > "}<strong>160 mmHg</strong></p>
                <p>{"\u2022 O paciente deve consumir "}<strong>{isotonico}</strong>{" de bebida isot\u00f4nica (Gatorade, Powerade ou similar) "}<strong>30 minutos antes</strong>{" do procedimento"}</p>
                <p>{"\u2022 Observar por "}<strong>{"15\u201330 min"}</strong>{" ap\u00f3s o procedimento"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
                <p className="font-semibold text-gray-800">{"T\u00e9cnica:"}</p>
                <p>{"\u2022 Acesso venoso perif\u00e9rico calibroso"}</p>
                <p>{"\u2022 Bolsa de coleta padr\u00e3o de hemocomponente"}</p>
                <p>{"\u2022 Dura\u00e7\u00e3o: "}<strong>{"20\u201340 minutos"}</strong></p>
                <p>{"\u2022 Pode ser feita em cl\u00ednica de hematologia ou banco de sangue"}</p>
              </div>
              <button onClick={() => { setCalculado(false); setPeso(''); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-2 rounded-xl transition-colors">
                {"\u2190 Recalcular com outro peso"}
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


function OBAWhatsAppButtons({ oba, pacienteNome, pacienteCelular }) {
  const [salvandoObs, setSalvandoObs] = useState(false)
  const [salvandoFib, setSalvandoFib] = useState(false)
  const [salvoObs, setSalvoObs] = useState(false)
  const [salvoFib, setSalvoFib] = useState(false)

  const WA_PLATAFORMA = '5571997110804'

  const modFibroData = oba?.modulos?.find(m => m.id === 'fibromialgia')
  const temFibromialgia = !!modFibroData && (modFibroData.nivel === 'moderado' || modFibroData.nivel === 'grave' ||
    (modFibroData.nivel === 'leve' && modFibroData.linhas?.some(l => l.includes("SINTOMAS FIBROMI\u00c1LGICOS"))))

  const modIntestData = oba?.modulos?.find(m => m.id === 'intestinal')
  const temObstipacaoModulo = !!modIntestData && modIntestData.linhas?.some(l => l.includes("OBSTIPA\u00c7\u00c3O"))

  if (!temObstipacaoModulo && !temFibromialgia) return null

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
    const msg = "Ol\u00e1! Desejo testar a solu\u00e7\u00e3o de RedFairy para obstipa\u00e7\u00e3o. Entendo que receberei uma amostra gr\u00e1tis (pagarei apenas o valor do SEDEX), e que se eu quiser continuar o uso, voc\u00eas me garantem a continuidade do fornecimento a custo muito baixo. Obrigado!"
    window.open(`https://wa.me/${WA_PLATAFORMA}?text=${encodeURIComponent(msg)}`, '_blank')
    setSalvandoObs(false)
    setSalvoObs(true)
  }

  function enviarFibromialgia() {
    setSalvandoFib(true)
    registrar('fibromialgia')
    const msg = "Ol\u00e1! Desejo testar a solu\u00e7\u00e3o de RedFairy para os sintomas da fibromialgia. Entendo que receberei uma amostra gr\u00e1tis (pagarei apenas o valor do SEDEX), e que se eu quiser continuar o uso, voc\u00eas me garantem a continuidade do fornecimento a custo muito baixo. Obrigado!"
    window.open(`https://wa.me/${WA_PLATAFORMA}?text=${encodeURIComponent(msg)}`, '_blank')
    setSalvandoFib(false)
    setSalvoFib(true)
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {temObstipacaoModulo && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-xs font-bold uppercase tracking-wide mb-2">{"\ud83d\udc8a Solu\u00e7\u00e3o para Obstipa\u00e7\u00e3o"}</p>
          <p className="text-amber-700 text-xs mb-3 leading-relaxed">
            {"Identificamos obstipa\u00e7\u00e3o cr\u00f4nica no seu perfil. Temos uma solu\u00e7\u00e3o inovadora \u2014 amostras gr\u00e1tis dispon\u00edveis (voc\u00ea paga apenas o SEDEX)."}
          </p>
          {salvoObs ? (
            <p className="text-green-700 text-xs font-bold">{"\u2705 Mensagem enviada! Aguarde o contato da plataforma."}</p>
          ) : (
            <button onClick={enviarObstipacao} disabled={salvandoObs}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              {"\ud83d\udcf2 Quero testar \u2014 Enviar mensagem"}
            </button>
          )}
        </div>
      )}
      {temFibromialgia && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-purple-800 text-xs font-bold uppercase tracking-wide mb-2">{"\ud83c\udf3f Solu\u00e7\u00e3o para Fibromialgia"}</p>
          <p className="text-purple-700 text-xs mb-3 leading-relaxed">
            {"Identificamos sintomas fibromi\u00e1lgicos no seu perfil. Temos uma solu\u00e7\u00e3o inovadora \u2014 amostras gr\u00e1tis dispon\u00edveis (voc\u00ea paga apenas o SEDEX)."}
          </p>
          {salvoFib ? (
            <p className="text-green-700 text-xs font-bold">{"\u2705 Mensagem enviada! Aguarde o contato da plataforma."}</p>
          ) : (
            <button onClick={enviarFibromialgia} disabled={salvandoFib}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              {"\ud83d\udcf2 Quero testar \u2014 Enviar mensagem"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AchadosParalelosSection({ achados }) {
  const [expandido, setExpandido] = useState(null);
  if (!achados || achados.length === 0) return null;

  const schemeBy = {
    red:    { bg: 'bg-red-50',    border: 'border-red-400',    badge: 'bg-red-600',    text: 'text-red-800',    dot: 'bg-red-500',    label: "\ud83d\udd34 GRAVE"      },
    orange: { bg: 'bg-orange-50', border: 'border-orange-400', badge: 'bg-orange-500', text: 'text-orange-800', dot: 'bg-orange-500', label: "\ud83d\udfe0 IMPORTANTE" },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-500', text: 'text-yellow-800', dot: 'bg-yellow-400', label: "\ud83d\udfe1 ATEN\u00c7\u00c3O"    },
  };

  return (
    <div className="mt-6 rounded-2xl border-2 border-gray-300 bg-white shadow-lg overflow-hidden">
      <div className="bg-gray-700 text-white px-6 py-4">
        <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Achados Paralelos</p>
        <h3 className="text-xl font-bold">Outros Achados Relevantes</h3>
        <p className="text-gray-300 text-xs mt-1">
          {achados.length}{" achado"}{achados.length > 1 ? 's' : ''}{" detectado"}{achados.length > 1 ? 's' : ''}{" al\u00e9m do diagn\u00f3stico principal"}
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
                    {"\u203a"}
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

function OBASection({ oba }) {
  const [expandido, setExpandido] = useState(null);

  const alertasGraves = oba.alertas?.filter(a => a.nivel === 'grave') || [];
  const alertasMod    = oba.alertas?.filter(a => a.nivel === 'moderado') || [];

  return (
    <div className="mt-6 rounded-2xl border-2 border-purple-300 bg-purple-50 shadow-lg overflow-hidden">
      <div className="bg-purple-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-70 mb-1">{"Extens\u00e3o Bari\u00e1trica"}</p>
            <h3 className="text-xl font-bold">{"Avalia\u00e7\u00e3o OBA"}</h3>
            <p className="text-purple-200 text-xs mt-1">
              {oba.tipoCirurgia}{" \u00b7 "}{oba.mesesPosCirurgia}{" meses p\u00f3s-cirurgia"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-purple-300 text-xs mb-1">{"Disabsor\u00e7\u00e3o"}</p>
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
              <span className="text-orange-600 font-bold text-sm leading-none mt-0.5">{"\u25b2"}</span>
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
                    {"\u203a"}
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
              {"\ud83e\uddea Exames Complementares OBA"}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {oba.examesComplementares.map((ex, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">{"\u2022"}</span>
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
    try {
      await supabase.from('avaliacoes')
        .update({ medico_quer_receber: true })
        .eq('medico_crm', medicoCRM)
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (e) {
      console.error('Erro ao atualizar preferencia:', e);
    }
    setSalvando(false)
    setSalvo(true)
  }

  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden shadow-sm">
      <div className="bg-blue-700 px-4 py-3">
        <p className="text-white font-bold text-sm">{"\ud83e\ude7a Orienta\u00e7\u00e3o ao M\u00e9dico"}</p>
      </div>
      <div className="p-4 space-y-4">

        {isSaudavel ? (
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              {"Doutor, oriente "}{pronome}{" paciente a se cadastrar no RedFairy para futuras avalia\u00e7\u00f5es e acompanhamento."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-orange-200 p-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              {"Doutor: esse paciente precisa de reavalia\u00e7\u00e3o e prescri\u00e7\u00e3o m\u00e9dica. Quando ele se cadastrar na plataforma o sistema ir\u00e1 sinalizar, e ele ter\u00e1 a sua avalia\u00e7\u00e3o revisada por HEMATOLOGISTA, que emitir\u00e1 os documentos. Voc\u00ea receber\u00e1 um WhatsApp com essas informa\u00e7\u00f5es."}
            </p>
          </div>
        )}

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
              <p className="font-bold text-sm text-gray-700">{"Quero receber as avalia\u00e7\u00f5es futuras deste paciente"}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {"Se marcar, voc\u00ea receber\u00e1 o resultado das novas avalia\u00e7\u00f5es por WhatsApp."}
              </p>
            </div>
          </label>
          {salvo && (
            <p className="text-green-600 text-xs font-semibold mt-2 ml-7">{"\u2705 Prefer\u00eancia salva!"}</p>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-3">
          <span className="text-green-600 text-lg flex-shrink-0">{"\ud83d\udcb0"}</span>
          <p className="text-green-800 text-xs leading-relaxed">
            {"Foram computados "}<strong>{"Cr\u00e9ditos"}</strong>{" para voc\u00ea no "}<strong>{"4DOC \u2014 Programa Patrocinado de M\u00e9dicos Afiliados"}</strong>{"."}
          </p>
        </div>

      </div>
    </div>
  )
}

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
    resultado.recomendacao.includes("\u00c1CIDO F\u00d3LICO") ||
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
      // Fallbacks vindos da pr\u00f3pria avalia\u00e7\u00e3o (triagem -> Calculator: paciente n\u00e3o-cadastrado).
      // Calculator usa dataNascimento em DD/MM/AAAA; HTML input type=date precisa de YYYY-MM-DD.
      const dnRaw = resultado?._inputs?.dataNascimento || '';
      let dnISO = '';
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dnRaw)) {
        const [d, m, a] = dnRaw.split('/');
        dnISO = `${a}-${m}-${d}`;
      }
      if (cpfInput) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome, data_nascimento, celular, cpf')
          .eq('cpf', cpfInput)
          .single();
        if (profile) {
          setDadosPaciente({
            nome:      profile.nome || '',
            dataNasc:  profile.data_nascimento || dnISO || '',
            celular:   profile.celular || '',
            cpf:       profile.cpf || cpfInput,
          });
        } else {
          setDadosPaciente(p => ({ ...p, cpf: cpfInput, dataNasc: dnISO || p.dataNasc }));
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
        l.includes('FERRO') || l.includes('VITAMINA') || l.includes("\u00c1CIDO F\u00d3LICO") ||
        l.includes('SUPLEMENTA') || l.includes("REPOSI\u00c7\u00c3O")
      );
      linhas.push(...frases);
    }
    if (resultado._oba?.modulos) {
      resultado._oba.modulos.forEach(mod => {
        mod.linhas?.forEach(l => {
          if (l.includes('mg') || l.includes("\u00b5g") || l.includes('UI') || l.includes('COMPRIMIDO') || l.includes('SUBLINGUAL') || l.includes("INJET\u00c1VEL") || l.includes('ENDOVENOSO')) {
            linhas.push(l);
          }
        });
      });
    }
    if (!linhas.length) return '';
    return "PRESCRI\u00c7\u00c3O M\u00c9DICA:\n" + linhas.join('\n');
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
      "ATEN\u00c7\u00c3O | RedFairy!",
      `CPF: ${dadosPaciente.cpf || "N\u00e3o informado"}`,
      `PACIENTE: ${dadosPaciente.nome.trim().toUpperCase()}`,
      `NASCIMENTO: ${dadosPaciente.dataNasc}`,
      `CELULAR: ${dadosPaciente.celular}`,
      ...documentos,
    ];

    const textoCompleto = msgs.join('\n---\n');

    try {
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
      });
    } catch (e) {
      console.error('Erro ao salvar pedido_documento:', e);
    }

    const urlWA = `https://wa.me/${WHATSAPP_MEDICO}?text=${encodeURIComponent(msgs.join('%0A---%0A'))}`;
    window.open(urlWA, '_blank');

    setEnviando(false);
    setEtapa('pix');
  }

  async function confirmarPagamento() {
    const msgPago = `${dadosPaciente.nome.trim().toUpperCase()}` + " \u2014 PAGO. Emita o(s) documento(s).";
    const urlPago = `https://wa.me/${WHATSAPP_MEDICO}?text=${encodeURIComponent(msgPago)}`;
    window.open(urlPago, '_blank');

    try {
      await supabase.from('pedidos_documento')
        .update({ status: 'pago', pago_em: new Date().toISOString() })
        .eq('celular', dadosPaciente.celular)
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (e) {
      console.error('Erro ao atualizar pedido_documento:', e);
    }

    setEtapa('concluido');
  }

  if (!temExames && !temPrescricao) return null;
  if (valorDoc === null) return null;

  const inputStyle = { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  if (etapa === 'concluido') return (
    <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-5 text-center space-y-2">
      <p className="text-2xl">{"\u2705"}</p>
      <p className="font-bold text-green-800">Pedido enviado com sucesso!</p>
      <p className="text-sm text-green-700">{"O m\u00e9dico do Projeto RedFairy receber\u00e1 seus documentos em breve via WhatsApp."}</p>
    </div>
  );

  if (etapa === 'pix') return (
    <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-red-700 px-4 py-3">
        <p className="text-white font-bold text-sm">{"\ud83d\udcb3 Efetue o pagamento via Pix"}</p>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-gray-600 text-sm">{"Valor: "}<strong className="text-red-700 text-lg">{"R$ "}{((valorDoc || 0) * ([tiposDoc.exames, tiposDoc.prescricao].filter(Boolean).length || 1)).toFixed(2)}</strong></p>
        {pixChave && (
          <>
            <div className="flex justify-center">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixChave)}`}
                alt="QR Code Pix" className="rounded-xl border border-gray-200" width={180} height={180} />
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">{"Chave Pix (Copia e Cola):"}</p>
              <p className="text-xs font-mono text-gray-700 break-all select-all">{pixChave}</p>
            </div>
          </>
        )}
        <p className="text-xs text-gray-500 text-center">{"Ap\u00f3s o pagamento, clique no bot\u00e3o abaixo para confirmar."}</p>
        <button onClick={confirmarPagamento}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
          {"\u2705 J\u00e1 paguei \u2014 Confirmar pagamento"}
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
        <p className="text-white font-bold text-sm">{"\ud83d\udccb Seus dados para o documento"}</p>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Nome completo</label>
          <input style={{ ...inputStyle, textTransform:'uppercase' }} type="text" placeholder="Como no RG" value={dadosPaciente.nome} onChange={e => setDadosPaciente(p => ({ ...p, nome: e.target.value.toUpperCase() }))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Data de nascimento</label>
          <input style={{ ...inputStyle, ...(dadosPaciente.dataNasc ? { background:'#f3f4f6', color:'#6b7280' } : {}) }} type="date" max={new Date().toISOString().split('T')[0]} value={dadosPaciente.dataNasc} disabled={!!dadosPaciente.dataNasc} onChange={e => setDadosPaciente(p => ({ ...p, dataNasc: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Celular com DDD</label>
          <input style={inputStyle} type="tel" placeholder="(00) 00000-0000" value={dadosPaciente.celular} onChange={e => setDadosPaciente(p => ({ ...p, celular: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">CPF</label>
          <input style={{ ...inputStyle, ...(dadosPaciente.cpf ? { background:'#f3f4f6', color:'#6b7280' } : {}) }} type="text" placeholder="000.000.000-00" value={dadosPaciente.cpf} disabled={!!dadosPaciente.cpf} onChange={e => setDadosPaciente(p => ({ ...p, cpf: e.target.value }))} />
        </div>
        {erro && <p className="text-red-500 text-xs">{erro}</p>}
        <button onClick={enviarWhatsApp} disabled={enviando}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
          {enviando ? 'Enviando...' : "\ud83d\udcf2 Enviar pedido via WhatsApp \u2192"}
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
        <span className="text-xl">{"\ud83d\udcc4"}</span>
        <div>
          <p className="text-white font-bold text-sm">{"Quer que um m\u00e9dico emita os documentos?"}</p>
          <p className="text-red-200 text-xs">{"Pedido de exames e/ou prescri\u00e7\u00e3o via WhatsApp"}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-gray-600 text-sm">{"Um m\u00e9dico do Projeto RedFairy gera e envia por WhatsApp:"}</p>
        <div className="space-y-2">
          {temExames && (
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
              style={{ borderColor: tiposDoc.exames ? '#DC2626' : '#E5E7EB', background: tiposDoc.exames ? '#FEF2F2' : 'white' }}>
              <input type="checkbox" checked={tiposDoc.exames} onChange={e => setTiposDoc(p => ({ ...p, exames: e.target.checked }))}
                className="w-4 h-4 cursor-pointer" />
              <div>
                <p className="font-bold text-sm text-gray-700">{"\ud83d\udccb Pedido de Exames"}</p>
                <p className="text-xs text-gray-500">{resultado.proximosExames?.length}{" exame(s) sugeridos"}</p>
              </div>
              <span className="ml-auto font-bold text-red-700">{"R$ "}{valorDoc?.toFixed(2)}</span>
            </label>
          )}
          {temPrescricao && (
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
              style={{ borderColor: tiposDoc.prescricao ? '#DC2626' : '#E5E7EB', background: tiposDoc.prescricao ? '#FEF2F2' : 'white' }}>
              <input type="checkbox" checked={tiposDoc.prescricao} onChange={e => setTiposDoc(p => ({ ...p, prescricao: e.target.checked }))}
                className="w-4 h-4 cursor-pointer" />
              <div>
                <p className="font-bold text-sm text-gray-700">{"\ud83d\udc8a Prescri\u00e7\u00e3o M\u00e9dica"}</p>
                <p className="text-xs text-gray-500">Suplementos e medicamentos indicados</p>
              </div>
              <span className="ml-auto font-bold text-red-700">{"R$ "}{valorDoc?.toFixed(2)}</span>
            </label>
          )}
        </div>
        {(tiposDoc.exames || tiposDoc.prescricao) && (
          <p className="text-center font-bold text-red-700">
            {"Total: R$ "}{((valorDoc || 0) * [tiposDoc.exames, tiposDoc.prescricao].filter(Boolean).length).toFixed(2)}
          </p>
        )}
        <button
          onClick={() => { if (!tiposDoc.exames && !tiposDoc.prescricao) { setErro('Selecione pelo menos um documento.'); return; } setErro(''); setEtapa('dados'); }}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors text-sm">
          {"Quero receber os documentos \u2192"}
        </button>
        {erro && <p className="text-red-500 text-xs text-center">{erro}</p>}
        <p className="text-xs text-gray-400 text-center">{"Pagamento via Pix \u00b7 Documento entregue em at\u00e9 24h"}</p>
      </div>
    </div>
  );
}


export default function ResultCard({ resultado, onCopiar, copiado, modoPaciente = false, mostrarPainelMedico = true, medicoNome, medicoCRM, medicoDados, onVoltar, onNovaAvaliacao, mostrarOptInExames = false, optInExamesEnviado = false, onOptInExames }) {
  const [showFerroEV, setShowFerroEV] = useState(false);
  const [showSangria, setShowSangria] = useState(false);

  // Historico/grafico de evolucao no fim da avaliacao.
  // Modo medico: botao aparece se paciente tem >= 2 avaliacoes.
  // Modo paciente (tratado como nao-cadastrado por ora): mostra convite ao cadastro.
  const [historicoData, setHistoricoData] = useState(null);
  const [historicoBuscando, setHistoricoBuscando] = useState(false);
  const [historicoMsg, setHistoricoMsg] = useState('');
  const [totalRegistrosHist, setTotalRegistrosHist] = useState(0);

  const cpfResultado = String(resultado?._inputs?.cpf || '').replace(/\D/g, '');

  // Conta quantos pontos (triagens + avaliacoes) o paciente tem, pra decidir
  // se mostra o botao de grafico (>= 2). So' roda no modo medico com CPF valido.
  useEffect(() => {
    if (modoPaciente) return;
    if (cpfResultado.length !== 11) return;
    let cancelado = false;
    (async () => {
      try {
        const [tRes, aRes] = await Promise.all([
          supabase.from('triagens').select('id', { count: 'exact', head: true }).eq('cpf', cpfResultado),
          supabase.from('avaliacoes').select('id', { count: 'exact', head: true }).eq('cpf', cpfResultado),
        ]);
        if (cancelado) return;
        const total = (tRes.count || 0) + (aRes.count || 0);
        setTotalRegistrosHist(total);
      } catch (e) { /* silencioso */ }
    })();
    return () => { cancelado = true; };
  }, [cpfResultado, modoPaciente]);

  async function handleVerHistorico() {
    if (cpfResultado.length !== 11) return;
    setHistoricoBuscando(true);
    setHistoricoMsg('');
    const norm = (v) => {
      const n = Number(v);
      return (v === null || v === undefined || v === '' || isNaN(n)) ? null : n;
    };
    const [tRes, aRes] = await Promise.all([
      supabase.from('triagens').select('created_at, hemoglobina, vcm, rdw').eq('cpf', cpfResultado).order('created_at', { ascending: true }),
      supabase.from('avaliacoes').select('data_coleta, hemoglobina, vcm, rdw, ferritina, sat_transf').eq('cpf', cpfResultado).order('data_coleta', { ascending: true }),
    ]);
    setHistoricoBuscando(false);
    if (tRes.error && aRes.error) {
      setHistoricoMsg('Erro ao buscar hist\u00f3rico.');
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }
    const serie = [];
    (tRes.data || []).forEach((r) => serie.push({ data: r.created_at, hb: norm(r.hemoglobina), vcm: norm(r.vcm), rdw: norm(r.rdw), ferritina: null, sat: null, origem: 'triagem' }));
    (aRes.data || []).forEach((r) => serie.push({ data: r.data_coleta, hb: norm(r.hemoglobina), vcm: norm(r.vcm), rdw: norm(r.rdw), ferritina: norm(r.ferritina), sat: norm(r.sat_transf), origem: 'avaliacao' }));
    serie.sort((a, b) => new Date(a.data) - new Date(b.data));
    const pontosG1 = serie.filter((p) => p.hb !== null || p.vcm !== null || p.rdw !== null);
    if (pontosG1.length < 2) {
      setHistoricoMsg('N\u00c3O H\u00c1 ELEMENTOS PARA GR\u00c1FICO');
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }
    setHistoricoData({ cpf: cpfResultado, serie });
  }

  const [verObsoleto, setVerObsoleto] = useState(false);
  if (resultado.obsoleto && !verObsoleto) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-red-400 bg-red-50 overflow-hidden shadow-sm">
        <div className="bg-red-700 text-white px-6 py-4">
          <p className="text-xs uppercase tracking-widest opacity-80 mb-1">{"\u26a0\ufe0f Aviso"}</p>
          <h3 className="text-xl font-bold">EXAMES OBSOLETOS</h3>
          <p className="text-xs opacity-90 mt-1">
            {"Realizados h\u00e1 "}{resultado.diasDesdeColeta}{" dia(s) \u2014 mais de 2 anos atr\u00e1s"}
          </p>
        </div>
        <div className="p-6 space-y-4 text-sm text-gray-800 leading-relaxed">
          <p>
            <strong>{"Esta avalia\u00e7\u00e3o N\u00c3O TEM SIGNIFICADO CL\u00cdNICO ATUAL."}</strong>
          </p>
          <p>
            {"Sugerimos que voc\u00ea fa\u00e7a os exames recomendados (hemograma, ferritina, satura\u00e7\u00e3o da transferrina) para obter uma avalia\u00e7\u00e3o v\u00e1lida."}
          </p>
          <div className="bg-white border border-red-200 rounded-xl p-4 text-sm text-gray-700">
            {"\ud83d\udca1 A plataforma RedFairy pode emitir a solicita\u00e7\u00e3o dos exames mediante o pagamento de uma pequena taxa, evitando a necessidade de uma consulta presencial apenas para isso. Ap\u00f3s realizar os exames, retorne aqui para nova avalia\u00e7\u00e3o."}
          </div>
          <button
            onClick={() => setVerObsoleto(true)}
            className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {"Ver avalia\u00e7\u00e3o obsoleta (apenas refer\u00eancia hist\u00f3rica)"}
          </button>
        </div>
      </div>
    );
  }

  if (!resultado.encontrado) {
    return (
      <div className="bg-white border-2 border-amber-300 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-amber-50 px-6 py-5 flex items-start gap-4">
          <span style={{ fontSize: '28px', lineHeight: 1 }}>{"\ud83d\udd0d"}</span>
          <div>
            <p className="font-semibold text-amber-800 text-base">{"Combina\u00e7\u00e3o n\u00e3o reconhecida pelo algoritmo"}</p>
            <p className="text-amber-700 text-sm mt-1 leading-relaxed">
              {"Os valores informados n\u00e3o correspondem a nenhum padr\u00e3o catalogado. Isso pode indicar um resultado laboratorial at\u00edpico, um erro de digita\u00e7\u00e3o, ou uma combina\u00e7\u00e3o que ainda n\u00e3o est\u00e1 mapeada no RedFairy."}
            </p>
          </div>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm font-semibold text-gray-600">O que fazer:</p>
          <div className="space-y-2">
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-amber-500 mt-0.5">{"\u2460"}</span>
              <span>{"Confira se os valores foram digitados corretamente, comparando com o laudo original."}</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-amber-500 mt-0.5">{"\u2461"}</span>
              <span>{"Verifique se o laborat\u00f3rio utilizou as mesmas unidades de medida (ng/mL, g/dL, fL, %)."}</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-amber-500 mt-0.5">{"\u2462"}</span>
              <span>{"Se os valores estiverem corretos, consulte seu m\u00e9dico \u2014 resultados muito at\u00edpicos podem indicar erro laboratorial ou condi\u00e7\u00e3o cl\u00ednica rara."}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 mt-2 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Valores informados</p>
            <p className="text-xs text-gray-500 font-mono leading-relaxed">
              {"Hb: "}{resultado.mensagem.match(/Hb=([\d.]+)/)?.[1] ?? "\u2014"}{" g/dL  |  "}
              {"Ferritina: "}{resultado.mensagem.match(/Ferritina=([\d.]+)/)?.[1] ?? "\u2014"}{" ng/mL  |  "}
              {"VCM: "}{resultado.mensagem.match(/VCM=([\d.]+)/)?.[1] ?? "\u2014"}{" fL"}<br/>
              {"RDW: "}{resultado.mensagem.match(/RDW=([\d.]+)/)?.[1] ?? "\u2014"}{" %  |  "}
              {"Sat: "}{resultado.mensagem.match(/Sat=([\d.]+)/)?.[1] ?? "\u2014"}{" %"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const scheme = colorScheme[resultado.color] || colorScheme.yellow;

  const _hbAtualFerroEV = Number(resultado._inputs?.hemoglobina ?? 0);
  const _sexoFerroEV = resultado._inputs?.sexo || 'M';
  const _gestanteFerroEV = Boolean(resultado._inputs?.gestante);
  const _hbAlvoFerroEV = _sexoFerroEV === 'M' ? 13.5 : (_gestanteFerroEV ? 11.5 : 12.0);
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

  // (refino clínico) Indicação FORTE de ferro EV → protocolo direto. Senão (anemia
  // mais leve: Hb acima do corte, sem má-absorção, sem hemorragia/doação nem anemia
  // crônica) → mostra uma RESSALVA (oral provavelmente basta; EV opcional sob
  // prescrição). Corte de Hb: < 12 (homem) / < 10 (mulher).
  const _hbCorteFerroEV = _sexoFerroEV === 'M' ? 12 : 10;
  const ferroEVForte =
    !!resultado._inputs?.perda ||           // hemorragia
    !!resultado._inputs?.doadorSangue ||    // doação de sangue
    !!resultado._inputs?.bariatrica ||      // má absorção (bypass/gastrectomia)
    !!resultado._inputs?.celiaco ||         // má absorção (doença celíaca)
    (_hbAtualFerroEV > 0 && _hbAtualFerroEV < _hbCorteFerroEV);
    // anemia crônica sozinha NÃO força o protocolo (cai na ressalva).

  const _precisaSangriaTextual =
    resultado.diagnostico?.toUpperCase().includes("SANGRIA TERAP\u00caUTICA") ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIA TERAPEUTICA') ||
    resultado.diagnostico?.toUpperCase().includes("SANGRIAS TERAP\u00caUTICAS") ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIAS TERAPEUTICAS') ||
    resultado.recomendacao?.toUpperCase().includes("SANGRIA TERAP\u00caUTICA") ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIA TERAPEUTICA') ||
    resultado.recomendacao?.toUpperCase().includes("SANGRIAS TERAP\u00caUTICAS") ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIAS TERAPEUTICAS');

  const _sexoIn   = resultado._inputs?.sexo;
  const _ferrIn   = Number(resultado._inputs?.ferritina ?? 0);
  const _satIn    = Number(resultado._inputs?.satTransf ?? 0);
  const _hbIn     = Number(resultado._inputs?.hemoglobina ?? 0);
  const _gestante = Boolean(resultado._inputs?.gestante);

  const _sobrecargaMasc = _sexoIn === 'M' && _ferrIn >= 500 && _satIn > 50 && _hbIn >= 13.5;
  const _sobrecargaFem  = _sexoIn === 'F' && _ferrIn >= 400 && _satIn > 50 && _hbIn >= 12;

  const precisaSangria = (_precisaSangriaTextual || _sobrecargaMasc || (_sobrecargaFem && !_gestante)) && !_gestante;
  const alertaGestanteSobrecarga = _sobrecargaFem && _gestante;

  const isPolicitemiaVera = resultado.id === 81;
  const hbAtual   = resultado._inputs?.hemoglobina || 0;
  const sexo      = resultado._inputs?.sexo || 'M';
  const ferritina = resultado._inputs?.ferritina || 0;
  const satTransf = resultado._inputs?.satTransf || 0;
  const oba       = resultado._oba || null;

  return (
    <>
      {showFerroEV && <ModalFerroEV onClose={() => setShowFerroEV(false)} hbAtual={hbAtual} sexo={sexo} gestante={resultado._inputs?.gestante} pesoInicial={resultado._inputs?.peso} />}
      {showSangria && (
        <ModalSangria
          onClose={() => setShowSangria(false)}
          ferritina={ferritina} satTransf={satTransf}
          sexo={sexo} hbAtual={hbAtual} isPolicitemiaVera={isPolicitemiaVera}
        />
      )}

      <div className={`rounded-2xl border-2 ${scheme.border} ${scheme.bg} shadow-lg overflow-hidden`}>

        <div className={`${scheme.badge} text-white px-6 py-4 flex items-center justify-between`}>
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80 mb-1 font-bold">{"Diagn\u00f3stico"}</p>
            <h3 className="text-xl font-bold">{resultado.label}</h3>
            {resultado._inputs && (() => {
              const inp = resultado._inputs
              // Data do hemograma (DD/MM/AAAA): aceita DD/MM/AAAA ou YYYY-MM-DD.
              let dataHemo = ''
              const dcRaw = String(inp.dataColeta || '')
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(dcRaw)) dataHemo = dcRaw
              else if (/^\d{4}-\d{2}-\d{2}$/.test(dcRaw)) dataHemo = dcRaw.split('-').reverse().join('/')
              // Subtexto por extenso: Sexo \u00b7 Hemoglobina \u00b7 VCM \u00b7 RDW (+ Ferritina/Satura\u00e7\u00e3o se houver).
              const labs = []
              if (inp.hemoglobina !== undefined && inp.hemoglobina !== '') labs.push(`Hemoglobina ${inp.hemoglobina} g/dL`)
              if (inp.vcm         !== undefined && inp.vcm         !== '') labs.push(`VCM ${inp.vcm} fL`)
              if (inp.rdw         !== undefined && inp.rdw         !== '') labs.push(`RDW ${inp.rdw} %`)
              // Ferritina/Satura\u00e7\u00e3o s\u00f3 aparecem se houver valor REAL (> 0). Na triagem
              // sem aprofundamento elas chegam como 0 \u2014 nao mostrar "0 ng/mL" / "0%".
              if (Number(inp.ferritina) > 0) labs.push(`Ferritina ${inp.ferritina} ng/mL`)
              if (Number(inp.satTransf) > 0) labs.push(`Satura\u00e7\u00e3o ${inp.satTransf} %`)
              const sexoExtenso = inp.sexo === 'F' ? 'Feminino' : inp.sexo === 'M' ? 'Masculino' : '?'
              const cabecalho = [sexoExtenso, ...labs].join(" \u00b7 ")
              // Linha pessoal (acima da data): NOME \u00b7 IDADE \u00b7 CPF.
              const _cpfFmt = String(inp.cpf || '').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
              const linhaPessoal = [inp.nome || '', inp.idade ? inp.idade + ' anos' : '', _cpfFmt ? 'CPF ' + _cpfFmt : ''].filter(Boolean).join(" \u00b7 ")
              const flagsAtivas = []
              const FLAGS_MAP = {
                bariatrica: "bari\u00e1trica", vegetariano: inp.sexo === 'F' ? 'vegetariana' : 'vegetariano', perda: 'perda',
                hipermenorreia: 'hipermenorreia', gestante: 'gestante', alcoolista: 'alcoolista',
                transfundido: 'transfundido', aspirina: 'aspirina', vitaminaB12: 'B12',
                ferroOral: 'ferro oral', tiroxina: 'tiroxina', hidroxiureia: 'hidroxiureia',
                anticonvulsivante: 'anticonvulsivante', testosterona: 'testosterona',
                metformina: 'metformina', ibp: 'IBP', methotrexato: 'metotrexato',
                hivTratamento: 'HIV', anemiaPrevia: "anemia pr\u00e9via", sideropenia: 'sideropenia',
                sobrecargaFerro: 'sobrecarga ferro', hbAlta: "Hb alta pr\u00e9via", celiaco: "cel\u00edaco",
                g6pd: 'G6PD', endometriose: 'endometriose', doadorSangue: 'doador sangue'
              }
              for (const k of Object.keys(FLAGS_MAP)) {
                if (inp[k] === true) flagsAtivas.push(FLAGS_MAP[k])
              }
              return (
                <div className="text-xs opacity-75 mt-1 leading-snug">
                  {linhaPessoal && <div className="font-semibold">{linhaPessoal}</div>}
                  {dataHemo && <div>{"DATA DO \u00daLTIMO HEMOGRAMA: "}{dataHemo}</div>}
                  <div>{cabecalho}</div>
                  {flagsAtivas.length > 0 && (
                    <div>{"Flags: "}{flagsAtivas.join(', ')}</div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        <div className="p-6 space-y-5">

          {resultado.fraseData && (() => {
            // Fallback: se diasDesdeColeta veio NaN/undef, calcula daqui usando _inputs.dataColeta (DD/MM/AAAA)
            let dias = resultado.diasDesdeColeta;
            if (dias == null || Number.isNaN(Number(dias))) {
              const dc = resultado._inputs?.dataColeta || '';
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(dc)) {
                const [d, m, a] = dc.split('/').map(Number);
                const dtColeta = new Date(a, m - 1, d);
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                dtColeta.setHours(0, 0, 0, 0);
                dias = Math.floor((hoje.getTime() - dtColeta.getTime()) / 86400000);
              } else if (/^\d{4}-\d{2}-\d{2}$/.test(dc)) {
                const dtColeta = new Date(dc);
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                dtColeta.setHours(0, 0, 0, 0);
                dias = Math.floor((hoje.getTime() - dtColeta.getTime()) / 86400000);
              }
            }
            return (
              <div className={`rounded-xl border px-4 py-3 text-sm ${fraseDataColor[resultado.fraseData.tipo]}`}>
                <span className="font-semibold">{"\ud83d\udcc5 "}{dias != null && !Number.isNaN(Number(dias)) ? dias : '?'}{" dia(s) desde a coleta"}</span>
                <p className="mt-1">{
                  (dias != null && !Number.isNaN(Number(dias)) && typeof resultado.fraseData.texto === 'string')
                    ? resultado.fraseData.texto.replace(/\bNaN\b/g, String(dias))
                    : resultado.fraseData.texto
                }</p>
              </div>
            );
          })()}

          <div>
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>{"\ud83c\udff7\ufe0f Diagn\u00f3stico"}</h4>
            <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
              {resultado.diagnostico}
            </p>
          </div>

          <div>
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>{"\ud83d\udccb Recomenda\u00e7\u00e3o"}</h4>
            <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
              {resultado.recomendacao}
            </p>
          </div>

          {!modoPaciente && resultado._inputs?.bariatrica && (() => {
            const ela = (resultado._inputs?.sexo || 'M') === 'F'
            const txt = ela
              ? "Oriente a paciente a se cadastrar no RedFairy: ao se cadastrar, ela preenche a anamnese do Projeto OBA \u2014 Otimizar o Bari\u00e1trico, e passa a ter acompanhamento din\u00e2mico personalizado. A avalia\u00e7\u00e3o j\u00e1 est\u00e1 salva sob o CPF dela."
              : "Oriente o paciente a se cadastrar no RedFairy: ao se cadastrar, ele preenche a anamnese do Projeto OBA \u2014 Otimizar o Bari\u00e1trico, e passa a ter acompanhamento din\u00e2mico personalizado. A avalia\u00e7\u00e3o j\u00e1 est\u00e1 salva sob o CPF dele."
            return (
              <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-800 mb-1">{"\ud83d\udce4 Recomenda\u00e7\u00e3o \u2014 Projeto OBA"}</p>
                <p className="text-gray-700 text-sm leading-relaxed">{txt}</p>
              </div>
            )
          })()}

          {precisaFerroEV && !resultado._inputs?.bariatrica && !resultado._inputs?.perda && !resultado._inputs?.celiaco && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-900 mb-1">{"\u26a0\ufe0f Observa\u00e7\u00e3o importante"}</p>
              <p className="text-sm leading-relaxed text-amber-900">
                {"Considerado o grau de anemia, a crit\u00e9rio cl\u00ednico voc\u00ea poder\u00e1 ser tratado com ferro endovenoso. Mas o tratamento com ferro por via oral n\u00e3o est\u00e1 descartado."}
              </p>
            </div>
          )}
          {precisaFerroEV && (
            <button onClick={() => setShowFerroEV(true)}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              {ferroEVForte ? "\ud83d\udc89 Como repor o Ferro Endovenoso" : "\ud83d\udc89 Protocolo de Ferro Endovenoso (opcional)"}
            </button>
          )}

          {alertaGestanteSobrecarga && (
            <div className="rounded-xl border-2 border-pink-400 bg-pink-50 p-4 space-y-2">
              <p className="text-sm font-bold text-pink-900 uppercase tracking-wide">
                {"\u26a0\ufe0f Sobrecarga de Ferro na Gesta\u00e7\u00e3o"}
              </p>
              <p className="text-sm text-pink-900 leading-relaxed">
                {"A sangria terap\u00eautica "}<strong>{"n\u00e3o est\u00e1 indicada durante a gesta\u00e7\u00e3o"}</strong>{" \u2014 h\u00e1 risco de hip\u00f3xia fetal. A gesta\u00e7\u00e3o e a lacta\u00e7\u00e3o consumir\u00e3o cerca de 1 g de ferro das suas reservas, o que reduzir\u00e1 parcialmente a sobrecarga atual."}
              </p>
              <p className="text-sm text-pink-900 leading-relaxed font-medium">
                <strong>{"Ap\u00f3s o parto e o fim da lacta\u00e7\u00e3o, solicite teleconsulta com hematologista para avaliar o status atual do seu metabolismo do ferro e decidir sobre o tratamento definitivo."}</strong>
              </p>
            </div>
          )}

          {precisaSangria && (
            <button onClick={() => setShowSangria(true)}
              className="w-full bg-red-900 hover:bg-red-950 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              {"\ud83e\ude78 Protocolo de Sangria Terap\u00eautica"}
            </button>
          )}

          {resultado.fraseHipermenorreia && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-2 text-pink-700">{"\u26a0\ufe0f Hipermenorreia"}</h4>
              <p className="text-gray-700 text-sm leading-relaxed bg-pink-50 rounded-xl p-4 border border-pink-200">
                {resultado.fraseHipermenorreia}
              </p>
            </div>
          )}

          {resultado.g6pdAlerta && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-2 text-purple-700">{"\u26a0\ufe0f G-6-PD"}</h4>
              <p className="text-gray-700 text-sm leading-relaxed bg-purple-50 rounded-xl p-4 border border-purple-200">
                {resultado.g6pdAlerta}
              </p>
            </div>
          )}

          {resultado.g6pdAlerta && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-2 text-purple-700">{"\u26a0\ufe0f G-6-PD"}</h4>
              <p className="text-gray-700 text-sm leading-relaxed bg-purple-50 rounded-xl p-4 border border-purple-200">
                {resultado.g6pdAlerta}
              </p>
            </div>
          )}

          {resultado.comentarios.length > 0 && (
            <div>
              <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>{"\ud83d\udc8a Medicamentos / Suplementos"}</h4>
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
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>{"\ud83e\uddea Pr\u00f3ximos Exames Sugeridos"}</h4>
            {(() => {
              // Usa os arrays separados do engine; se nao existirem (retorno antigo),
              // trata tudo como laboratorio para nao perder exames.
              const temSeparacao = Array.isArray(resultado.proximosExamesLab) || Array.isArray(resultado.proximosExamesImagem);
              const listaLab = temSeparacao
                ? (resultado.proximosExamesLab || [])
                : (resultado.proximosExames || []);
              const listaImagem = temSeparacao
                ? (resultado.proximosExamesImagem || [])
                : [];
              return (
                <div className="space-y-3">
                  {listaLab.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{"\ud83d\udd2c Laborat\u00f3rio"}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {listaLab.map((exame, i) => (
                          <div key={`lab-${i}`} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="text-gray-400">{"\u2022"}</span>
                            {exame}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {listaImagem.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{"\ud83e\ude7b Imagem"}</p>
                      <div className="grid grid-cols-1 gap-1">
                        {listaImagem.map((exame, i) => (
                          <div key={`img-${i}`} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="text-gray-400">{"\u2022"}</span>
                            {exame}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {listaLab.length === 0 && listaImagem.length === 0 && (
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <p className="text-sm text-gray-400">{"Nenhum exame adicional sugerido."}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Opt-in do pedido NÃO aparece no caso de dados discrepantes (_fallback):
              ali a sugestão é "Reavaliação clínica com médico", não há pedido a gerar. */}
          {mostrarOptInExames && resultado.proximosExames?.length > 0 && !resultado._fallback && (
            optInExamesEnviado ? (
              <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 text-center">
                <p className="text-sm font-bold text-green-700">{"✅ Pedido solicitado! Você o receberá via WhatsApp."}</p>
              </div>
            ) : (
              <label className="flex items-start gap-3 rounded-xl border-2 border-blue-300 bg-blue-50 p-4 cursor-pointer">
                <input type="checkbox" checked={false}
                  onChange={() => onOptInExames && onOptInExames()}
                  className="mt-0.5 w-5 h-5 accent-blue-700 flex-shrink-0" />
                <span className="text-sm font-bold text-blue-700 leading-snug">
                  {precisaFerroEV
                    ? "Desejo uma TELECONSULTA MÉDICA para a avaliação do meu diagnóstico e emissão do pedido de exames e da receita de ferro endovenoso."
                    : <>
                        {"Sim, quero receber o pedido médico para esses exames."}
                        <span className="block text-xs font-normal text-blue-600 mt-1">{"Esse primeiro pedido de exames é gratuito."}</span>
                      </>}
                </span>
              </label>
            )
          )}

        </div>
      </div>

      <AchadosParalelosSection achados={resultado.achadosParalelos} />

      {oba && <OBASection oba={oba} />}

      {!modoPaciente && mostrarPainelMedico && (
        <PainelMedico
          resultado={resultado}
          medicoNome={medicoNome}
          medicoCRM={medicoCRM}
          medicoDados={medicoDados}
        />
      )}
      {modoPaciente && (
        <DocumentoMedicoPanel resultado={resultado} />
      )}

      {/* Historico de evolucao no fim da avaliacao (só no fluxo do médico — no
          paciente já existe o "Ver o histórico..." do PatientDashboard). */}
      {!modoPaciente && mostrarPainelMedico && totalRegistrosHist >= 2 && (
        <div className="mt-6">
          <button onClick={handleVerHistorico} disabled={historicoBuscando}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {historicoBuscando ? 'Buscando...' : "\ud83d\udcc8 Ver Hist\u00f3rico de Evolu\u00e7\u00e3o"}
          </button>
          {historicoMsg && (
            <p className="text-xs text-center mt-2 font-medium text-red-700">{historicoMsg}</p>
          )}
        </div>
      )}
      {modoPaciente && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
          <p className="text-sm font-bold text-blue-700 leading-snug">
            {"CADASTRE-SE PARA TER ACESSO \u00c0 AVALIA\u00c7\u00c3O COMPLETA COM GR\u00c1FICOS DE EVOLU\u00c7\u00c3O"}
          </p>
        </div>
      )}

      <button onClick={onCopiar}
        className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all
          ${copiado ? 'bg-green-500 text-white' : 'bg-green-600 text-white hover:bg-green-700'}`}>
        {copiado ? "\u2705 Resultado Copiado!" : "\ud83d\udccb Copiar Resultado para WhatsApp"}
      </button>
      {/* Design B: do resultado, m\u00e9dico volta ao formul\u00e1rio (Nova Avalia\u00e7\u00e3o) ou sai pra landing (Fechar e Sair). */}
      {!modoPaciente && (
        <div className="mt-3 flex gap-3">
          {onNovaAvaliacao && (
            <button onClick={onNovaAvaliacao}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
              {"\u2190 Nova Avalia\u00e7\u00e3o"}
            </button>
          )}
          {onVoltar && (
            <button onClick={onVoltar}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-700 hover:bg-red-800 transition-colors">
              {"Fechar e Sair"}
            </button>
          )}
        </div>
      )}

      {historicoData && (
        <HistoricoChartModal
          cpf={historicoData.cpf}
          serie={historicoData.serie}
          sexo={resultado?._inputs?.sexo}
          gestante={!!resultado?._inputs?.gestante}
          onFechar={() => setHistoricoData(null)}
        />
      )}
    </>
  );
}
