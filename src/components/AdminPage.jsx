import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calcularDeficitFerroGanzoni, calcReceita } from '../engine/ferroProtocol';

// Credencial do admin (CRM + token de sessão) para as RPCs de escrita protegidas.
function credAdmin() {
  try {
    return { p_crm: localStorage.getItem('medico_crm') || '', p_token: localStorage.getItem('medico_token') || '' };
  } catch (e) { return { p_crm: '', p_token: '' }; }
}

const eritronColor = {
  green:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Normal'   },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: "Aten\u00e7\u00e3o"  },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Moderado' },
  red:    { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Grave'    },
};

const obaColor = {
  grave:    { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
  moderado: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  leve:     { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400' },
  normal:   { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
};

function formatarCPF(cpf) {
  if (!cpf) return "\u2014";
  const d = String(cpf).replace(/\D/g, '').padStart(11, '0');
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function diasAtras(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  return diff;
}

function formatarData(dateStr) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// Indicação de ferro EV: diagnóstico grave/moderado, ferropriva, e NÃO sobrecarga.
function indicaFerroEV(avaliacao) {
  const cor = avaliacao.diagnostico_color;
  const label = (avaliacao.diagnostico_label || '').toUpperCase();
  return (cor === 'red' || cor === 'orange') && label.includes('FERRO') && !label.includes('SOBRECARGA');
}

// Monta a conduta de ferro EV com as DUAS marcas ativas do catálogo (DEC-007),
// já com a dose de Ganzoni (se houver peso) convertida em frascos/sessões.
function montarCondutaFerro(avaliacao, medsAtivos) {
  const calc = calcularDeficitFerroGanzoni({
    sexo: avaliacao.sexo, peso: avaliacao.peso, hb: avaliacao.hemoglobina, gestante: !!avaliacao.gestante,
  });
  const rotulo = { alta_dose: 'ALTA DOSE', dose_fracionada: 'DOSE FRACIONADA' };
  const acesso = { alta_dose: 'plano de saúde / centro de infusão / compra', dose_fracionada: 'sacarato — disponível no SUS' };

  let t = `CONDUTA INDICADA — REPOSIÇÃO DE FERRO ENDOVENOSO (Fórmula de Ganzoni):\n`;
  t += calc
    ? `Déficit estimado: ${calc.deficitMg} mg (peso ${calc.peso} kg, Hb ${calc.hbAtual} g/dL, alvo ${calc.hbAlvo} g/dL).\n`
    : `Peso não informado — calcular a dose: peso × (Hb alvo − Hb atual) × 2,4 + 500.\n`;
  t += `A plataforma sugere DUAS opções, conforme o acesso do paciente:\n`;

  let n = 0;
  for (const classe of ['alta_dose', 'dose_fracionada']) {
    const med = (medsAtivos || []).find(m => m.classe === classe);
    if (!med) continue;
    n++;
    t += `\n${n}) ${rotulo[classe]} — ${med.nome_comercial} (${med.principio_ativo}${med.fabricante ? ', ' + med.fabricante : ''}):\n`;
    t += `   Para: ${acesso[classe]}.\n`;
    if (calc) {
      const r = calcReceita(calc.deficitMg, med);
      t += `   ${r.frascos} frasco(s) de ${r.frasco} mg · ${r.sessoes} sessão(ões) de até ${r.maxSessao} mg.\n`;
    }
    const inf = [];
    if (med.diluicao) inf.push(`diluir em ${med.diluicao}`);
    if (med.tempo_infusao) inf.push(`infundir em ${med.tempo_infusao}`);
    if (med.intervalo_sessoes && med.intervalo_sessoes !== '—') inf.push(`intervalo ${med.intervalo_sessoes}`);
    if (inf.length) t += `   ${inf.join('; ')}.\n`;
    if (med.observacoes) t += `   Obs.: ${med.observacoes}\n`;
  }
  if (n === 0) t += `\n(Nenhuma marca ativa no catálogo — configurar no painel admin → Medicamentos.)\n`;
  t += `\nMonitoramento: repetir hemograma em 4 semanas; ferritina e saturação em 8 semanas.\n\n`;
  return t;
}

function gerarSolicitacaoCFM(avaliacao, oba, medsAtivos = []) {
  const sexo = avaliacao.sexo === 'M' ? 'masculino' : 'feminino';
  const hoje = new Date().toLocaleDateString('pt-BR');
  let texto = `SOLICITA\u00c7\u00c3O M\u00c9DICA \u2014 ${hoje}\n\n`;
  texto += `Paciente do sexo ${sexo}, ${avaliacao.sexo === 'M' ? 'portador' : 'portadora'} de diagn\u00f3stico de ${avaliacao.diagnostico_label}`;
  if (avaliacao.bariatrica) texto += `, com hist\u00f3rico de cirurgia bari\u00e1trica`;
  texto += `.\n\n`;

  texto += `AVALIA\u00c7\u00c3O DO ERITRON (${formatarData(avaliacao.data_coleta)}):\n`;
  texto += `\u2022 Ferritina: ${avaliacao.ferritina} ng/mL\n`;
  texto += `\u2022 Hemoglobina: ${avaliacao.hemoglobina} g/dL\n`;
  texto += `\u2022 VCM: ${avaliacao.vcm} fL\n`;
  texto += `\u2022 RDW: ${avaliacao.rdw}%\n`;
  texto += `\u2022 Satura\u00e7\u00e3o de Transferrina: ${avaliacao.sat_transf}%\n\n`;

  const cor = avaliacao.diagnostico_color;
  if (cor === 'red' || cor === 'orange') {
    if (indicaFerroEV(avaliacao)) {
      texto += montarCondutaFerro(avaliacao, medsAtivos);
    } else if (avaliacao.diagnostico_label?.toUpperCase().includes('SANGRIA')) {
      texto += `CONDUTA INDICADA:\nSangria Terap\u00eautica para redu\u00e7\u00e3o da sobrecarga de ferro.\nMonitorar Hb, ferritina e satura\u00e7\u00e3o de transferrina antes de cada sess\u00e3o.\n\n`;
    } else {
      texto += `CONDUTA INDICADA:\nAvalia\u00e7\u00e3o hematol\u00f3gica especializada. Investiga\u00e7\u00e3o complementar conforme cl\u00ednica.\n\n`;
    }
  }

  if (oba) {
    texto += `AVALIA\u00c7\u00c3O OBA \u2014 BARI\u00c1TRICO (${oba.tipo_cirurgia}, ${oba.meses_pos_cirurgia} meses p\u00f3s-cirurgia):\n`;
    const alertasGraves = oba.alertas?.filter(a => a.nivel === 'grave') || [];
    const alertasMod    = oba.alertas?.filter(a => a.nivel === 'moderado') || [];
    if (alertasGraves.length > 0) {
      texto += `\nAlertas Urgentes:\n`;
      alertasGraves.forEach(a => { texto += `\u2022 ${a.texto}\n`; });
    }
    if (alertasMod.length > 0) {
      texto += `\nAlertas de Aten\u00e7\u00e3o:\n`;
      alertasMod.forEach(a => { texto += `\u2022 ${a.texto}\n`; });
    }
    if (oba.examesComplementares?.length > 0) {
      texto += `\nExames Complementares Solicitados:\n`;
      oba.examesComplementares.forEach(ex => { texto += `\u2022 ${ex}\n`; });
    }
    texto += '\n';
  }

  texto += `Dr(a). ___________________________\nCRM: ___________________________\n`;
  return texto;
}

export default function AdminPage({ onVoltar }) {
  const [aba, setAba] = useState('pacientes');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-700 text-white py-4 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onVoltar}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium transition-colors">
            {"\u2190 Voltar"}
          </button>
          <h1 className="text-base font-bold">{"Painel M\u00e9dico"}</h1>
          <div className="w-16" />
        </div>
        <div className="max-w-3xl mx-auto flex gap-2 mt-3">
          {[
            { id: 'pacientes',    label: "\ud83d\udc65 Pacientes" },
            { id: 'medicamentos', label: "\ud83d\udc8a Medicamentos" },
            { id: 'suplementos',  label: "\ud83e\uddec Suplementos" },
            { id: 'medicos',      label: "\ud83e\ude7a M\u00e9dicos" },
            { id: 'config',       label: "\u2699\ufe0f Configura\u00e7\u00f5es" },
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
        {aba === 'pacientes'    && <AbaPacientes />}
        {aba === 'medicamentos' && <AbaMedicamentos />}
        {aba === 'suplementos'  && <AbaSuplementos />}
        {aba === 'medicos'      && <AbaMedicos />}
        {aba === 'config'       && <AbaConfig />}
      </div>
    </div>
  );
}

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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder={"Buscar por CPF ou diagn\u00f3stico..."}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <p className="text-xs text-gray-400 mt-2">
          {grupos.length}{" paciente"}{grupos.length !== 1 ? 's' : ''}{" \u00b7 "}{avaliacoes.length}{" avalia\u00e7\u00e3o"}{avaliacoes.length !== 1 ? "\u00f5es" : ''}
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
                        {avs.length}{" avalia\u00e7\u00e3o"}{avs.length !== 1 ? "\u00f5es" : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">{ultima.diagnostico_label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {"\u00daltima: "}{formatarData(ultima.data_coleta)}
                      {dias !== null && ` \u00b7 h\u00e1 ${dias} dia${dias !== 1 ? 's' : ''}`}
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

function FichaPaciente({ cpf, avaliacoes, onVoltar }) {
  const [obaData, setObaData] = useState(null);
  const [loadingOba, setLoadingOba] = useState(false);
  const [modAberto, setModAberto] = useState(null);
  const [showSolicitacao, setShowSolicitacao] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [medsAtivos, setMedsAtivos] = useState([]);
  const [contabilizado, setContabilizado] = useState(false);
  const ultima = avaliacoes[0];

  // Marcas ativas do catálogo (1 por classe) — para a conduta de ferro EV.
  useEffect(() => {
    supabase.from('medicamentos').select('*').eq('ativo', true)
      .then(({ data }) => setMedsAtivos(data || []));
  }, []);

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
    const texto = gerarSolicitacaoCFM(ultima, null, medsAtivos);
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
      // Contabiliza a prescrição (cota do fabricante) só quando há indicação de
      // ferro EV e marcas ativas — uma vez por ficha aberta.
      if (!contabilizado && indicaFerroEV(ultima) && medsAtivos.length) {
        setContabilizado(true);
        medsAtivos.forEach(m => {
          supabase.from('medicamentos')
            .update({ prescricoes_emitidas: (m.prescricoes_emitidas || 0) + 1 })
            .eq('id', m.id);
        });
      }
    });
  }

  const scheme = eritronColor[ultima?.diagnostico_color] || eritronColor.yellow;

  const camposOba = obaData ? [
    { label: 'Cirurgia',         valor: obaData.tipo_cirurgia },
    { label: "Tempo p\u00f3s-op",     valor: obaData.meses_pos_cirurgia ? `${obaData.meses_pos_cirurgia} meses` : null },
    { label: 'Peso antes',       valor: obaData.peso_antes ? `${obaData.peso_antes} kg` : null },
    { label: 'Menor peso',       valor: obaData.peso_minimo_pos ? `${obaData.peso_minimo_pos} kg` : null },
    { label: 'Peso atual',       valor: obaData.peso_atual ? `${obaData.peso_atual} kg` : null },
    { label: "Status glic\u00eamico", valor: obaData.status_glicemico },
    { label: "Status press\u00f3rico",valor: obaData.status_pressorico },
    { label: "Status \u00f3sseo",     valor: obaData.status_osseo },
    { label: 'Status dental',    valor: obaData.status_dental },
    { label: 'Atividade',        valor: obaData.atividade_fisica?.join(', ') },
    { label: "Compuls\u00f5es",       valor: obaData.compulsoes?.join(', ') },
    { label: 'Acompanhamento',   valor: obaData.acompanhamento },
  ].filter(c => c.valor) : [];

  const examesOba = obaData ? [
    { label: 'B12',         valor: obaData.vitamina_b12,  unit: 'pg/mL' },
    { label: 'Vit. D',      valor: obaData.vitamina_d,    unit: 'ng/mL' },
    { label: 'Zinco',       valor: obaData.zinco,         unit: "\u00b5g/dL" },
    { label: 'TSH',         valor: obaData.tsh,           unit: 'mUI/L' },
    { label: 'HbA1c',       valor: obaData.hb_glicada,    unit: '%'     },
    { label: 'Glicemia',    valor: obaData.glicemia,      unit: 'mg/dL' },
    { label: 'Insulina',    valor: obaData.insulina,      unit: "\u00b5UI/mL"},
    { label: "Triglic\u00e9rides",valor: obaData.triglicerides,unit: 'mg/dL' },
    { label: 'AST',         valor: obaData.ast,           unit: 'U/L'   },
    { label: 'ALT',         valor: obaData.alt,           unit: 'U/L'   },
    { label: 'Gama-GT',     valor: obaData.gama_gt,       unit: 'U/L'   },
    { label: 'Creatinina',  valor: obaData.creatinina,    unit: 'mg/dL' },
    { label: 'Vit. A',      valor: obaData.vitamina_a,    unit: "\u00b5g/dL" },
    { label: 'Tiamina',     valor: obaData.tiamina,       unit: 'nmol/L'},
    { label: 'Folatos',     valor: obaData.folatos,       unit: 'ng/mL' },
    { label: 'PSA',         valor: obaData.psa_total,     unit: 'ng/mL' },
    { label: 'Estradiol',   valor: obaData.estradiol,     unit: 'pg/mL' },
  ].filter(c => c.valor !== null && c.valor !== undefined) : [];

  return (
    <div className="space-y-4">

      <div className="flex items-center gap-3">
        <button onClick={onVoltar}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
          {"\u2190 Lista"}
        </button>
        <div>
          <h2 className="font-bold text-gray-800 text-base">
            {cpf.startsWith('sem_cpf') ? 'Paciente sem CPF' : formatarCPF(cpf)}
          </h2>
          <p className="text-xs text-gray-400">{avaliacoes.length}{" avalia\u00e7\u00e3o"}{avaliacoes.length !== 1 ? "\u00f5es" : ''}{" registrada"}{avaliacoes.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className={`rounded-2xl border-2 ${scheme.bg === 'bg-red-100' ? 'border-red-300' : scheme.bg === 'bg-orange-100' ? 'border-orange-300' : scheme.bg === 'bg-yellow-100' ? 'border-yellow-300' : 'border-green-300'} overflow-hidden shadow-sm`}>
        <div className={`${scheme.bg} px-5 py-3 flex items-center justify-between`}>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{"\u00daltima avalia\u00e7\u00e3o \u2014 "}{formatarData(ultima.data_coleta)}</p>
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
                <p className="font-bold text-gray-800 text-sm">{item.valor ?? "\u2014"}</p>
                <p className="text-xs text-gray-400">{item.unit}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {ultima.bariatrica    && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{"Bari\u00e1trica"}</span>}
            {ultima.vegetariano   && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Vegetariano</span>}
            {ultima.gestante      && <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">Gestante</span>}
            {ultima.hipermenorreia && <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">Hipermenorreia</span>}
            {ultima.aspirina      && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">Aspirina</span>}
            {ultima.vitamina_b12  && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">B12</span>}
            {ultima.ferro_oral    && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">Ferro oral</span>}
          </div>
        </div>
      </div>

      {avaliacoes.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{"Hist\u00f3rico de Avalia\u00e7\u00f5es"}</p>
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
                    <p>{"Hb: "}{av.hemoglobina}</p>
                    <p>{"Ferr: "}{av.ferritina}</p>
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

      {ultima.bariatrica && (
        <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 overflow-hidden shadow-sm">
          <div className="bg-purple-700 text-white px-5 py-3">
            <p className="text-xs uppercase tracking-widest opacity-70">{"Avalia\u00e7\u00e3o OBA"}</p>
            <p className="font-bold text-base mt-0.5">
              {obaData ? `${obaData.tipo_cirurgia} \u00b7 ${obaData.meses_pos_cirurgia} meses` : "Dados Bari\u00e1tricos"}
            </p>
          </div>

          {loadingOba && (
            <div className="p-4 text-center text-purple-500 text-sm">Carregando dados OBA...</div>
          )}

          {!loadingOba && !obaData && (
            <div className="p-4 text-center text-purple-400 text-sm">
              {"Anamnese OBA n\u00e3o preenchida para este paciente."}
            </div>
          )}

          {obaData && (
            <div className="p-4 space-y-4">

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

      <div className="space-y-3">
        <button
          onClick={() => setShowSolicitacao(!showSolicitacao)}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
          {"\ud83d\udccb "}{showSolicitacao ? 'Ocultar' : 'Gerar'}{" Solicita\u00e7\u00e3o M\u00e9dica (CFM)"}
        </button>

        {showSolicitacao && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{"Solicita\u00e7\u00e3o M\u00e9dica"}</p>
              <button
                onClick={copiarSolicitacao}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                  copiado ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>
                {copiado ? "\u2705 Copiado!" : "\ud83d\udccb Copiar"}
              </button>
            </div>
            <pre className="p-4 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
              {gerarSolicitacaoCFM(ultima, null, medsAtivos)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}

function AbaConfig() {
  const [valor, setValor] = useState('');
  const [valorDoc, setValorDoc] = useState('');
  const [pixChave, setPixChave] = useState('');
  const [valorAnuidade, setValorAnuidade] = useState('');
  const [comissaoUsd, setComissaoUsd] = useState('');
  const [cotacaoDolar, setCotacaoDolar] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    async function carregar() {
      const { data: valConfig } = await supabase
        .from('config').select('valor').eq('chave', 'valor_solicitacao_medica').single();
      const { data: docConfig } = await supabase
        .from('config').select('valor').eq('chave', 'valor_documento_medico').single();
      const { data: pixConfig } = await supabase
        .from('config').select('valor').eq('chave', 'pix_chave').single();
      const { data: anuConfig } = await supabase
        .from('config').select('valor').eq('chave', 'valor_anuidade').maybeSingle();
      const { data: comConfig } = await supabase
        .from('config').select('valor').eq('chave', 'comissao_usd_por_conversao').maybeSingle();
      const { data: cotConfig } = await supabase
        .from('config').select('valor').eq('chave', 'cotacao_dolar').maybeSingle();
      setValor(valConfig?.valor || '');
      setValorDoc(docConfig?.valor || '');
      setPixChave(pixConfig?.valor || '');
      setValorAnuidade(anuConfig?.valor || '149.90');
      setComissaoUsd(comConfig?.valor || '10');
      setCotacaoDolar(cotConfig?.valor || '');
      setLoading(false);
    }
    carregar();
  }, []);

  async function salvar() {
    setSalvando(true); setSucesso('');
    const cred = credAdmin();
    const itens = [
      { p_chave: 'valor_solicitacao_medica', p_valor: valor,    p_descricao: "Valor em R$ da solicita\u00e7\u00e3o m\u00e9dica via Pix" },
      { p_chave: 'valor_documento_medico',   p_valor: valorDoc, p_descricao: "Valor em R$ da gera\u00e7\u00e3o de documento m\u00e9dico (prescri\u00e7\u00e3o/pedido de exames)" },
      { p_chave: 'pix_chave',                p_valor: pixChave, p_descricao: "Chave Pix para recebimento de solicita\u00e7\u00f5es m\u00e9dicas" },
      { p_chave: 'valor_anuidade',           p_valor: valorAnuidade, p_descricao: "Valor em R$ da anuidade do paciente (exibido na landing e cobrado no Pix de cadastro)" },
      { p_chave: 'comissao_usd_por_conversao', p_valor: comissaoUsd,  p_descricao: "Valor em DÓLAR pago ao médico por paciente convertido" },
      { p_chave: 'cotacao_dolar',            p_valor: cotacaoDolar,  p_descricao: "Cotação USD->BRL para converter a comissão dos médicos em reais" },
    ];
    for (const it of itens) {
      const { data, error } = await supabase.rpc('salvar_config', { ...cred, ...it });
      if (error || (data && !data.ok)) {
        setSalvando(false);
        setSucesso("\u26a0\ufe0f Erro ao salvar (sem permiss\u00e3o de admin?).");
        setTimeout(() => setSucesso(''), 4000);
        return;
      }
    }
    setSalvando(false);
    setSucesso("Configura\u00e7\u00f5es salvas com sucesso!");
    setTimeout(() => setSucesso(''), 3000);
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400";

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-1">{"Solicita\u00e7\u00e3o M\u00e9dica"}</h2>
        <p className="text-sm text-gray-400">Configure o valor e a chave Pix para recebimento.</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-4">Carregando...</p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">{"Valor da Solicita\u00e7\u00e3o M\u00e9dica (R$)"}</label>
            <input type="number" step="0.01" min="0" value={valor}
              onChange={e => setValor(e.target.value)} placeholder="Ex: 50.00" className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">{"Valor \u00fanico cobrado para emiss\u00e3o de qualquer solicita\u00e7\u00e3o m\u00e9dica."}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">{"Valor da Gera\u00e7\u00e3o de Documento M\u00e9dico (R$)"}</label>
            <input type="number" step="0.01" min="0" value={valorDoc}
              onChange={e => setValorDoc(e.target.value)} placeholder="Ex: 29.90" className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">{"Valor cobrado por documento m\u00e9dico gerado via WhatsApp (prescri\u00e7\u00e3o, pedido de exames)."}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">{"Valor da Anuidade do Paciente (R$)"}</label>
            <input type="number" step="0.01" min="0" value={valorAnuidade}
              onChange={e => setValorAnuidade(e.target.value)} placeholder="Ex: 149.90" className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">{"Exibido na landing e cobrado no Pix do cadastro do paciente. O c\u00f3digo Pix \u00e9 gerado automaticamente com este valor."}</p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-base font-semibold text-gray-700 mb-1">{"Comiss\u00e3o de Afiliados (4DOC)"}</h3>
            <p className="text-sm text-gray-400 mb-3">{"Valor pago ao m\u00e9dico por paciente convertido e a cota\u00e7\u00e3o do d\u00f3lar para o equivalente em reais."}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{"Comiss\u00e3o por convers\u00e3o (US$)"}</label>
                <input type="number" step="0.01" min="0" value={comissaoUsd}
                  onChange={e => setComissaoUsd(e.target.value)} placeholder="Ex: 10" className={inputClass} />
                <p className="text-xs text-gray-400 mt-1">{"Em d\u00f3lar, por paciente triado + cadastrado + pago."}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{"Cota\u00e7\u00e3o do d\u00f3lar (R$/US$)"}</label>
                <input type="number" step="0.0001" min="0" value={cotacaoDolar}
                  onChange={e => setCotacaoDolar(e.target.value)} placeholder="Ex: 5.40" className={inputClass} />
                <p className="text-xs text-gray-400 mt-1">{"Atualize com a cota\u00e7\u00e3o atual. Usada para mostrar a comiss\u00e3o em R$."}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Chave Pix (KlipBit)</label>
            <input type="text" value={pixChave}
              onChange={e => setPixChave(e.target.value)}
              placeholder={"Cole aqui a chave Pix ou o c\u00f3digo copia-e-cola"} className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">{"E-mail, CPF, telefone, chave aleat\u00f3ria ou c\u00f3digo copia-e-cola do KlipBit."}</p>
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
              {"\u2705 "}{sucesso}
            </div>
          )}

          <button onClick={salvar} disabled={salvando}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
            {salvando ? 'Salvando...' : "Salvar configura\u00e7\u00f5es"}
          </button>
        </>
      )}
    </div>
  );
}

// \u2500\u2500 Aba Medicamentos (DEC-007) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Cat\u00e1logo de ferro EV. Sempre 2 receitas por caso: a plataforma usa a marca
// ATIVA de cada classe (alta_dose / dose_fracionada). Aqui o admin escolhe a
// marca ativa por classe (radio) e edita os par\u00e2metros de infus\u00e3o de cada droga.
const CLASSES_MED = [
  { id: 'alta_dose',       titulo: "\ud83d\udfe5 Alta dose", sub: "1\u20132 infus\u00f5es \u00b7 plano / centro de infus\u00e3o / compra" },
  { id: 'dose_fracionada', titulo: "\ud83d\udfe6 Dose fracionada", sub: "sacarato \u00b7 ~200 mg/sess\u00e3o \u00b7 acess\u00edvel no SUS" },
];
const CAMPOS_MED = [
  { key: 'fabricante',         label: 'Fabricante',         tipo: 'text' },
  { key: 'concentracao_mg_ml', label: 'Conc. (mg/mL)',      tipo: 'number' },
  { key: 'frascos_mg',         label: 'Frascos (mg)',       tipo: 'text' },
  { key: 'dose_max_sessao_mg', label: 'Dose m\u00e1x/sess\u00e3o (mg)',tipo: 'number' },
  { key: 'diluicao',           label: 'Dilui\u00e7\u00e3o',           tipo: 'text' },
  { key: 'tempo_infusao',      label: 'Tempo de infus\u00e3o',   tipo: 'text' },
  { key: 'intervalo_sessoes',  label: 'Intervalo sess\u00f5es',  tipo: 'text' },
];

function AbaMedicamentos() {
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from('medicamentos')
        .select('*')
        .order('classe', { ascending: true })
        .order('nome_comercial', { ascending: true });
      if (error) setErro("N\u00e3o foi poss\u00edvel carregar o cat\u00e1logo. A migration migrate_add_medicamentos.sql j\u00e1 foi aplicada?");
      setMeds(data || []);
      setLoading(false);
    }
    carregar();
  }, []);

  function setCampo(id, key, valor) {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, [key]: valor } : m));
  }

  // Ativa uma marca e desativa as demais da MESMA classe (uma ativa por classe).
  function ativar(id, classe) {
    setMeds(prev => prev.map(m =>
      m.classe === classe ? { ...m, ativo: m.id === id } : m
    ));
  }

  async function salvar() {
    setSalvando(true); setSucesso(''); setErro('');
    const cred = credAdmin();
    const num = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
    for (const m of meds) {
      const { data, error } = await supabase.rpc('salvar_medicamento', {
        ...cred, p_id: m.id, p_dados: {
          fabricante: m.fabricante || null,
          concentracao_mg_ml: num(m.concentracao_mg_ml),
          frascos_mg: m.frascos_mg || null,
          dose_max_sessao_mg: num(m.dose_max_sessao_mg),
          diluicao: m.diluicao || null,
          tempo_infusao: m.tempo_infusao || null,
          intervalo_sessoes: m.intervalo_sessoes || null,
          cota_total: num(m.cota_total),
          observacoes: m.observacoes || null,
          ativo: !!m.ativo,
        },
      });
      if (error || (data && !data.ok)) {
        setErro("Erro ao salvar: " + (error?.message || data?.erro || 'sem permissão de admin'));
        setSalvando(false); return;
      }
    }
    setSalvando(false);
    setSucesso("Cat\u00e1logo salvo com sucesso!");
    setTimeout(() => setSucesso(''), 3000);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Carregando cat\u00e1logo...</div>;

  const inputClass = "w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400";

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-700">{"Cat\u00e1logo de Ferro Endovenoso"}</h2>
        <p className="text-sm text-gray-400 mt-1">
          {"Cada caso com indica\u00e7\u00e3o de ferro EV gera "}<strong>duas receitas</strong>{" \u2014 uma por classe. "}
          {"Marque a marca "}<strong>ativa</strong>{" de cada classe (a que a plataforma vai prescrever) e ajuste os par\u00e2metros."}
        </p>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center text-red-700 text-sm font-medium">
          {"\u26a0\ufe0f "}{erro}
        </div>
      )}

      {CLASSES_MED.map(cl => {
        const doClasse = meds.filter(m => m.classe === cl.id);
        const ativaNome = doClasse.find(m => m.ativo)?.nome_comercial;
        return (
          <div key={cl.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <p className="font-bold text-gray-700 text-sm">{cl.titulo}</p>
              <p className="text-xs text-gray-400">{cl.sub}</p>
              <p className="text-xs mt-1">
                {ativaNome
                  ? <span className="text-green-700 font-bold">{"Ativa: "}{ativaNome}</span>
                  : <span className="text-red-500 font-bold">{"\u26a0\ufe0f Nenhuma marca ativa nesta classe"}</span>}
              </p>
            </div>
            <div className="p-3 space-y-3">
              {doClasse.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">{"Nenhum medicamento nesta classe."}</p>
              )}
              {doClasse.map(m => (
                <div key={m.id}
                  className={`rounded-xl border-2 p-3 transition-all ${m.ativo ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="radio" name={`ativa_${cl.id}`} checked={!!m.ativo}
                      onChange={() => ativar(m.id, m.classe)}
                      className="w-4 h-4 cursor-pointer" style={{ accentColor: '#16a34a' }} />
                    <div className="min-w-0">
                      <span className="font-bold text-gray-800 text-sm">{m.nome_comercial}</span>
                      <span className="text-xs text-gray-400 ml-2">{m.principio_ativo}</span>
                    </div>
                    {m.ativo && <span className="ml-auto text-xs bg-green-600 text-white font-bold px-2 py-0.5 rounded-full">ATIVA</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CAMPOS_MED.map(c => (
                      <div key={c.key}>
                        <label className="block text-xs text-gray-500 mb-0.5">{c.label}</label>
                        <input type={c.tipo} value={m[c.key] ?? ''} step={c.tipo === 'number' ? 'any' : undefined}
                          onChange={e => setCampo(m.id, c.key, e.target.value)} className={inputClass} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-0.5">{"Observa\u00e7\u00f5es"}</label>
                    <textarea value={m.observacoes ?? ''} rows={2}
                      onChange={e => setCampo(m.id, 'observacoes', e.target.value)}
                      className={inputClass + ' resize-none'} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{"Prescri\u00e7\u00f5es emitidas: "}<strong>{m.prescricoes_emitidas ?? 0}</strong></p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {sucesso && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 text-sm font-medium">
          {"\u2705 "}{sucesso}
        </div>
      )}

      {meds.length > 0 && (
        <button onClick={salvar} disabled={salvando}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
          {salvando ? 'Salvando...' : "Salvar cat\u00e1logo"}
        </button>
      )}
    </div>
  );
}

// \u2500\u2500 Aba Suplementos (DEC-010) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Cat\u00e1logo de suplementos orais/injet\u00e1veis (polivitam\u00ednicos, B12, ferro oral).
// Uma marca ATIVA por categoria (alavanca 4DOC) \u2014 radio escolhe qual a plataforma
// prescreve. RLS est\u00e1 OFF nesta tabela, ent\u00e3o a escrita \u00e9 direta (update().eq()).
const CATEGORIAS_SUPL = [
  { id: 'polivitaminico_bariatrico', titulo: "\ud83e\uddec Polivitam\u00ednico bari\u00e1trico", sub: "multivitam\u00ednico p\u00f3s-cirurgia bari\u00e1trica" },
  { id: 'b12_injetavel',  titulo: "\ud83d\udc89 B12 injet\u00e1vel",  sub: "cianocobalamina / combos B1+B6+B12 \u2014 IM" },
  { id: 'b12_sublingual', titulo: "\ud83d\udc45 B12 sublingual", sub: "mecobalamina \u2014 absor\u00e7\u00e3o pela mucosa" },
  { id: 'b12_oral',       titulo: "\ud83d\udc8a B12 oral",       sub: "cianocobalamina \u2014 reposi\u00e7\u00e3o diet\u00e9tica" },
  { id: 'ferro_oral',     titulo: "\ud83e\ude78 Ferro oral",     sub: "sais de ferro \u2014 uma linha por marca" },
];
const CAMPOS_SUPL = [
  { key: 'fabricante',      label: 'Fabricante' },
  { key: 'principio_ativo', label: 'Princ\u00edpio ativo' },
  { key: 'concentracao',    label: 'Concentra\u00e7\u00e3o' },
  { key: 'posologia',       label: 'Posologia' },
  { key: 'via',             label: 'Via' },
  { key: 'apresentacao',    label: 'Apresenta\u00e7\u00e3o' },
];

function AbaSuplementos() {
  const [supls, setSupls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from('suplementos')
        .select('*')
        .order('categoria', { ascending: true })
        .order('nome_comercial', { ascending: true });
      if (error) setErro("N\u00e3o foi poss\u00edvel carregar o cat\u00e1logo. As migrations migrate_suplementos.sql / migrate_suplementos_b12_ferro.sql j\u00e1 foram aplicadas?");
      setSupls(data || []);
      setLoading(false);
    }
    carregar();
  }, []);

  function setCampo(id, key, valor) {
    setSupls(prev => prev.map(s => s.id === id ? { ...s, [key]: valor } : s));
  }

  // Ativa uma marca e desativa as demais da MESMA categoria (uma ativa por categoria).
  function ativar(id, categoria) {
    setSupls(prev => prev.map(s =>
      s.categoria === categoria ? { ...s, ativo: s.id === id } : s
    ));
  }

  async function salvar() {
    setSalvando(true); setSucesso(''); setErro('');
    const cred = credAdmin();
    for (const s of supls) {
      const { data, error } = await supabase.rpc('salvar_suplemento', {
        ...cred, p_id: s.id, p_dados: {
          fabricante: s.fabricante || null,
          principio_ativo: s.principio_ativo || null,
          concentracao: s.concentracao || null,
          posologia: s.posologia || null,
          via: s.via || null,
          apresentacao: s.apresentacao || null,
          composicao: s.composicao || null,
          indicacao: s.indicacao || null,
          observacoes: s.observacoes || null,
          ativo: !!s.ativo,
        },
      });
      if (error || (data && !data.ok)) {
        setErro("Erro ao salvar: " + (error?.message || data?.erro || 'sem permiss\u00e3o de admin'));
        setSalvando(false); return;
      }
    }
    setSalvando(false);
    setSucesso("Cat\u00e1logo de suplementos salvo com sucesso!");
    setTimeout(() => setSucesso(''), 3000);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Carregando cat\u00e1logo...</div>;

  const inputClass = "w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400";

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-700">{"Cat\u00e1logo de Suplementos"}</h2>
        <p className="text-sm text-gray-400 mt-1">
          {"Marque a marca "}<strong>ativa</strong>{" de cada categoria (a que a plataforma vai sugerir) e ajuste os dados cl\u00ednicos. "}
          {"Cada categoria tem uma \u00fanica marca ativa."}
        </p>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center text-red-700 text-sm font-medium">
          {"\u26a0\ufe0f "}{erro}
        </div>
      )}

      {CATEGORIAS_SUPL.map(cat => {
        const daCategoria = supls.filter(s => s.categoria === cat.id);
        const ativaNome = daCategoria.find(s => s.ativo)?.nome_comercial;
        return (
          <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <p className="font-bold text-gray-700 text-sm">{cat.titulo}</p>
              <p className="text-xs text-gray-400">{cat.sub}</p>
              <p className="text-xs mt-1">
                {ativaNome
                  ? <span className="text-green-700 font-bold">{"Ativa: "}{ativaNome}</span>
                  : <span className="text-red-500 font-bold">{"\u26a0\ufe0f Nenhuma marca ativa nesta categoria"}</span>}
              </p>
            </div>
            <div className="p-3 space-y-3">
              {daCategoria.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">{"Nenhum suplemento nesta categoria."}</p>
              )}
              {daCategoria.map(s => (
                <div key={s.id}
                  className={`rounded-xl border-2 p-3 transition-all ${s.ativo ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="radio" name={`ativa_${cat.id}`} checked={!!s.ativo}
                      onChange={() => ativar(s.id, s.categoria)}
                      className="w-4 h-4 cursor-pointer" style={{ accentColor: '#16a34a' }} />
                    <div className="min-w-0">
                      <span className="font-bold text-gray-800 text-sm">{s.nome_comercial}</span>
                      <span className="text-xs text-gray-400 ml-2">{s.principio_ativo}</span>
                    </div>
                    {s.ativo && <span className="ml-auto text-xs bg-green-600 text-white font-bold px-2 py-0.5 rounded-full">ATIVA</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CAMPOS_SUPL.map(c => (
                      <div key={c.key}>
                        <label className="block text-xs text-gray-500 mb-0.5">{c.label}</label>
                        <input type="text" value={s[c.key] ?? ''}
                          onChange={e => setCampo(s.id, c.key, e.target.value)} className={inputClass} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-0.5">{"Composi\u00e7\u00e3o"}</label>
                    <textarea value={s.composicao ?? ''} rows={2}
                      onChange={e => setCampo(s.id, 'composicao', e.target.value)}
                      className={inputClass + ' resize-none'} />
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-0.5">{"Indica\u00e7\u00e3o (para quem / quando)"}</label>
                    <textarea value={s.indicacao ?? ''} rows={2}
                      onChange={e => setCampo(s.id, 'indicacao', e.target.value)}
                      className={inputClass + ' resize-none'} />
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-0.5">{"Observa\u00e7\u00f5es"}</label>
                    <textarea value={s.observacoes ?? ''} rows={2}
                      onChange={e => setCampo(s.id, 'observacoes', e.target.value)}
                      className={inputClass + ' resize-none'} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{"Prescri\u00e7\u00f5es emitidas: "}<strong>{s.prescricoes_emitidas ?? 0}</strong></p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {sucesso && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 text-sm font-medium">
          {"\u2705 "}{sucesso}
        </div>
      )}

      {supls.length > 0 && (
        <button onClick={salvar} disabled={salvando}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
          {salvando ? 'Salvando...' : "Salvar cat\u00e1logo"}
        </button>
      )}
    </div>
  );
}

// \u2500\u2500 Aba M\u00e9dicos (DEC-011) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Lista os m\u00e9dicos cadastrados com regi\u00e3o (por UF), status de afiliado e
// estat\u00edsticas: n\u00ba de pacientes triados e n\u00ba convertidos (cadastraram + pagaram,
// atribu\u00eddos ao 1\u00ba m\u00e9dico que triou). n_convertidos \u00e9 o "cr\u00e9dito" da fase 1.
const UF_REGIAO = {
  AC:'Norte', AP:'Norte', AM:'Norte', PA:'Norte', RO:'Norte', RR:'Norte', TO:'Norte',
  AL:'Nordeste', BA:'Nordeste', CE:'Nordeste', MA:'Nordeste', PB:'Nordeste',
  PE:'Nordeste', PI:'Nordeste', RN:'Nordeste', SE:'Nordeste',
  DF:'Centro-Oeste', GO:'Centro-Oeste', MT:'Centro-Oeste', MS:'Centro-Oeste',
  ES:'Sudeste', MG:'Sudeste', RJ:'Sudeste', SP:'Sudeste',
  PR:'Sul', RS:'Sul', SC:'Sul',
};
function regiaoDe(uf) {
  return UF_REGIAO[(uf || '').toUpperCase().trim()] || 'N\u00e3o informada';
}

const fmtUsd = (n) => 'US$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtBrl = (n) => 'R$ '  + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function AbaMedicos() {
  const [medicos, setMedicos] = useState([]);
  const [comissaoUsd, setComissaoUsd] = useState(0);
  const [cotacao, setCotacao] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [liquidando, setLiquidando] = useState('');

  async function carregar() {
    const { data, error } = await supabase.rpc('admin_listar_medicos', credAdmin());
    if (error) setErro("N\u00e3o foi poss\u00edvel carregar. A migration migrate_admin_medicos.sql j\u00e1 foi aplicada?");
    else if (data && !data.ok) setErro(data.erro || 'Sem permiss\u00e3o de admin.');
    else {
      setErro('');
      setMedicos(data?.medicos || []);
      setComissaoUsd(Number(data?.comissao_usd) || 0);
      setCotacao(Number(data?.cotacao_dolar) || 0);
    }
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function liquidar(m) {
    const n = m.creditos_pendentes || 0;
    if (!n) return;
    if (!window.confirm(`Marcar ${n} comiss\u00e3o(\u00f5es) de ${m.nome || m.crm} como PAGA(s)? (${fmtUsd(n * comissaoUsd)})`)) return;
    setLiquidando(m.crm);
    const { data, error } = await supabase.rpc('admin_liquidar_comissao', { ...credAdmin(), p_medico_crm: m.crm });
    setLiquidando('');
    if (error || (data && !data.ok)) { window.alert('Erro ao liquidar: ' + (error?.message || data?.erro || 'sem permiss\u00e3o')); return; }
    await carregar();
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Carregando m\u00e9dicos...</div>;

  const termo = busca.trim().toLowerCase();
  const filtrados = !termo ? medicos : medicos.filter(m =>
    (m.nome || '').toLowerCase().includes(termo) ||
    (m.crm || '').toLowerCase().includes(termo) ||
    (m.uf || '').toLowerCase().includes(termo) ||
    regiaoDe(m.uf).toLowerCase().includes(termo)
  );

  const totalAfiliados = medicos.filter(m => m.afiliado).length;
  const porRegiao = {};
  medicos.forEach(m => { const r = regiaoDe(m.uf); porRegiao[r] = (porRegiao[r] || 0) + 1; });
  const totalPendentes = medicos.reduce((s, m) => s + (m.creditos_pendentes || 0), 0);
  const totalUsdPend = totalPendentes * comissaoUsd;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-700">{"M\u00e9dicos cadastrados"}</h2>
        <p className="text-sm text-gray-400 mt-1">
          {"Regi\u00e3o (por UF), status de afiliado 4DOC e "}
          <strong>{"comiss\u00e3o"}</strong>{" ("}{fmtUsd(comissaoUsd)}{" por paciente convertido)."}
        </p>
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          <span className="bg-gray-100 rounded-full px-3 py-1 font-medium text-gray-700">{medicos.length}{" m\u00e9dico(s)"}</span>
          <span className="bg-green-100 rounded-full px-3 py-1 font-medium text-green-700">{totalAfiliados} afiliado(s)</span>
          <span className="bg-amber-100 rounded-full px-3 py-1 font-medium text-amber-700">
            A pagar: {fmtUsd(totalUsdPend)}{cotacao ? ` \u2248 ${fmtBrl(totalUsdPend * cotacao)}` : ''}
          </span>
          {Object.entries(porRegiao).sort((a,b)=>b[1]-a[1]).map(([r,n]) => (
            <span key={r} className="bg-red-50 rounded-full px-3 py-1 font-medium text-red-700">{r}: {n}</span>
          ))}
        </div>
        {!cotacao && (
          <p className="text-xs text-amber-600 mt-2">{"\u26a0\ufe0f Cota\u00e7\u00e3o do d\u00f3lar n\u00e3o definida \u2014 configure em Configura\u00e7\u00f5es para ver os valores em R$."}</p>
        )}
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center text-red-700 text-sm font-medium">
          {"\u26a0\ufe0f "}{erro}
        </div>
      )}

      {!erro && (
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder={"Buscar por nome, CRM, UF ou regi\u00e3o..."}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
      )}

      {!erro && filtrados.length === 0 && (
        <p className="text-center text-gray-400 py-8 text-sm">{"Nenhum m\u00e9dico encontrado."}</p>
      )}

      {filtrados.map(m => {
        const pend = m.creditos_pendentes || 0;
        const pagos = m.creditos_pagos || 0;
        const usdPend = pend * comissaoUsd;
        return (
        <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-gray-800">
                {m.nome || <span className="text-gray-400 italic">sem nome</span>}
                {m.is_admin && <span className="ml-2 text-xs bg-gray-800 text-white font-bold px-2 py-0.5 rounded-full">ADMIN</span>}
              </p>
              <p className="text-sm text-gray-500">
                {"CRM "}{m.crm}{" \u00b7 "}{regiaoDe(m.uf)}{m.cep ? `${" \u00b7 CEP "}${m.cep}` : ''}
              </p>
              {(m.celular || m.email) && (
                <p className="text-xs text-gray-400 mt-0.5">{[m.celular, m.email].filter(Boolean).join(' \u00b7 ')}</p>
              )}
            </div>
            <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${m.afiliado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {m.afiliado ? 'Afiliado 4DOC' : 'Perfil incompleto'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
              <p className="text-2xl font-extrabold text-gray-700">{m.n_triados}</p>
              <p className="text-xs text-gray-500">triados</p>
            </div>
            <div className="bg-red-50 rounded-xl px-3 py-2 text-center">
              <p className="text-2xl font-extrabold text-red-700">{m.n_convertidos}</p>
              <p className="text-xs text-red-500">convertidos</p>
            </div>
            <div className="bg-amber-50 rounded-xl px-3 py-2 text-center">
              <p className="text-2xl font-extrabold text-amber-700">{pend}</p>
              <p className="text-xs text-amber-600">a pagar</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <span className="font-semibold text-gray-700">{"Comiss\u00e3o a pagar: "}</span>
              <span className="font-bold text-amber-700">{fmtUsd(usdPend)}</span>
              {cotacao ? <span className="text-gray-500">{" \u2248 "}{fmtBrl(usdPend * cotacao)}</span> : null}
              {pagos > 0 && <span className="text-xs text-gray-400 ml-2">{"(j\u00e1 pago: "}{fmtUsd(pagos * comissaoUsd)}{")"}</span>}
              {m.pix_chave
                ? <p className="text-xs text-gray-500 mt-0.5">{"Pix: "}<span className="font-mono break-all">{m.pix_chave}</span></p>
                : <p className="text-xs text-amber-600 mt-0.5">{"Sem chave Pix cadastrada."}</p>}
            </div>
            {pend > 0 && (
              <button onClick={() => liquidar(m)} disabled={liquidando === m.crm}
                className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                {liquidando === m.crm ? 'Liquidando...' : 'Marcar como pago'}
              </button>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
