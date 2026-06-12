import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calcularDeficitFerroGanzoni, calcReceita } from '../engine/ferroProtocol';

// Classes de receita exibidas (cada uma puxa a marca configurada no Admin → Medicamentos).
const CLASSES_RECEITA = [
  { id: 'alta_dose',       rotulo: 'Alta dose',       acesso: 'plano de saúde · centro de infusão · compra' },
  { id: 'dose_fracionada', rotulo: 'Dose fracionada', acesso: 'sacarato · disponível no SUS' },
];

/**
 * Protocolo de REPOSIÇÃO DE FERRO ENDOVENOSO (Fórmula de Ganzoni).
 * Componente compartilhado — usado no ResultCard (médico/não-bariátrico) e no
 * OBAModal (bariátrico). Carrega o catálogo de drogas do Supabase e calcula a dose.
 *
 * Props: onClose, hbAtual, sexo ('M'|'F'), gestante (bool), pesoInicial (kg).
 */
export default function ModalFerroEV({ onClose, hbAtual, sexo, gestante, semanasGestacao = null, pesoInicial }) {
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
  const calc = pesoValido ? calcularDeficitFerroGanzoni({ sexo, peso: pesoNum, hb: hbAtual, gestante, semanasGestacao }) : null;
  const ferroGestacaoMg = calc ? (calc.ferroGestacaoMg || 0) : 0;
  const doseTotal = calc ? calc.deficitMg : 0;
  const hbAlvo = calc ? calc.hbAlvo : (sexo === 'M' ? 13.5 : (gestante ? 11.5 : 12.0));
  const deficit = Math.max(hbAlvo - Number(hbAtual), 0).toFixed(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-y-auto"
        style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="bg-red-700 text-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-bold">{"💉 Reposição de Ferro Endovenoso"}</h2>
          <p className="text-red-200 text-xs mt-1">{"Estimativa baseada na Fórmula de Ganzoni"}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{"Cálculo da Dose Total"}</p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{"Fórmula de Ganzoni:"}</span><br/>
              {"Dose (mg) = Peso × (Hb alvo − Hb atual) × 2,4 + 500"}
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
                  <p>{"• Peso: "}<strong>{pesoNum} kg</strong></p>
                  <p>{"• Hb atual: "}<strong>{hbAtual} g/dL</strong></p>
                  <p>{"• Hb alvo: "}<strong>{hbAlvo} g/dL</strong></p>
                  <p>{"• Déficit: "}<strong>{deficit} g/dL</strong></p>
                  {ferroGestacaoMg > 0 && (
                    <p>{"• Ferro p/ a gestação ("}{calc.semanasGestacao}{" sem): "}<strong>{"+"}{ferroGestacaoMg} mg</strong></p>
                  )}
                </div>
                <div className="bg-red-700 text-white rounded-lg px-4 py-2 text-center mt-2">
                  <p className="text-xs opacity-80">Dose Total Estimada</p>
                  <p className="text-2xl font-black">{doseTotal} mg</p>
                </div>
                {ferroGestacaoMg > 0 && (
                  <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 text-xs text-pink-900 mt-2 space-y-1">
                    <p className="font-semibold">{"🤰 Acréscimo gestacional"}</p>
                    <p>{"O concepto consome o ferro das reservas maternas de forma crescente — a maior parte no 3º trimestre. Por isso somamos ao protocolo um aporte proporcional às semanas de gestação (custo total da gravidez ≈ 1.000 mg de ferro até o termo)."}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 pt-1">{"Informe o peso do paciente para calcular a dose."}</p>
            )}
          </div>
          {pesoValido && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{"Receitas sugeridas (2)"}</p>
            <p className="text-xs text-gray-500" style={{ marginTop: '-4px' }}>{"A plataforma emite duas receitas — o paciente aplica conforme o acesso dele."}</p>
            {meds === null ? (
              <p className="text-sm text-gray-400">{"Carregando medicamentos..."}</p>
            ) : CLASSES_RECEITA.map(cl => {
              const med = meds.find(m => m.classe === cl.id);
              if (!med) return (
                <div key={cl.id} className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
                  <p className="font-semibold text-gray-700">{cl.rotulo}</p>
                  <p className="text-xs mt-1">{"Nenhuma marca configurada nesta classe (defina no painel admin → 💊 Medicamentos)."}</p>
                </div>
              );
              const r = calcReceita(doseTotal, med);
              return (
                <div key={cl.id} className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-1">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{cl.rotulo}</p>
                  <p className="text-xs text-gray-400">{cl.acesso}</p>
                  <p className="font-semibold text-gray-800 pt-1">{med.nome_comercial}
                    <span className="font-normal text-gray-500 text-xs">{" · "}{med.principio_ativo}</span></p>
                  {med.fabricante && <p className="text-xs text-gray-400">{"Fabricante: "}{med.fabricante}</p>}
                  <p>{"• Dose total: "}<strong>{doseTotal} mg</strong></p>
                  <p>{"• Frascos: "}<strong>{r.frascos}{" de "}{r.frasco} mg</strong></p>
                  <p>{"• Sessões: "}<strong>{r.sessoes}{" de até "}{r.maxSessao} mg</strong></p>
                  {med.diluicao && <p>{"• Diluir em "}<strong>{med.diluicao}</strong>{med.tempo_infusao ? <>{", infundir em "}<strong>{med.tempo_infusao}</strong></> : null}</p>}
                  {med.intervalo_sessoes && med.intervalo_sessoes !== '—' && <p>{"• Intervalo entre sessões: "}<strong>{med.intervalo_sessoes}</strong></p>}
                  {med.observacoes && <p className="text-xs text-gray-500 italic pt-1">{med.observacoes}</p>}
                </div>
              );
            })}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
              <p className="font-semibold">{"☀️ Vitamina D — Importante!"}</p>
              <p>{"A "}<strong>{"hipofosfatemia pós-reposição de ferro"}</strong>{" é um risco real, especialmente em pacientes com deficiência de vitamina D."}</p>
              <p>{"Idealmente, administre "}<strong>10.000 UI de vitamina D</strong>{" no dia anterior à primeira dose de ferro endovenoso."}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 space-y-2">
              <p className="font-semibold">{"⚠️ Precauções:"}</p>
              <p>{"• Ter disponível adrenalina e anti-histamínico"}</p>
              <p>{"• Observar o paciente por "}<strong>30 min</strong>{" após a infusão"}</p>
              <p>{"• Suspender imediatamente se sinais de reação alérgica"}</p>
              <p>{"• Não infundir com outros medicamentos na mesma via"}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 space-y-2">
              <p className="font-semibold">{"✅ Monitoramento:"}</p>
              <p>{"• Repetir hemograma após "}<strong>4 semanas</strong></p>
              <p>{"• Repetir ferritina e saturação após "}<strong>8 semanas</strong></p>
              <p>{"• Esperar elevação de Hb de "}<strong>{"1–2 g/dL"}</strong>{" por sessão de 200 mg"}</p>
            </div>
          </div>
          )}
          {pesoValido && (
          <p className="text-xs text-gray-400 text-center">
            {"* Dose final deve ser ajustada pelo médico assistente conforme resposta clínica."}
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
