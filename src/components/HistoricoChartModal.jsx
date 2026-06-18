import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea
} from 'recharts';

/**
 * HistoricoChartModal v2 - duas telas:
 *   G1 = Triagem    (Hb, VCM, RDW - mini-graficos empilhados)
 *   G2 = Aprofund.  (Ferritina, Sat. Transferrina - mini-graficos empilhados)
 *
 * Props:
 *   cpf:      string (so digitos)
 *   serie:    array de { data, hb, vcm, rdw, ferritina, sat, origem } ja ordenado
 *   sexo:     'M' | 'F'
 *   gestante: boolean
 *   onFechar: callback
 */
export default function HistoricoChartModal({ cpf, serie, sexo, gestante, onFechar }) {
  const [tela, setTela] = useState(1); // 1 = G1 (triagem), 2 = G2 (ferritina/sat)

  // ---------- Faixas normais ----------
  const faixaHb = (() => {
    if (sexo === 'M') return [13.5, 17.5];
    if (gestante)     return [11.0, 15.5];
    return [12.0, 15.5];
  })();
  const faixaVCM = [80, 100];
  const faixaRDW = [11.5, 15];
  const faixaFerritina = sexo === 'M' ? [24, 300] : [25, 150];
  const faixaSat = [20, 50];

  // ---------- Preparo dos dados ----------
  // Label do eixo X: DDMMAAAA compacto
  const fmtData = (iso) => {
    if (!iso) return '';
    const s = String(iso);
    // pode vir 'YYYY-MM-DD' ou timestamp ISO
    const datePart = s.split('T')[0];
    const p = datePart.split('-');
    if (p.length === 3) return p[2] + p[1] + p[0];
    return datePart;
  };

  const dadosG1 = (serie || []).map((p) => ({
    data: fmtData(p.data),
    hemoglobina: p.hb,
    vcm: p.vcm,
    rdw: p.rdw,
  }));

  const dadosG2 = (serie || [])
    .filter((p) => p.ferritina !== null || p.sat !== null)
    .map((p) => ({
      data: fmtData(p.data),
      ferritina: p.ferritina,
      sat: p.sat,
    }));

  // ---------- STATUS da evolucao ----------
  // Regra acordada: ESTAVEL / MELHORANDO / AGRAVADO.
  // Baseado no MOVIMENTO do analito principal de cada tela EM RELACAO A FAIXA NORMAL,
  // comparando as DUAS medicoes mais recentes. Assim vale tanto p/ anemia (Hb/ferritina
  // subindo rumo a faixa = melhora) quanto p/ sobrecarga (ferritina acima da faixa
  // caindo = melhora). Antes era um placeholder fixo "ESTAVEL" cinza, e por isso uma
  // queda GRAVE de Hb (ex.: 12,5 -> 6,7) aparecia como estavel.
  // Cortes (a validar pelo medico): Hb = 0,5 g/dL; Ferritina = 20% relativo.
  const ESTAVEL    = { rotulo: 'ESTÁVEL',    cor: '#6B7280' }; // cinza
  const MELHORANDO = { rotulo: 'MELHORANDO', cor: '#15803D' }; // verde
  const AGRAVADO   = { rotulo: 'AGRAVADO',   cor: '#B91C1C' }; // vermelho

  // Distancia do valor ate a faixa normal (0 se dentro dela).
  function distForaDaFaixa(v, lo, hi) {
    if (v < lo) return lo - v;
    if (v > hi) return v - hi;
    return 0;
  }

  function calcularStatus(dados, tipo) {
    // Analito principal de cada tela: G1 = Hemoglobina; G2 = Ferritina.
    const cfg = tipo === 'g1'
      ? { chave: 'hemoglobina', faixa: faixaHb,        ruido: 0.5,  rel: false }
      : { chave: 'ferritina',   faixa: faixaFerritina, ruido: 0.20, rel: true  };
    const vals = (dados || [])
      .map((d) => d[cfg.chave])
      .filter((v) => v !== null && v !== undefined && !isNaN(v));
    if (vals.length < 2) return ESTAVEL; // sem 2 medicoes nao ha variacao

    const anterior = vals[vals.length - 2];
    const atual    = vals[vals.length - 1];
    const [lo, hi] = cfg.faixa;
    const dAnt = distForaDaFaixa(anterior, lo, hi);
    const dAtu = distForaDaFaixa(atual, lo, hi);

    // Ambas as medicoes dentro da faixa normal -> estavel (variacao fisiologica).
    if (dAnt === 0 && dAtu === 0) return ESTAVEL;

    const aproximou = dAnt - dAtu; // > 0 = aproximou-se da faixa (melhora)
    const limiar = cfg.rel ? cfg.ruido * Math.max(anterior, 1) : cfg.ruido;
    if (aproximou >= limiar)  return MELHORANDO;
    if (aproximou <= -limiar) return AGRAVADO;
    return ESTAVEL;
  }
  const statusG1 = calcularStatus(dadosG1, 'g1');
  const statusG2 = calcularStatus(dadosG2, 'g2');

  // ---------- Sub-grafico reutilizavel ----------
  function MiniChart({ titulo, unit, dataKey, cor, dominio, escala, faixaNormal, dados, gestanteLabel }) {
    const [fMin, fMax] = faixaNormal;
    const ticksLog = [1, 10, 100, 1000, 4000];
    return (
      <div className="px-3 pb-2">
        <div className="flex items-baseline justify-between px-1 pb-1">
          <p className="text-xs font-bold" style={{ color: cor }}>
            {titulo} <span className="text-[10px] font-normal text-gray-500">({unit})</span>
          </p>
          <p className="text-[10px] text-gray-500">
            Normal: {fMin}-{fMax}{gestanteLabel ? ' (gestante)' : ''}
          </p>
        </div>
        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ top: 4, right: 18, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                angle={-25}
                textAnchor="end"
                height={36}
              />
              <YAxis
                scale={escala}
                domain={dominio}
                ticks={escala === 'log' ? ticksLog : undefined}
                tick={{ fontSize: 10, fill: '#6B7280' }}
                allowDataOverflow
                width={36}
              />
              <Tooltip
                formatter={(v) => [v + ' ' + unit, titulo]}
                labelStyle={{ color: '#374151', fontSize: 11 }}
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11 }}
              />
              <ReferenceArea
                y1={fMin}
                y2={fMax}
                fill="#9CA3AF"
                fillOpacity={0.18}
                stroke="none"
                ifOverflow="extendDomain"
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={cor}
                strokeWidth={2}
                dot={{ r: 3.5, fill: cor }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  const totalTelas = dadosG2.length >= 2 ? 2 : 1;
  const status = tela === 1 ? statusG1 : statusG2;
  const tituloTela = tela === 1 ? 'Triagem do Eritron' : 'Aprofundamento';

  function proximo() {
    // Tela 1 -> Tela 2. Tela 2 -> fecha o modal (sem loop de ida e volta).
    if (tela === 1 && totalTelas === 2) {
      setTela(2);
    } else {
      onFechar();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.75)' }}
         onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
           onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold leading-tight text-gray-800">
              {tituloTela}
            </h3>
            <p className="text-xs text-gray-500 tracking-wide">{cpf} {"\u00b7"} {tela}/{totalTelas}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
              style={{ background: status.cor + '22', color: status.cor, border: `1px solid ${status.cor}55` }}>
              {status.rotulo}
            </span>
            <button
              onClick={onFechar}
              aria-label="Fechar"
              className="w-8 h-8 rounded-full bg-red-700 hover:bg-red-800 text-white flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ fontFamily: 'Apple Color Emoji, Segoe UI Symbol, Noto Sans Symbols, sans-serif', lineHeight: 1 }}>
              {"\u2715"}
            </button>
          </div>
        </div>

        {/* Conteudo: G1 ou G2 */}
        {tela === 1 ? (
          <div className="py-2">
            <MiniChart
              titulo="Hemoglobina" unit="g/dL" dataKey="hemoglobina" cor="#DC2626"
              dominio={[3, 23]} escala="linear" faixaNormal={faixaHb}
              dados={dadosG1} gestanteLabel={sexo === 'F' && gestante}
            />
            <MiniChart
              titulo="VCM" unit="fL" dataKey="vcm" cor="#0891B2"
              dominio={[35, 140]} escala="linear" faixaNormal={faixaVCM}
              dados={dadosG1}
            />
            <MiniChart
              titulo="RDW-CV" unit="%" dataKey="rdw" cor="#16A34A"
              dominio={[10, 50]} escala="linear" faixaNormal={faixaRDW}
              dados={dadosG1}
            />
          </div>
        ) : (
          <div className="py-2">
            <MiniChart
              titulo="Ferritina" unit="ng/mL" dataKey="ferritina" cor="#7C3AED"
              dominio={[1, 4000]} escala="log" faixaNormal={faixaFerritina}
              dados={dadosG2}
            />
            <MiniChart
              titulo="Sat. Transferrina" unit="%" dataKey="sat" cor="#F59E0B"
              dominio={[1, 100]} escala="linear" faixaNormal={faixaSat}
              dados={dadosG2}
            />
          </div>
        )}

        {/* Rodape: navegacao */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
          <div className="text-[11px] text-gray-500">
            {totalTelas === 2
              ? (tela === 1 ? 'Proxima tela: Aprofundamento' : 'Fim do historico')
              : 'Sem dados de Ferritina/Sat para Aprofundamento'}
          </div>
          {totalTelas === 2 ? (
            <button
              onClick={proximo}
              className="bg-red-700 hover:bg-red-800 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors flex items-center gap-2">
              {tela === 1 ? (
                <>
                  <span>{"Pr\u00f3ximo"}</span>
                  <span style={{ fontSize: '1.1rem' }}>{"\u2192"}</span>
                </>
              ) : (
                <span>{"Fechar"}</span>
              )}
            </button>
          ) : (
            <button
              onClick={onFechar}
              className="bg-red-700 hover:bg-red-800 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors">
              {"Fechar"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}