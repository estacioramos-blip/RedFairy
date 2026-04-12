import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ── Paleta eritron ────────────────────────────────────────────────────────────
const eritronColor = {
  green:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Normal'   },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Atenção'  },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Moderado' },
  red:    { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Grave'    },
};

const obaColor = {
  grave:    { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
  moderado: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  leve:     { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400' },
  normal:   { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatarCPF(cpf) {
  if (!cpf) return '—';
  const d = String(cpf).replace(/\D/g, '').padStart(11, '0');
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function diasAtras(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  return diff;
}

function formatarData(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// ── Texto de solicitação médica (CFM) ─────────────────────────────────────────
function gerarSolicitacaoCFM(avaliacao, oba) {
  const sexo = avaliacao.sexo === 'M' ? 'masculino' : 'feminino';
  const hoje = new Date().toLocaleDateString('pt-BR');
  let texto = `SOLICITAÇÃO MÉDICA — ${hoje}\n\n`;
  texto += `Paciente do sexo ${sexo}, ${avaliacao.sexo === 'M' ? 'portador' : 'portadora'} de diagnóstico de ${avaliacao.diagnostico_label}`;
  if (avaliacao.bariatrica) texto += `, com histórico de cirurgia bariátrica`;
  texto += `.\n\n`;

  // Eritron
  texto += `AVALIAÇÃO DO ERITRON (${formatarData(avaliacao.data_coleta)}):\n`;
  texto += `• Ferritina: ${avaliacao.ferritina} ng/mL\n`;
  texto += `• Hemoglobina: ${avaliacao.hemoglobina} g/dL\n`;
  texto += `• VCM: ${avaliacao.vcm} fL\n`;
  texto += `• RDW: ${avaliacao.rdw}%\n`;
  texto += `• Saturação de Transferrina: ${avaliacao.sat_transf}%\n\n`;

  // Conduta
  const cor = avaliacao.diagnostico_color;
  if (cor === 'red' || cor === 'orange') {
    if (avaliacao.diagnostico_label?.toUpperCase().includes('FERRO')) {
      texto += `CONDUTA INDICADA:\nReposição de Ferro Endovenoso conforme Fórmula de Ganzoni.\nIniciar com Ferro Sacarato ou Carboximaltose Férrica, sob monitoramento laboratorial.\n\n`;
    } else if (avaliacao.diagnostico_label?.toUpperCase().includes('SANGRIA')) {
      texto += `CONDUTA INDICADA:\nSangria Terapêutica para redução da sobrecarga de ferro.\nMonitorar Hb, ferritina e saturação de transferrina antes de cada sessão.\n\n`;
    } else {
      texto += `CONDUTA INDICADA:\nAvaliação hematológica especializada. Investigação complementar conforme clínica.\n\n`;
    }
  }

  // OBA
  if (oba) {
    texto += `AVALIAÇÃO OBA — BARIÁTRICO (${oba.tipo_cirurgia}, ${oba.meses_pos_cirurgia} meses pós-cirurgia):\n`;
    const alertasGraves = oba.alertas?.filter(a => a.nivel === 'grave') || [];
    const alertasMod    = oba.alertas?.filter(a => a.nivel === 'moderado') || [];
    if (alertasGraves.length > 0) {
      texto += `\nAlertas Urgentes:\n`;
      alertasGraves.forEach(a => { texto += `• ${a.texto}\n`; });
    }
    if (alertasMod.length > 0) {
      texto += `\nAlertas de Atenção:\n`;
      alertasMod.forEach(a => { texto += `• ${a.texto}\n`; });
    }
    if (oba.examesComplementares?.length > 0) {
      texto += `\nExames Complementares Solicitados:\n`;
      oba.examesComplementares.forEach(ex => { texto += `• ${ex}\n`; });
    }
    texto += '\n';
  }

  texto += `Dr(a). ___________________________\nCRM: ___________________________\n`;
  return texto;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage({ onVoltar }) {
  const [aba, setAba] = useState('pacientes');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-700 text-white py-4 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onVoltar}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium transition-colors">
            ← Voltar
          </button>
          <h1 className="text-base font-bold">Painel Médico</h1>
          <div className="w-16" />
        </div>
        {/* Abas */}
        <div className="max-w-3xl mx-auto flex gap-2 mt-3">
          {[
            { id: 'pacientes', label: '👥 Pacientes' },
            { id: 'config',    label: '⚙️ Configurações' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setAba(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                aba === tab.id ? 'bg-white text-red-700' : 'bg-red-800 text-red-100 hover:bg-red-900'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {aba === 'pacientes' && <AbaPacientes />}
        {aba === 'config'    && <AbaConfig />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA: PACIENTES
// ─────────────────────────────────────────────────────────────────────────────
function AbaPacientes() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('avaliacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setAvaliacoes(data || []);
      setLoading(false);
    }
    carregar();
  }, []);

  // Agrupa por CPF (ou por id se sem CPF)
  const porCpf = {};
  avaliacoes.forEach(av => {
    const chave = av.cpf || `sem_cpf_${av.id}`;
    if (!porCpf[chave]) porCpf[chave] = [];
    porCpf[chave].push(av);
  });

  const grupos = Object.entries(porCpf)
    .map(([cpf, avs]) => ({
      cpf,
      avs: avs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      ultima: avs[0],
    }))
    .filter(g => {
      if (!busca) return true;
      const b = busca.toLowerCase();
      return (
        g.cpf.includes(busca) ||
        g.ultima.diagnostico_label?.toLowerCase().includes(b)
      );
    });

  if (pacienteSelecionado) {
    return (
      <FichaPaciente
        cpf={pacienteSelecionado}
        avaliacoes={porCpf[pacienteSelecionado] || []}
        onVoltar={() => setPacienteSelecionado(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por CPF ou diagnóstico..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <p className="text-xs text-gray-400 mt-2">
          {grupos.length} paciente{grupos.length !== 1 ? 's' : ''} · {avaliacoes.length} avaliação{avaliacoes.length !== 1 ? 'ões' : ''}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : grupos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhum paciente encontrado.</div>
      ) : (
        <div className="space-y-2">
          {grupos.map(({ cpf, avs, ultima }) => {
            const scheme = eritronColor[ultima.diagnostico_color] || eritronColor.yellow;
            const dias = diasAtras(ultima.created_at);
            const temOBA = ultima.bariatrica;
            return (
              <button key={cpf}
                onClick={() => setPacienteSelecionado(cpf)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-red-200 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-gray-700">
                        {cpf.startsWith('sem_cpf') ? 'Sem CPF' : formatarCPF(cpf)}
                      </span>
                      {temOBA && (
                        <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                          OBA
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {avs.length} avaliação{avs.length !== 1 ? 'ões' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">{ultima.diagnostico_label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Última: {formatarData(ultima.data_coleta)}
                      {dias !== null && ` · há ${dias} dia${dias !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${scheme.bg} ${scheme.text}`}>
                    {scheme.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FICHA DO PACIENTE
// ─────────────────────────────────────────────────────────────────────────────
function FichaPaciente({ cpf, avaliacoes, onVoltar }) {
  const [obaData, setObaData] = useState(null);
  const [loadingOba, setLoadingOba] = useState(false);
  const [modAberto, setModAberto] = useState(null);
  const [showSolicitacao, setShowSolicitacao] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const ultima = avaliacoes[0];

  useEffect(() => {
    if (!cpf || cpf.startsWith('sem_cpf') || !ultima?.bariatrica) return;
    setLoadingOba(true);
    supabase
      .from('oba_anamnese')
      .select('*')
      .eq('cpf', cpf.replace(/\D/g, ''))
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { setObaData(data); setLoadingOba(false); });
  }, [cpf]);

  function copiarSolicitacao() {
    const texto = gerarSolicitacaoCFM(ultima, null);
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    });
  }

  const scheme = eritronColor[ultima?.diagnostico_color] || eritronColor.yellow;

  // Monta resumo OBA para exibição (campos chave)
  const camposOba = obaData ? [
    { label: 'Cirurgia',         valor: obaData.tipo_cirurgia },
    { label: 'Tempo pós-op',     valor: obaData.meses_pos_cirurgia ? `${obaData.meses_pos_cirurgia} meses` : null },
    { label: 'Peso antes',       valor: obaData.peso_antes ? `${obaData.peso_antes} kg` : null },
    { label: 'Menor peso',       valor: obaData.peso_minimo_pos ? `${obaData.peso_minimo_pos} kg` : null },
    { label: 'Peso atual',       valor: obaData.peso_atual ? `${obaData.peso_atual} kg` : null },
    { label: 'Status glicêmico', valor: obaData.status_glicemico },
    { label: 'Status pressórico',valor: obaData.status_pressorico },
    { label: 'Status ósseo',     valor: obaData.status_osseo },
    { label: 'Status dental',    valor: obaData.status_dental },
    { label: 'Atividade',        valor: obaData.atividade_fisica?.join(', ') },
    { label: 'Compulsões',       valor: obaData.compulsoes?.join(', ') },
    { label: 'Acompanhamento',   valor: obaData.acompanhamento },
  ].filter(c => c.valor) : [];

  const examesOba = obaData ? [
    { label: 'B12',         valor: obaData.vitamina_b12,  unit: 'pg/mL' },
    { label: 'Vit. D',      valor: obaData.vitamina_d,    unit: 'ng/mL' },
    { label: 'Zinco',       valor: obaData.zinco,         unit: 'µg/dL' },
    { label: 'TSH',         valor: obaData.tsh,           unit: 'mUI/L' },
    { label: 'HbA1c',       valor: obaData.hb_glicada,    unit: '%'     },
    { label: 'Glicemia',    valor: obaData.glicemia,      unit: 'mg/dL' },
    { label: 'Insulina',    valor: obaData.insulina,      unit: 'µUI/mL'},
    { label: 'Triglicérides',valor: obaData.triglicerides,unit: 'mg/dL' },
    { label: 'AST',         valor: obaData.ast,           unit: 'U/L'   },
    { label: 'ALT',         valor: obaData.alt,           unit: 'U/L'   },
    { label: 'Gama-GT',     valor: obaData.gama_gt,       unit: 'U/L'   },
    { label: 'Creatinina',  valor: obaData.creatinina,    unit: 'mg/dL' },
    { label: 'Vit. A',      valor: obaData.vitamina_a,    unit: 'µg/dL' },
    { label: 'Tiamina',     valor: obaData.tiamina,       unit: 'nmol/L'},
    { label: 'Folatos',     valor: obaData.folatos,       unit: 'ng/mL' },
    { label: 'PSA',         valor: obaData.psa_total,     unit: 'ng/mL' },
    { label: 'Estradiol',   valor: obaData.estradiol,     unit: 'pg/mL' },
  ].filter(c => c.valor !== null && c.valor !== undefined) : [];

  return (
    <div className="space-y-4">

      {/* Header ficha */}
      <div className="flex items-center gap-3">
        <button onClick={onVoltar}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
          ← Lista
        </button>
        <div>
          <h2 className="font-bold text-gray-800 text-base">
            {cpf.startsWith('sem_cpf') ? 'Paciente sem CPF' : formatarCPF(cpf)}
          </h2>
          <p className="text-xs text-gray-400">{avaliacoes.length} avaliação{avaliacoes.length !== 1 ? 'ões' : ''} registrada{avaliacoes.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Última avaliação eritron */}
      <div className={`rounded-2xl border-2 ${scheme.bg === 'bg-red-100' ? 'border-red-300' : scheme.bg === 'bg-orange-100' ? 'border-orange-300' : scheme.bg === 'bg-yellow-100' ? 'border-yellow-300' : 'border-green-300'} overflow-hidden shadow-sm`}>
        <div className={`${scheme.bg} px-5 py-3 flex items-center justify-between`}>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Última avaliação — {formatarData(ultima.data_coleta)}</p>
            <p className={`font-bold text-base ${scheme.text} mt-0.5`}>{ultima.diagnostico_label}</p>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-full ${scheme.bg} ${scheme.text} border-2 ${scheme.bg === 'bg-red-100' ? 'border-red-400' : scheme.bg === 'bg-orange-100' ? 'border-orange-400' : scheme.bg === 'bg-yellow-100' ? 'border-yellow-400' : 'border-green-400'}`}>
            {scheme.label}
          </span>
        </div>
        <div className="bg-white px-5 py-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Ferritina', valor: ultima.ferritina, unit: 'ng/mL' },
              { label: 'Hemoglobina', valor: ultima.hemoglobina, unit: 'g/dL' },
              { label: 'VCM', valor: ultima.vcm, unit: 'fL' },
              { label: 'RDW', valor: ultima.rdw, unit: '%' },
              { label: 'Sat. Transf.', valor: ultima.sat_transf, unit: '%' },
              { label: 'Dias exame', valor: diasAtras(ultima.data_coleta), unit: 'dias' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-2">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="font-bold text-gray-800 text-sm">{item.valor ?? '—'}</p>
                <p className="text-xs text-gray-400">{item.unit}</p>
              </div>
            ))}
          </div>

          {/* Flags clínicas */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {ultima.bariatrica    && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">Bariátrica</span>}
            {ultima.vegetariano   && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Vegetariano</span>}
            {ultima.gestante      && <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">Gestante</span>}
            {ultima.hipermenorreia && <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">Hipermenorreia</span>}
            {ultima.aspirina      && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">Aspirina</span>}
            {ultima.vitamina_b12  && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">B12</span>}
            {ultima.ferro_oral    && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">Ferro oral</span>}
          </div>
        </div>
      </div>

      {/* Histórico */}
      {avaliacoes.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Histórico de Avaliações</p>
          <div className="space-y-2">
            {avaliacoes.slice(1).map((av, i) => {
              const sc = eritronColor[av.diagnostico_color] || eritronColor.yellow;
              return (
                <div key={i} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs text-gray-400">{formatarData(av.data_coleta)}</p>
                    <p className="text-sm font-medium text-gray-700">{av.diagnostico_label}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>Hb: {av.hemoglobina}</p>
                    <p>Ferr: {av.ferritina}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dados OBA */}
      {ultima.bariatrica && (
        <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 overflow-hidden shadow-sm">
          <div className="bg-purple-700 text-white px-5 py-3">
            <p className="text-xs uppercase tracking-widest opacity-70">Avaliação OBA</p>
            <p className="font-bold text-base mt-0.5">
              {obaData ? `${obaData.tipo_cirurgia} · ${obaData.meses_pos_cirurgia} meses` : 'Dados Bariátricos'}
            </p>
          </div>

          {loadingOba && (
            <div className="p-4 text-center text-purple-500 text-sm">Carregando dados OBA...</div>
          )}

          {!loadingOba && !obaData && (
            <div className="p-4 text-center text-purple-400 text-sm">
              Anamnese OBA não preenchida para este paciente.
            </div>
          )}

          {obaData && (
            <div className="p-4 space-y-4">

              {/* Resumo anamnese */}
              {camposOba.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Anamnese</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {camposOba.map((c, i) => (
                      <div key={i}>
                        <span className="text-xs text-purple-400">{c.label}: </span>
                        <span className="text-xs font-semibold text-purple-800">{c.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exames OBA */}
              {examesOba.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Exames</p>
                  <div className="grid grid-cols-3 gap-2">
                    {examesOba.map((ex, i) => (
                      <div key={i} className="bg-white rounded-lg p-2 text-center border border-purple-100">
                        <p className="text-xs text-gray-400">{ex.label}</p>
                        <p className="font-bold text-gray-800 text-sm">{ex.valor}</p>
                        <p className="text-xs text-gray-400">{ex.unit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medicamentos e compulsões */}
              {obaData.medicamentos?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Medicamentos</p>
                  <div className="flex flex-wrap gap-1">
                    {obaData.medicamentos.map((m, i) => (
                      <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {obaData.emagrecedores && Object.entries(obaData.emagrecedores).filter(([,v]) => v === 'ESTOU USANDO').length > 0 && (
                <div>
                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Emagrecedores em uso</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(obaData.emagrecedores).filter(([,v]) => v === 'ESTOU USANDO').map(([k]) => (
                      <span key={k} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{k}</span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* Botões de ação */}
      <div className="space-y-3">
        <button
          onClick={() => setShowSolicitacao(!showSolicitacao)}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
          📋 {showSolicitacao ? 'Ocultar' : 'Gerar'} Solicitação Médica (CFM)
        </button>

        {showSolicitacao && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Solicitação Médica</p>
              <button
                onClick={copiarSolicitacao}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                  copiado ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>
                {copiado ? '✅ Copiado!' : '📋 Copiar'}
              </button>
            </div>
            <pre className="p-4 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
              {gerarSolicitacaoCFM(ultima, null)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA: CONFIGURAÇÕES
// ─────────────────────────────────────────────────────────────────────────────
function AbaConfig() {
  const [valor, setValor] = useState('');
  const [pixChave, setPixChave] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    async function carregar() {
      const { data: valConfig } = await supabase
        .from('config').select('valor').eq('chave', 'valor_solicitacao_medica').single();
      const { data: pixConfig } = await supabase
        .from('config').select('valor').eq('chave', 'pix_chave').single();
      setValor(valConfig?.valor || '');
      setPixChave(pixConfig?.valor || '');
      setLoading(false);
    }
    carregar();
  }, []);

  async function salvar() {
    setSalvando(true); setSucesso('');
    await supabase.from('config').upsert(
      { chave: 'valor_solicitacao_medica', valor, descricao: 'Valor em R$ da solicitação médica via Pix' },
      { onConflict: 'chave' }
    );
    await supabase.from('config').upsert(
      { chave: 'pix_chave', valor: pixChave, descricao: 'Chave Pix para recebimento de solicitações médicas' },
      { onConflict: 'chave' }
    );
    setSalvando(false);
    setSucesso('Configurações salvas com sucesso!');
    setTimeout(() => setSucesso(''), 3000);
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400";

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-1">Solicitação Médica</h2>
        <p className="text-sm text-gray-400">Configure o valor e a chave Pix para recebimento.</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-4">Carregando...</p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Valor da Solicitação Médica (R$)</label>
            <input type="number" step="0.01" min="0" value={valor}
              onChange={e => setValor(e.target.value)} placeholder="Ex: 50.00" className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">Valor único cobrado para emissão de qualquer solicitação médica.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Chave Pix (KlipBit)</label>
            <input type="text" value={pixChave}
              onChange={e => setPixChave(e.target.value)}
              placeholder="Cole aqui a chave Pix ou o código copia-e-cola" className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">E-mail, CPF, telefone, chave aleatória ou código copia-e-cola do KlipBit.</p>
          </div>

          {pixChave && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview do QR Code</p>
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixChave)}`}
                  alt="Preview QR Code"
                  className="rounded-xl border border-gray-200"
                  width={160} height={160}
                />
              </div>
              <p className="text-xs text-gray-400 text-center break-all">{pixChave}</p>
            </div>
          )}

          {sucesso && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 text-sm font-medium">
              ✅ {sucesso}
            </div>
          )}

          <button onClick={salvar} disabled={salvando}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </>
      )}
    </div>
  );
}
