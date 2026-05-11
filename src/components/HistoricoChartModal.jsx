import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea
} from 'recharts';

/**
 * HistoricoChartModal - 5 mini-graficos em loop do eritron do paciente.
 *
 * Props:
 *   cpf:        string (so digitos, ex "31020747008")
 *   avaliacoes: array de { data_coleta, hemoglobina, vcm, rdw, ferritina, sat_transf }
 *               (assume-se filtradas: todas tem os 5 parametros)
 *   sexo:       'M' | 'F'
 *   gestante:   boolean (so usado se sexo === 'F')
 *   onFechar:   callback ao fechar o modal
 */
export default function HistoricoChartModal({ cpf, avaliacoes, sexo, gestante, onFechar }) {
  const [indice, setIndice] = useState(0);

  // Faixas normais por sexo/gestante
  function getFaixaHb() {
    if (sexo === 'M') return [13.5, 17.5];
    if (gestante)     return [11.0, 15.5];
    return [12.0, 15.5];
  }
  function getFaixaFerritina() {
    return sexo === 'M' ? [24, 336] : [25, 150];
  }

  // Ordena por data_coleta (ASC) e prepara dados
  const dados = [...avaliacoes]
    .sort((a, b) => (a.data_coleta || '').localeCompare(b.data_coleta || ''))
    .map(av => {
      const d = String(av.data_coleta || '').split('-');
      const dataLabel = (d.length === 3) ? (d[2] + d[1] + d[0]) : '';
      return {
        data: dataLabel,
        hemoglobina: Number(av.hemoglobina),
        vcm:         Number(av.vcm),
        rdw:         Number(av.rdw),
        ferritina:   Number(av.ferritina),
        sat_transf:  Number(av.sat_transf),
      };
    });

  const configs = [
    { key: 'hemoglobina', label: 'Hemoglobina',         unit: 'g/dL',  cor: '#DC2626', dominio: [3, 23],   escala: 'linear', faixaNormal: getFaixaHb() },
    { key: 'ferritina',   label: 'Ferritina',           unit: 'ng/mL', cor: '#7C3AED', dominio: [1, 4000], escala: 'log',    faixaNormal: getFaixaFerritina() },
    { key: 'sat_transf',  label: 'Sat. Transferrina',   unit: '%',     cor: '#F59E0B', dominio: [1, 100],  escala: 'linear', faixaNormal: [20, 50] },
    { key: 'vcm',         label: 'VCM',                 unit: 'fL',    cor: '#0891B2', dominio: [35, 140], escala: 'linear', faixaNormal: [80, 100] },
    { key: 'rdw',         label: 'RDW-CV',              unit: '%',     cor: '#16A34A', dominio: [10, 50],  escala: 'linear', faixaNormal: [11.5, 15] },
  ];

  const cfg = configs[indice];

  function proximo() {
    setIndice(prev => (prev + 1) % configs.length);
  }

  const ticksLog = [1, 10, 100, 1000, 4000];
  const [faixaMin, faixaMax] = cfg.faixaNormal;

  // Label da faixa normal (Hb e Ferritina podem variar por sexo/gestante)
  let faixaLabel = `Normal: ${faixaMin}–${faixaMax} ${cfg.unit}`;
  if (cfg.key === 'hemoglobina' && gestante) faixaLabel += ' (gestante)';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.75)' }}
         onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold leading-tight" style={{ color: cfg.cor }}>
              {cfg.label} <span className="text-xs font-normal text-gray-500">({cfg.unit})</span>
            </h3>
            <p className="text-xs text-gray-500 tracking-wide">{cpf} · {indice + 1}/{configs.length}</p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2">
            ✕
          </button>
        </div>

        {/* Faixa normal label */}
        <div className="px-5 pt-2 pb-1">
          <p className="text-xs text-gray-500">
            <span style={{ display: 'inline-block', width: 10, height: 10, background: '#9CA3AF', opacity: 0.35, borderRadius: 2, marginRight: 6, verticalAlign: 'middle' }}></span>
            {faixaLabel}
          </p>
        </div>

        {/* Grafico */}
        <div className="px-3" style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                scale={cfg.escala}
                domain={cfg.dominio}
                ticks={cfg.escala === 'log' ? ticksLog : undefined}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                allowDataOverflow
              />
              <Tooltip
                formatter={(v) => [v + ' ' + cfg.unit, cfg.label]}
                labelStyle={{ color: '#374151', fontSize: 12 }}
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
              />
              {/* Faixa normal cinza translucida */}
              <ReferenceArea
                y1={faixaMin}
                y2={faixaMax}
                fill="#9CA3AF"
                fillOpacity={0.18}
                stroke="none"
                ifOverflow="extendDomain"
              />
              <Line
                type="monotone"
                dataKey={cfg.key}
                stroke={cfg.cor}
                strokeWidth={2.5}
                dot={{ r: 4, fill: cfg.cor }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Rodape: navegacao */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Toque na seta para o próximo parâmetro
          </div>
          <button
            onClick={proximo}
            className="bg-red-700 hover:bg-red-800 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors flex items-center gap-2">
            Próximo <span style={{ fontSize: '1.1rem' }}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
