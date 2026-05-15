import { useState, useEffect, useRef} from 'react';import { triagemEritron } from '../engine/decisionEngine'
import logo from '../assets/logo.png'

import { supabase } from '../lib/supabase';
import HistoricoChartModal from './HistoricoChartModal';
/**
 * TriagemModal — popup inicial de triagem do eritron.
 *
 * Props:
 *   modoMedico:       boolean — se true, exibe campo CPF (medico digita do paciente)
 *   isDemoPaciente:   boolean — se true (modo paciente DEMO sem login), exibe CPF
 *   onConcluir:       function(resultado, inputs) — chamada apos avaliar com sucesso
 *   onFechar:         function() — usuario fechou sem avaliar (vai p/ form completo)
 */
export default function TriagemModal({ modoMedico = false, isDemoPaciente = false, onConcluir, onFechar }) {
  const [inputs, setInputs] = useState({
    cpf: '',
    sexo: '',
    gestante: false,
    bariatrica: false,
    semanas_gestacao: '',
    dataNascimento: '',
    hemoglobina: '',
    vcm: '',
    rdw: '',
  })
  // __CPF_CONHECIDO_V1__
  const [pacienteConhecido, setPacienteConhecido] = useState(null);
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  // __HEMOGRAMA_SEAMLESS_V1__
  // Etapa do hemograma: 1=Hb ativo, 2=VCM ativo, 3=RDW ativo, 4=todos confirmados
  const [etapaHemograma, setEtapaHemograma] = useState(1);
  const timerHemogramaRef = useRef(null);
  const refHbHemograma = useRef(null);
  const refVcmHemograma = useRef(null);
  const refRdwHemograma = useRef(null);
  // Refs do inicio seamless (CPF, DN, Sexo)
  const refCpfInput = useRef(null);
  const refDnInput = useRef(null);
  const refSexoSelect = useRef(null);
  // Etapa inicio: 1=CPF, 2=DN, 3=Sexo, 4=DN_completo (libera demais)
  const [etapaInicio, setEtapaInicio] = useState(1);
  // __HISTORICO_BUSCA_V1__
  const [historicoBuscando, setHistoricoBuscando] = useState(false);
  const [historicoMsg, setHistoricoMsg] = useState('');
  const [historicoData, setHistoricoData] = useState(null);
  const [erros, setErros] = useState({})

  // Mostrar CPF se eh medico OU se eh paciente demo
  const mostrarCPF = modoMedico || isDemoPaciente

  // Frase dinamica
  const fraseAbertura = modoMedico
    ? 'Como está a hemoglobina do seu paciente?'
    : 'Como está a sua hemoglobina?'

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    let v = type === 'checkbox' ? checked : value
    if (name === 'dataNascimento' && typeof v === 'string') {
      const digits = v.replace(/\D/g, '').slice(0, 8)
      if (digits.length <= 2) v = digits
      else if (digits.length <= 4) v = digits.slice(0,2) + '/' + digits.slice(2)
      else v = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4)
    }
    // Decimais clinicos: aceita virgula, salva com ponto
    if (['hemoglobina', 'vcm', 'rdw'].includes(name) && typeof v === 'string') {
      v = v.replace(',', '.')
    }
    setInputs(prev => ({ ...prev, [name]: v }))
    if (erros[name]) setErros(prev => ({ ...prev, [name]: null }))
  }

  function formatarCPF(valor) {
    return valor
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4')
  }

  // __B2_SINC_INPUTS__
  useEffect(() => {
    if (!pacienteConhecido || pacienteConhecido === 'BLOQUEADO') return;
    const reval = revalidaGestante(pacienteConhecido);
    // Preenche sexo e bariatrica (escondidos do form)
    setInputs(prev => ({
      ...prev,
      sexo: pacienteConhecido.sexo || prev.sexo,
      bariatrica: !!pacienteConhecido.bariatrica,
    }));
    if (reval.gestanteAtual) {
      setInputs(prev => ({
        ...prev,
        gestante: true,
        semanas_gestacao: reval.semanas !== null ? String(reval.semanas) : prev.semanas_gestacao,
      }));
    } else if (pacienteConhecido.gestante) {
      setInputs(prev => ({ ...prev, gestante: false, semanas_gestacao: '' }));
    }
  }, [pacienteConhecido]);

  useEffect(() => {
    if (!modoMedico) return;
    const digits = String(inputs.cpf || '').replace(/\D/g, '');
    if (digits.length === 11) {
      buscarCpfConhecido(digits);
    } else {
      setPacienteConhecido(null);
    }
  }, [inputs.cpf, modoMedico]);

  function validarCPF(cpf) {
    const c = cpf.replace(/\D/g, '')
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
    let s = 0
    for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i)
    let d1 = (s * 10) % 11
    if (d1 === 10) d1 = 0
    if (d1 !== parseInt(c[9])) return false
    s = 0
    for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i)
    let d2 = (s * 10) % 11
    if (d2 === 10) d2 = 0
    return d2 === parseInt(c[10])
  }

  function validar() {
    const errors = {}
    let idadeCalc = null
    let dataNascimentoISO = null
    if (mostrarCPF) {
      if (!inputs.cpf || !inputs.cpf.trim()) errors.cpf = 'Informe o CPF'
      else if (!validarCPF(inputs.cpf)) errors.cpf = 'CPF inválido'
    }
    if (!inputs.sexo) errors.sexo = 'Selecione o sexo'
    // Validacao da data de nascimento (DD/MM/AAAA) + calculo de idade
    // __B2_PULAR_VALIDACAO_DN__
    // Se paciente conhecido tem data_nascimento, pula a validacao do DN do form
    if (pacienteConhecido && pacienteConhecido !== 'BLOQUEADO' && pacienteConhecido.data_nascimento) {
      const [a, m, d] = String(pacienteConhecido.data_nascimento).split('-').map(Number);
      const hoje = new Date();
      let idade = hoje.getFullYear() - a;
      const mDiff = hoje.getMonth() - (m - 1);
      if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < d)) idade--;
      dataNascimentoISO = pacienteConhecido.data_nascimento;
      idadeCalc = idade;
    } else {
    const dn = String(inputs.dataNascimento || '').trim()
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dn)) {
      errors.dataNascimento = 'Use o formato DD/MM/AAAA'
    } else {
      const [d, m, a] = dn.split('/').map(Number)
      const dt = new Date(a, m - 1, d)
      const valida = dt && dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d
      if (!valida) {
        errors.dataNascimento = 'Data invalida'
      } else if (a < 1900) {
        errors.dataNascimento = 'Verifique o ano de nascimento'
      } else if (dt > new Date()) {
        errors.dataNascimento = 'Data nao pode ser no futuro'
      } else {
        const hoje = new Date()
        let idade = hoje.getFullYear() - a
        const mDiff = hoje.getMonth() - (m - 1)
        if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < d)) idade--
        if (idade < 12) {
          errors.dataNascimento = 'O RedFairy ainda nao atende criancas menores de 12 anos. Os valores de referencia do eritron pediatrico sao diferentes dos do adulto e exigem um modulo especifico que esta em desenvolvimento. Em breve!'
        } else if (idade > 100) {
          errors.dataNascimento = 'Verifique a data de nascimento'
        } else {
          idadeCalc = idade
          dataNascimentoISO = `${a}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        }
      }
    }
    }
    if (!inputs.hemoglobina) errors.hemoglobina = 'Obrigatório'
    if (!inputs.vcm) errors.vcm = 'Obrigatório'
    if (!inputs.rdw) errors.rdw = 'Obrigatório'
    if (inputs.sexo === 'F' && inputs.gestante && !inputs.semanas_gestacao) {
      errors.semanas_gestacao = 'Informe as semanas'
    }
    return { errors, idadeCalc, dataNascimentoISO }
  }

  function handleAvaliar() {
    const { errors, idadeCalc, dataNascimentoISO } = validar()
    if (Object.keys(errors).length > 0) {
      setErros(errors)
      return
    }
    const inputsNumericos = {
      ...inputs,
      idade: idadeCalc,
      data_nascimento: dataNascimentoISO,
      hemoglobina: Number(inputs.hemoglobina),
      vcm: Number(inputs.vcm),
      rdw: Number(inputs.rdw),
      semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
    }
    const resultado = triagemEritron(inputsNumericos)
    onConcluir(resultado, inputsNumericos)
  }

  async function buscarCpfConhecido(cpfDigits) {
    setBuscandoCpf(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('sexo, data_nascimento, bariatrica, gestante, semanas_gestacao_triagem, data_triagem_gestacao')
      .eq('cpf', cpfDigits)
      .maybeSingle();
    const { count: nTriagens } = await supabase
      .from('triagens')
      .select('*', { count: 'exact', head: true })
      .eq('cpf', cpfDigits);
    setBuscandoCpf(false);
    if (!profile && (nTriagens || 0) >= 3) {
      setPacienteConhecido('BLOQUEADO');
      return;
    }
    if (profile) {
      setPacienteConhecido({
        origem: 'profile',
        sexo: profile.sexo,
        data_nascimento: profile.data_nascimento,
        bariatrica: !!profile.bariatrica,
        gestante: !!profile.gestante,
        semanas_gestacao_triagem: profile.semanas_gestacao_triagem,
        data_triagem_gestacao: profile.data_triagem_gestacao,
        semanas_gestacao: null,
        dum: null,
        created_at: null,
      });
      return;
    }
    if ((nTriagens || 0) > 0) {
      const { data: triagem } = await supabase
        .from('triagens')
        .select('sexo, data_nascimento, bariatrica, gestante, semanas_gestacao, dum, created_at')
        .eq('cpf', cpfDigits)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (triagem) {
        setPacienteConhecido({
          origem: 'triagem',
          sexo: triagem.sexo,
          data_nascimento: triagem.data_nascimento,
          bariatrica: !!triagem.bariatrica,
          gestante: !!triagem.gestante,
          semanas_gestacao_triagem: null,
          data_triagem_gestacao: null,
          semanas_gestacao: triagem.semanas_gestacao,
          dum: triagem.dum,
          created_at: triagem.created_at,
        });
        return;
      }
    }
    setPacienteConhecido(null);
  }

  // __ETAPA_B_V1__
  // Calcula semanas atuais a partir dos dados de gestacao salvos.
  // Retorna { gestanteAtual: bool, semanas: number|null, dum: string|null }
  // __HEMOGRAMA_SEAMLESS_V1__
  // Avanca para o proximo campo do hemograma apos 2s sem digitacao.
  // Foco inicial no CPF quando modal abre
  useEffect(() => {
    const t = setTimeout(() => {
      if (refCpfInput.current) refCpfInput.current.focus();
    }, 100);
    return () => clearTimeout(t);
  }, []);

  // Avanca pra DN quando CPF tem 11 digitos validos
  useEffect(() => {
    if (!modoMedico) return;
    const digits = String(inputs.cpf || '').replace(/\D/g, '');
    if (digits.length === 11 && validarCPF(inputs.cpf) && etapaInicio === 1) {
      setEtapaInicio(2);
      setTimeout(() => {
        if (refDnInput.current) refDnInput.current.focus();
      }, 100);
    }
  }, [inputs.cpf, modoMedico, etapaInicio]);

  // Move foco automaticamente quando etapaHemograma muda OU quando usuario
  // interage com outros campos (sexo, DN, bariatrica, gestante).
  // O foco sempre vai para o input ativo no momento.
  useEffect(() => {
    const targets = { 1: refHbHemograma, 2: refVcmHemograma, 3: refRdwHemograma };
    const target = targets[etapaHemograma];
    const t = setTimeout(() => {
      if (target && target.current) {
        target.current.focus();
      }
    }, 100);
    return () => clearTimeout(t);
  }, [etapaHemograma, inputs.sexo, inputs.bariatrica, inputs.gestante]);

  function agendarAvancoHemograma(etapaAtual, valorAtual, maxChars) {
    if (timerHemogramaRef.current) clearTimeout(timerHemogramaRef.current);
    if (!valorAtual || String(valorAtual).length < 1) return;
    // Se ja atingiu o maxChars, avanca imediato
    if (String(valorAtual).length >= maxChars) {
      setEtapaHemograma(prev => Math.max(prev, etapaAtual + 1));
      return;
    }
    // Senao, agenda timer de 2s
    timerHemogramaRef.current = setTimeout(() => {
      setEtapaHemograma(prev => Math.max(prev, etapaAtual + 1));
    }, 1000);
  }

  function revalidaGestante(pc) {
    if (!pc || pc === 'BLOQUEADO' || !pc.gestante) {
      return { gestanteAtual: false, semanas: null, dum: null };
    }
    const hoje = new Date();
    let semanasCalc = null;
    let dum = pc.dum || null;
    // 1. Origem profile: usa semanas_gestacao_triagem + data_triagem_gestacao
    if (pc.semanas_gestacao_triagem && pc.data_triagem_gestacao) {
      const dataTriagem = new Date(pc.data_triagem_gestacao);
      const diasDecorridos = (hoje - dataTriagem) / (1000 * 60 * 60 * 24);
      semanasCalc = Number(pc.semanas_gestacao_triagem) + (diasDecorridos / 7);
    }
    // 2. Origem triagem: usa semanas_gestacao + created_at
    else if (pc.semanas_gestacao && pc.created_at) {
      const dataTriagem = new Date(pc.created_at);
      const diasDecorridos = (hoje - dataTriagem) / (1000 * 60 * 60 * 24);
      semanasCalc = Number(pc.semanas_gestacao) + (diasDecorridos / 7);
    }
    // 3. Sem dado de tempo: assume gestante atual (sem semanas calculadas)
    if (semanasCalc === null) {
      return { gestanteAtual: true, semanas: null, dum };
    }
    // 4. Se >40 semanas: gestacao concluida -> trata como nao-gestante
    if (semanasCalc > 40) {
      return { gestanteAtual: false, semanas: null, dum: null };
    }
    return { gestanteAtual: true, semanas: Math.round(semanasCalc * 10) / 10, dum };
  }

  async function handleBuscarHistorico() {
    const cpfDigits = String(inputs.cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      setHistoricoMsg('Informe um CPF v\u00e1lido (11 d\u00edgitos) antes de buscar.');
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }
    setHistoricoBuscando(true);
    setHistoricoMsg('');
    const { data, error } = await supabase
      .from('avaliacoes')
      .select('data_coleta, hemoglobina, vcm, rdw, ferritina, sat_transf')
      .eq('cpf', cpfDigits)
      .not('hemoglobina', 'is', null)
      .not('vcm', 'is', null)
      .not('rdw', 'is', null)
      .not('ferritina', 'is', null)
      .not('sat_transf', 'is', null)
      .order('data_coleta', { ascending: true });
    setHistoricoBuscando(false);
    if (error) {
      setHistoricoMsg('Erro ao buscar hist\u00f3rico. Tente novamente.');
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }
    if (!data || data.length < 2) {
      setHistoricoMsg('N\u00c3O H\u00c1 ELEMENTOS PARA GR\u00c1FICO');
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }
    setHistoricoData({ cpf: cpfDigits, avaliacoes: data });
  }

  return (<>

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onFechar} aria-label="Fechar" className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-red-700 hover:bg-red-800 text-white font-bold text-sm flex items-center justify-center transition-colors shadow-md">✕</button>

        {/* Cabecalho centralizado com fadinha vermelha */}
        <div className="bg-white px-6 pt-6 pb-4 rounded-t-2xl text-center">
          <img src={logo} alt="RedFairy" className="w-20 h-20 object-contain mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-red-700 leading-tight">RedFairy</h2>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">🔬 Triagem do Eritron</p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 leading-tight">{fraseAbertura}</h3>
          <p className="text-xs text-gray-500 mt-1">Preencha os dados básicos para uma avaliação inicial.</p>
        </div>

        <div className="p-6 space-y-4">
          {/* CPF (Modo Medico ou Modo Paciente DEMO) */}
          {mostrarCPF && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                CPF{modoMedico ? ' do Paciente' : ''}
              </label>
              <input
                ref={refCpfInput}
                type="text"
                name="cpf"
                value={inputs.cpf}
                onChange={e => handleChange({ target: { name: 'cpf', value: formatarCPF(e.target.value) } })}
                placeholder="000.000.000-00"
                className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  erros.cpf ? 'border-red-500' :
                  etapaInicio === 1 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' :
                  'border-yellow-300 bg-yellow-50'
                }`}
              />
              {erros.cpf && <p className="text-red-500 text-xs mt-1">{erros.cpf}</p>}
              {modoMedico && pacienteConhecido === 'BLOQUEADO' && (
                <div className="mt-3 p-4 rounded-xl bg-red-50 border-2 border-red-300">
                  <p className="text-sm font-bold text-red-800 mb-2">
                    \ud83d\uded1 Limite de triagens gratuitas atingido
                  </p>
                  <p className="text-xs text-red-900 leading-relaxed">
                    Para continuar avaliando a evolu\u00e7\u00e3o desse paciente, oriente-o a se <strong>CADASTRAR</strong> no RedFairy para receber gratuitamente um primeiro pedido de exames (Hemograma + Ferritina + Satura\u00e7\u00e3o da Transferrina). E se voc\u00ea ainda n\u00e3o \u00e9 <strong>AFILIADO</strong>, se filie para ter acesso aos benef\u00edcios do Programa.
                  </p>
                </div>
              )}
              {modoMedico && pacienteConhecido && pacienteConhecido !== 'BLOQUEADO' && (
                <div className="mt-2 p-2 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs text-green-800">
                    \u2713 Paciente conhecido: {pacienteConhecido.sexo === 'F' ? 'Feminino' : 'Masculino'}
                    {pacienteConhecido.data_nascimento ? ' \u00b7 nasc. ' + String(pacienteConhecido.data_nascimento).split('-').reverse().join('/') : ''}
                    {pacienteConhecido.bariatrica ? ' \u00b7 Bari\u00e1trica' : ''}
                    {pacienteConhecido.gestante ? ' \u00b7 Gestante' : ''}
                  </p>
                </div>
              )}
              {modoMedico && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleBuscarHistorico}
                    disabled={historicoBuscando}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                    {historicoBuscando ? 'Buscando...' : '\ud83d\udcca Buscar hist\u00f3rico do paciente'}
                  </button>
                  {historicoMsg && (
                    <p className="text-xs text-center mt-1 font-medium text-red-700">{historicoMsg}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* __ETAPA_B_V1__ - esconde Sexo/DN/Bariatrica quando paciente conhecido */}
          {!pacienteConhecido && (<>
          {/* Sexo + Data de Nascimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Sexo</label>
              <select
                ref={refSexoSelect}
                name="sexo"
                value={inputs.sexo}
                onChange={handleChange}
                className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  erros.sexo ? 'border-red-500' :
                  etapaInicio === 3 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' :
                  etapaInicio > 3 ? 'border-yellow-300 bg-yellow-50' :
                  'border-gray-200 bg-gray-50 text-gray-400'
                }`}
              >
                <option value="">Selecione...</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </select>
              {erros.sexo && <p className="text-red-500 text-xs mt-1">{erros.sexo}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data de Nascimento</label>
              <input
                ref={refDnInput}
                type="text"
                name="dataNascimento"
                value={inputs.dataNascimento}
                onChange={handleChange}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const dn = String(inputs.dataNascimento || '').trim();
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dn)) {
                      const [d, m, a] = dn.split('/').map(Number);
                      const dt = new Date(a, m - 1, d);
                      const valida = dt && dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
                      if (valida && a >= 1900 && dt <= new Date()) {
                        setEtapaInicio(3);
                        setTimeout(() => {
                          if (refSexoSelect.current) refSexoSelect.current.focus();
                        }, 100);
                      }
                    }
                  }
                }}
                inputMode="numeric"
                maxLength={10}
                placeholder="DD/MM/AAAA"
                className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  erros.dataNascimento ? 'border-red-500' :
                  etapaInicio === 2 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' :
                  etapaInicio >= 3 ? 'border-yellow-300 bg-yellow-50' :
                  'border-gray-200 bg-gray-50 text-gray-400'
                }`}
              />
              {erros.dataNascimento && <p className="text-red-500 text-xs mt-1">{erros.dataNascimento}</p>}
            </div>
          </div>

          </>)}
          {/* __B2_GESTANTE_READONLY__ */}
          {/* Gestante (so se sexo F) */}
          {inputs.sexo === 'F' && (() => {
            const reval = revalidaGestante(pacienteConhecido);
            const lockedGestante = !!pacienteConhecido && pacienteConhecido !== 'BLOQUEADO' && reval.gestanteAtual;
            const semanasAuto = lockedGestante ? reval.semanas : null;
            return (
            <div className="rounded-xl border border-pink-200 bg-pink-50 p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="gestante"
                  checked={lockedGestante ? true : inputs.gestante}
                  onChange={lockedGestante ? undefined : handleChange}
                  disabled={lockedGestante}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium text-pink-700">
                    Gestante{lockedGestante ? ' (já registrada)' : ''}
                  </p>
                  <p className="text-xs text-pink-600">
                    {lockedGestante
                      ? 'Esta paciente já está cadastrada como gestante.'
                      : (modoMedico ? 'Marque se a paciente está grávida' : 'Marque se está grávida')}
                  </p>
                </div>
              </label>
              {(lockedGestante || inputs.gestante) && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Semanas de gestação</label>
                  {lockedGestante ? (
                    <div className="w-full border-2 border-pink-300 bg-pink-100 rounded-lg px-3 py-2 text-sm text-pink-900 font-semibold">
                      {semanasAuto !== null ? semanasAuto + ' semanas (calculado)' : 'Sem dado registrado'}
                    </div>
                  ) : (
                    <>
                      <input
                        type="number"
                        name="semanas_gestacao"
                        value={inputs.semanas_gestacao}
                        onChange={handleChange}
                        min="1" max="42"
                        placeholder="Ex: 24"
                        className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${erros.semanas_gestacao ? 'border-red-500' : 'border-2 border-red-500'}`}
                      />
                      {erros.semanas_gestacao && <p className="text-red-500 text-xs mt-1">{erros.semanas_gestacao}</p>}
                    </>
                  )}
                </div>
              )}
            </div>
            );
          })()}

          {/* Bariatrica/o (escondido se paciente conhecido) */}
          {!pacienteConhecido && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="bariatrica"
                checked={inputs.bariatrica}
                onChange={handleChange}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-amber-700">
                  {modoMedico
                    ? (inputs.sexo === 'F' ? 'Paciente bariátrica' : inputs.sexo === 'M' ? 'Paciente bariátrico' : 'Paciente bariátrico/a')
                    : (inputs.sexo === 'F' ? 'Sou bariátrica' : inputs.sexo === 'M' ? 'Sou bariátrico' : 'Sou paciente bariátrico/a')}
                </p>
                <p className="text-xs text-amber-600">
                  {modoMedico
                    ? 'Marque se o(a) paciente fez cirurgia bariátrica'
                    : 'Marque se você fez cirurgia bariátrica (by-pass / gastrectomia)'}
                </p>
              </div>
            </label>
          </div>
          )}

          {pacienteConhecido !== 'BLOQUEADO' && (<>
          {/* __HEMOGRAMA_SEAMLESS_V1__ */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">📋 Hemograma</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hb (g/dL)</label>
                <input
                  ref={refHbHemograma}
                  type="text"
                  inputMode="decimal"
                  name="hemoglobina"
                  value={inputs.hemoglobina}
                  maxLength={4}
                  disabled={etapaHemograma < 1}
                  autoFocus
                  onChange={e => {
                    let v = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, 4);
                    handleChange({ target: { name: 'hemoglobina', value: v } });
                    agendarAvancoHemograma(1, v, 4);
                  }}
                  className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    etapaHemograma === 1
                      ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400'
                      : etapaHemograma > 1
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-gray-300 bg-gray-100 text-gray-400'
                  }`}
                />
                {erros.hemoglobina && <p className="text-red-500 text-xs mt-0.5">{erros.hemoglobina}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">VCM (fL)</label>
                <input
                  ref={refVcmHemograma}
                  type="text"
                  inputMode="decimal"
                  name="vcm"
                  value={inputs.vcm}
                  maxLength={5}
                  disabled={etapaHemograma < 2}
                  onChange={e => {
                    let v = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, 5);
                    handleChange({ target: { name: 'vcm', value: v } });
                    agendarAvancoHemograma(2, v, 5);
                  }}
                  className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    etapaHemograma === 2
                      ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400'
                      : etapaHemograma > 2
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-gray-300 bg-gray-100 text-gray-400'
                  }`}
                />
                {erros.vcm && <p className="text-red-500 text-xs mt-0.5">{erros.vcm}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">RDW-CV (%)</label>
                <input
                  ref={refRdwHemograma}
                  type="text"
                  inputMode="decimal"
                  name="rdw"
                  value={inputs.rdw}
                  maxLength={4}
                  disabled={etapaHemograma < 3}
                  onChange={e => {
                    let v = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, 4);
                    handleChange({ target: { name: 'rdw', value: v } });
                    agendarAvancoHemograma(3, v, 4);
                  }}
                  className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    etapaHemograma === 3
                      ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400'
                      : etapaHemograma > 3
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-gray-300 bg-gray-100 text-gray-400'
                  }`}
                />
                {erros.rdw && <p className="text-red-500 text-xs mt-0.5">{erros.rdw}</p>}
              </div>
            </div>
          </div>
          </>)}
        </div>

        {/* __HEMOGRAMA_SEAMLESS_V1__ Acoes */}
        {pacienteConhecido !== 'BLOQUEADO' && (
        <div className="px-6 pb-6 flex flex-col items-center gap-2">
          {etapaHemograma >= 4 && inputs.hemoglobina && inputs.vcm && inputs.rdw && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleAvaliar}
                aria-label="Confirmar e avaliar"
                className="w-14 h-14 rounded-full bg-gray-400 hover:bg-gray-500 text-red-700 font-bold flex items-center justify-center transition-colors shadow-md"
              >
                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>⏭</span>
              </button>
              <span className="text-xs font-bold text-red-800 tracking-wide">CONFIRMO</span>
            </div>
          )}
          {etapaHemograma < 4 && (
            <p className="text-xs text-gray-400 text-center">Preencha os campos amarelos em sequência</p>
          )}

        </div>
        )}
      </div>
    </div>
      {historicoData && (
        <HistoricoChartModal
          cpf={historicoData.cpf}
          avaliacoes={historicoData.avaliacoes}
          sexo={inputs.sexo}
          gestante={!!inputs.gestante}
          onFechar={() => setHistoricoData(null)} />
      )}
    </>
  )
}
