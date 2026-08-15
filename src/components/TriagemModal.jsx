import { useState, useEffect, useRef } from 'react';
import { triagemEritron } from '../engine/decisionEngine'
import { checarValor } from '../engine/limitesInput'
import { credAmbas } from '../lib/cred'
import obaLogo from '../assets/oba-logo.png'
import { supabase } from '../lib/supabase';
import HistoricoChartModal from './HistoricoChartModal';
import PlayButton from './PlayButton';

/**
 * TriagemModal - popup inicial de triagem do eritron.
 *
 * Props:
 *   modoMedico:       boolean - se true, exibe campo CPF (medico digita do paciente)
 *   isDemoPaciente:   boolean - se true (modo paciente DEMO sem login), exibe CPF
 *   cpfPrefill:       string  - CPF a ser preenchido automaticamente (paciente logado)
 *   cpfBloqueado:     boolean - se true, o campo CPF fica disabled e foco pula pro proximo
 *   onConcluir:       function(resultado, inputs) - chamada apos avaliar com sucesso
 *   onFechar:         function() - usuario fechou sem avaliar
 */
export default function TriagemModal({ modoMedico = false, isDemoPaciente = false, cpfPrefill = '', cpfBloqueado = false, onConcluir, onFechar, onAprofundar }) {
  // Formata CPF inicial (se vier prefilled como digitos puros)
  const formatarCPFInicial = (raw) => {
    const d = String(raw || '').replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0,3) + '.' + d.slice(3);
    if (d.length <= 9) return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6);
    return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9);
  };
  // Projeto OBA: paciente entrou pelo botao "Sou Bariatrico" (flag no localStorage).
  // O sexo so' e' definido aqui dentro; o flag apenas marca a condicao bariatrica.
  const flagBariatricaOBA = (() => {
    try { return localStorage.getItem('rf_flag') === 'bariatrica'; } catch (e) { return false; }
  })();
  const [inputs, setInputs] = useState({
    cpf: formatarCPFInicial(cpfPrefill),
    sexo: '',
    gestante: false,
    bariatrica: flagBariatricaOBA,
    semanas_gestacao: '',
    dataNascimento: '',
    hemoglobina: '',
    vcm: '',
    rdw: '',
    data_coleta: '',
    data_estimada: false,
  })

  const [pacienteConhecido, setPacienteConhecido] = useState(null);
  // Typewriter do aviso de topo: "NAO TEM UM HEMOGRAMA?..."
  const [twTopo, setTwTopo] = useState('');
  useEffect(() => {
    const full = "N\u00c3O TEM UM HEMOGRAMA?... FECHE A JANELA E VOLTE DEPOIS.";
    let i = 0;
    setTwTopo('');
    const iv = setInterval(() => {
      i++;
      setTwTopo(full.slice(0, i));
      if (i >= full.length) clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, []);
  // Projeto OBA: garante bariatrica=true mesmo apos carregar paciente conhecido
  useEffect(() => {
    if (!flagBariatricaOBA) return;
    setInputs(prev => prev.bariatrica ? prev : { ...prev, bariatrica: true });
  }, [flagBariatricaOBA, pacienteConhecido]);
  const [buscandoCpf, setBuscandoCpf] = useState(false);

  // Etapa do hemograma: 1=Hb ativo, 2=VCM ativo, 3=RDW ativo, 4=todos confirmados
  const [etapaHemograma, setEtapaHemograma] = useState(1);
  // Ilustração: foto de exemplo de hemograma com DATA/HB/VCM/RDW circulados (só paciente).
  const [mostrarExemploHemograma, setMostrarExemploHemograma] = useState(false);
  const timerHemogramaRef = useRef(null);
  const refHbHemograma = useRef(null);
  const refVcmHemograma = useRef(null);
  const refRdwHemograma = useRef(null);

  const refCpfInput = useRef(null);
  const refDnInput = useRef(null);
  const refSexoSelect = useRef(null);
  const refDataColeta = useRef(null);
  const [etapaInicio, setEtapaInicio] = useState(1);

  const [historicoBuscando, setHistoricoBuscando] = useState(false);
  const [historicoMsg, setHistoricoMsg] = useState('');
  const [historicoData, setHistoricoData] = useState(null);
  const [erros, setErros] = useState({})

  // Paciente com CPF já conhecido/bloqueado (entrou logado): NÃO mostra o campo CPF (nem a
  // linha de identidade) — o CPF aparece pequeno e preto sob o título. Reduz a altura do
  // modal p/ caber com o teclado erguido no mobile. O médico (e o demo sem login) ainda digita.
  const mostrarCPF = modoMedico || (isDemoPaciente && !cpfBloqueado)
  // Flags derivadas: paciente conhecido REALMENTE tem sexo / data_nascimento.
  // (pode existir profile mas com esses campos NULL - entao precisamos pedir)
  const pacConhSexoOk = !!(pacienteConhecido && pacienteConhecido !== 'BLOQUEADO' && pacienteConhecido.sexo);
  const pacConhDataNascOk = !!(pacienteConhecido && pacienteConhecido !== 'BLOQUEADO' && pacienteConhecido.data_nascimento);
  const pacConhCompleto = pacConhSexoOk && pacConhDataNascOk;

  const fraseAbertura = modoMedico
    ? "Como est\u00e1 a hemoglobina do seu paciente?"
    : "Como est\u00e1 a sua hemoglobina?"

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    let v = type === 'checkbox' ? checked : value
    if (name === 'dataNascimento' && typeof v === 'string') {
      const digits = v.replace(/\D/g, '').slice(0, 8)
      if (digits.length <= 2) v = digits
      else if (digits.length <= 4) v = digits.slice(0,2) + '/' + digits.slice(2)
      else v = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4)
    }
    if (['hemoglobina', 'vcm', 'rdw'].includes(name) && typeof v === 'string') {
      v = v.replace(',', '.')
    }
    setInputs(prev => ({ ...prev, [name]: v }))
    if (erros[name]) setErros(prev => ({ ...prev, [name]: null }))
    // Valida\u00e7\u00e3o imediata de CPF: assim que atingir 11 d\u00edgitos, valida; se inv\u00e1lido, marca erro.
    // Isso bloqueia o restante do modal (sexo/datas/hemograma) at\u00e9 CPF ficar v\u00e1lido.
    if (name === 'cpf' && typeof v === 'string') {
      const digits = v.replace(/\D/g, '');
      if (digits.length === 11) {
        if (!validarCPF(v)) {
          setErros(prev => ({ ...prev, cpf: 'CPF inv\u00e1lido' }));
        } else {
          setErros(prev => ({ ...prev, cpf: null }));
        }
      } else {
        setErros(prev => ({ ...prev, cpf: null }));
      }
    }
  }

  function formatarCPF(valor) {
    return valor
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4')
  }

  useEffect(() => {
    if (!pacienteConhecido || pacienteConhecido === 'BLOQUEADO') return;
    const reval = revalidaGestante(pacienteConhecido);
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

  // Gestante conhecida: ao informar a DATA DA COLETA, recalcula as semanas NAQUELA data
  // (referência = semanas + data salvas no perfil). Mantém editável; > 42 desmarca.
  useEffect(() => {
    const pc = pacienteConhecido;
    if (!pc || pc === 'BLOQUEADO' || !pc.gestante) return;
    if (!pc.semanas_gestacao_triagem || !pc.data_triagem_gestacao) return;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(inputs.data_coleta || ''))) return;
    const [d, m, a] = inputs.data_coleta.split('/').map(Number);
    const coleta = new Date(a, m - 1, d);
    const ref = new Date(String(pc.data_triagem_gestacao).slice(0, 10) + 'T00:00:00');
    const semanas = Number(pc.semanas_gestacao_triagem) + (coleta - ref) / (1000 * 60 * 60 * 24) / 7;
    if (semanas > 42 || semanas < 0) {
      setInputs(prev => ({ ...prev, gestante: false, semanas_gestacao: '' }));
    } else {
      setInputs(prev => ({ ...prev, gestante: true, semanas_gestacao: String(Math.round(semanas)) }));
    }
  }, [inputs.data_coleta, pacienteConhecido]);

  useEffect(() => {
    if (!modoMedico && !cpfBloqueado) return;
    const digits = String(inputs.cpf || '').replace(/\D/g, '');
    // Só busca quando o CPF é VÁLIDO. Antes, qualquer 11 dígitos (inclusive CPF inválido)
    // disparava a busca + re-renders a cada tecla, atrapalhando/roubando o foco do campo
    // no mobile — dando a sensação de "campo travado/não-editável" ao corrigir o CPF.
    if (digits.length === 11 && validarCPF(inputs.cpf)) {
      buscarCpfConhecido(digits);
    } else {
      setPacienteConhecido(null);
    }
  }, [inputs.cpf, modoMedico, cpfBloqueado]);

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
      else if (!validarCPF(inputs.cpf)) errors.cpf = "CPF inv\u00e1lido"
    }
    if (!inputs.sexo) errors.sexo = 'Selecione o sexo'
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
          errors.dataNascimento = "Data inv\u00e1lida"
        } else if (a < 1900) {
          errors.dataNascimento = 'Verifique o ano de nascimento'
        } else if (dt > new Date()) {
          errors.dataNascimento = "Data n\u00e3o pode ser no futuro"
        } else {
          const hoje = new Date()
          let idade = hoje.getFullYear() - a
          const mDiff = hoje.getMonth() - (m - 1)
          if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < d)) idade--
          if (idade < 12) {
            errors.dataNascimento = "O Projeto OBA\u00ae" + " ainda n\u00e3o atende crian\u00e7as menores de 12 anos. Os valores de refer\u00eancia do eritron pedi\u00e1trico s\u00e3o diferentes dos do adulto e exigem um m\u00f3dulo espec\u00edfico que est\u00e1 em desenvolvimento. Em breve!"
          } else if (idade > 100) {
            errors.dataNascimento = 'Verifique a data de nascimento'
          } else {
            idadeCalc = idade
            dataNascimentoISO = `${a}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          }
        }
      }
    }
    if (!inputs.hemoglobina) errors.hemoglobina = "Obrigat\u00f3rio"
    if (!inputs.vcm) errors.vcm = "Obrigat\u00f3rio"
    if (!inputs.rdw) errors.rdw = "Obrigat\u00f3rio"
    // Faixa fisiologicamente possivel (limitesInput). Antes so' a presenca era
    // checada: "1789" cabia no maxLength={4} e entrava direto no motor.
    ;['hemoglobina', 'vcm', 'rdw'].forEach(k => {
      if (errors[k]) return
      const r = checarValor(k, inputs[k])
      if (r.status === 'bloqueio' || r.status === 'invalido') errors[k] = r.msg
    })
    if (!inputs.data_coleta) errors.data_coleta = 'Informe a data do hemograma'
    else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(inputs.data_coleta)) errors.data_coleta = 'Use o formato DD/MM/AAAA'
    else {
      const [d, m, a] = inputs.data_coleta.split('/').map(Number);
      const dt = new Date(a, m - 1, d);
      const valida = dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
      if (!valida || a < 1900) errors.data_coleta = 'Data inv\u00e1lida';
      else if (dt > new Date()) errors.data_coleta = 'Data n\u00e3o pode ser futura';
    }
    // A data do novo hemograma não pode ser anterior à da avaliação anterior.
    if (!errors.data_coleta && pacienteConhecido && pacienteConhecido !== 'BLOQUEADO'
        && pacienteConhecido.ultimoHemograma && pacienteConhecido.ultimoHemograma.data_coleta
        && /^\d{2}\/\d{2}\/\d{4}$/.test(inputs.data_coleta)) {
      const [dd, mm, aa] = inputs.data_coleta.split('/').map(Number);
      const atualDt = new Date(aa, mm - 1, dd);
      const prevStr = String(pacienteConhecido.ultimoHemograma.data_coleta).slice(0, 10);
      const [pa, pm, pd] = prevStr.split('-').map(Number);
      if (atualDt <= new Date(pa, pm - 1, pd)) {
        errors.data_coleta = 'A data deve ser posterior à da avaliação anterior (' + prevStr.split('-').reverse().join('/') + ').';
      }
    }
    if (inputs.sexo === 'F' && inputs.gestante && !inputs.semanas_gestacao) {
      errors.semanas_gestacao = 'Informe as semanas'
    } else if (inputs.sexo === 'F' && inputs.gestante) {
      const r = checarValor('semanas_gestacao', inputs.semanas_gestacao)
      if (r.status === 'bloqueio' || r.status === 'invalido') errors.semanas_gestacao = r.msg
    }
    return { errors, idadeCalc, dataNascimentoISO }
  }

  const [erroGeral, setErroGeral] = useState('')
  async function handleAvaliar() {
    setErroGeral('')
    const { errors, idadeCalc, dataNascimentoISO } = validar()
    if (Object.keys(errors).length > 0) {
      setErros(errors)
      // Se nenhum dos erros tem campo visivel (por exemplo pacienteConhecido escondeu
      // os campos mas mesmo assim faltam dados), mostra mensagem geral.
      const camposVisiveis = ['hemoglobina', 'vcm', 'rdw', 'data_coleta', 'semanas_gestacao']
      if (!pacConhCompleto) camposVisiveis.push('sexo', 'dataNascimento')
      if (mostrarCPF) camposVisiveis.push('cpf')
      const errosOcultos = Object.keys(errors).filter(k => !camposVisiveis.includes(k))
      if (errosOcultos.length > 0) {
        setErroGeral("Dados incompletos no perfil. Acesse 'Completar Perfil' antes de avaliar.")
      }
      return
    }
    const _hoje = new Date();
    const _dataHojeISO = `${_hoje.getFullYear()}-${String(_hoje.getMonth()+1).padStart(2,'0')}-${String(_hoje.getDate()).padStart(2,'0')}`;
    // Converte data_coleta de DD/MM/AAAA (BR) para YYYY-MM-DD (ISO) para usar no engine e no onConcluir.
    let dataColetaISO = '';
    if (inputs.data_coleta && /^\d{2}\/\d{2}\/\d{4}$/.test(inputs.data_coleta)) {
      const [_d, _m, _a] = inputs.data_coleta.split('/');
      dataColetaISO = `${_a}-${_m}-${_d}`;
    }
    // Deriva dataNascimento em DD/MM/AAAA a partir do ISO. Necessario porque, para
    // paciente CONHECIDO, o campo nem aparece e inputs.dataNascimento fica vazio -
    // o dado real vem de pacienteConhecido.data_nascimento (ja convertido em dataNascimentoISO).
    // O Calculator espera novosInputs.dataNascimento em DD/MM/AAAA.
    let dataNascimentoBR = inputs.dataNascimento || '';
    if (dataNascimentoISO && /^\d{4}-\d{2}-\d{2}$/.test(dataNascimentoISO)) {
      const [_a, _m, _d] = dataNascimentoISO.split('-');
      dataNascimentoBR = `${_d}/${_m}/${_a}`;
    }
    const inputsNumericos = {
      ...inputs,
      idade: idadeCalc,
      data_nascimento: dataNascimentoISO,
      dataNascimento: dataNascimentoBR,
      data_coleta: dataColetaISO || inputs.data_coleta,
      dataColeta: dataColetaISO || _dataHojeISO,
      hemoglobina: Number(inputs.hemoglobina),
      vcm: Number(inputs.vcm),
      rdw: Number(inputs.rdw),
      semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
    }
    // Trava confiável da data: consulta o banco a última avaliação REAL concluída do
    // CPF e bloqueia se o novo hemograma for anterior. Independe do reconhecimento em
    // tela (pacienteConhecido), então pega 2ª, 3ª... avaliação em qualquer caminho.
    const _cpfDig = String(inputs.cpf || '').replace(/\D/g, '')
    if (_cpfDig.length === 11 && dataColetaISO && /^\d{4}-\d{2}-\d{2}$/.test(dataColetaISO)) {
      // RLS Fase 2: leitura por RPC. O filtro `concluida` passa a ser aplicado
      // aqui (a RPC devolve as linhas do CPF em ordem decrescente de data).
      const { data: _avResp } = await supabase.rpc('avaliacoes_por_cpf', {
        p_cpf: _cpfDig, p_ordem: 'desc', ...credAmbas()
      })
      const _ult = ((_avResp && _avResp.ok ? _avResp.linhas : []) || []).find(a => a.concluida === true)
      const _prev = _ult && _ult.data_coleta ? String(_ult.data_coleta).slice(0, 10) : ''
      if (_prev && dataColetaISO <= _prev) {
        setErros(prev => ({ ...prev, data_coleta: 'A data deve ser posterior à da avaliação anterior (' + _prev.split('-').reverse().join('/') + ').' }))
        setTimeout(() => { if (refDataColeta.current) refDataColeta.current.focus(); }, 0)
        return
      }
    }
    const resultado = triagemEritron(inputsNumericos)
    onConcluir(resultado, inputsNumericos)
  }

  async function buscarCpfConhecido(cpfDigits) {
    setBuscandoCpf(true);
    // RLS Fase 2: leitura por RPC (gateada por token de médico OU do paciente).
    const { data: _pfResp } = await supabase.rpc('profiles_por_cpf', { p_cpf: cpfDigits, ...credAmbas() });
    const profile = (_pfResp && _pfResp.ok) ? _pfResp.perfil : null;
    // triagens: via RPC pública (sem token) — usada no funil anônimo, antes de
    // existir qualquer conta/credencial. Só campos não-clínicos + contagem.
    const { data: triResp } = await supabase.rpc('lookup_triagens_cpf', { p_cpf: cpfDigits });
    const nTriagens = (triResp && triResp.ok) ? (triResp.count || 0) : 0;
    const ultimaTriagem = (triResp && triResp.ok) ? triResp.ultima : null;
    setBuscandoCpf(false);
    if (!profile && nTriagens >= 2) {
      setPacienteConhecido('BLOQUEADO');
      return;
    }
    if (profile) {
      // Última avaliação completa: para mostrar no topo e impedir data retroativa.
      // RLS Fase 2: leitura por RPC.
      const { data: _uaResp } = await supabase.rpc('avaliacoes_por_cpf', {
        p_cpf: cpfDigits, p_ordem: 'desc', ...credAmbas()
      });
      const ultAval = ((_uaResp && _uaResp.ok ? _uaResp.linhas : []) || [])[0] || null;
      setPacienteConhecido({
        origem: 'profile',
        nome: profile.nome || '',
        sexo: profile.sexo,
        data_nascimento: profile.data_nascimento,
        bariatrica: !!profile.bariatrica,
        gestante: !!profile.gestante,
        semanas_gestacao_triagem: profile.semanas_gestacao_triagem,
        data_triagem_gestacao: profile.data_triagem_gestacao,
        semanas_gestacao: null,
        dum: null,
        created_at: null,
        ultimoHemograma: ultAval || null,
      });
      return;
    }
    if (nTriagens > 0 && ultimaTriagem) {
      setPacienteConhecido({
        origem: 'triagem',
        sexo: ultimaTriagem.sexo,
        data_nascimento: ultimaTriagem.data_nascimento,
        bariatrica: !!ultimaTriagem.bariatrica,
        gestante: !!ultimaTriagem.gestante,
        semanas_gestacao_triagem: null,
        data_triagem_gestacao: null,
        semanas_gestacao: ultimaTriagem.semanas_gestacao,
        dum: null,
        created_at: ultimaTriagem.created_at,
      });
      return;
    }
    setPacienteConhecido(null);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (refCpfInput.current) refCpfInput.current.focus();
    }, 100);
    return () => clearTimeout(t);
  }, []);

  // Paciente ja logado: CPF veio preenchido e bloqueado. Pular direto pro Sexo.
  useEffect(() => {
    if (!cpfBloqueado) return;
    setEtapaInicio(3);
    const t = setTimeout(() => {
      if (refSexoSelect.current) refSexoSelect.current.focus();
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fluxo seamless de foco em modo m\u00e9dico:
  //   etapaInicio 1 = CPF, 2 = Sexo, 3 = DataNasc, 4 = DataColeta, >=5 = pronto para hemograma
  // CPF v\u00e1lido (11 d\u00edgitos) \u2192 Sexo
  useEffect(() => {
    if (!modoMedico) return;
    const digits = String(inputs.cpf || '').replace(/\D/g, '');
    if (digits.length === 11 && validarCPF(inputs.cpf) && etapaInicio === 1) {
      setEtapaInicio(2);
      setTimeout(() => {
        if (refSexoSelect.current) refSexoSelect.current.focus();
      }, 100);
    }
  }, [inputs.cpf, modoMedico, etapaInicio]);

  // Paciente conhecido com sexo+dataNasc completos: campos Sexo e DataNasc somem do DOM
  // (linha {!pacConhCompleto && ...}), entao precisamos pular etapaInicio direto pra 4
  // (DataColeta) e focar nela. Sem isso, etapaInicio fica preso em 2 e DataColeta+HB
  // ficam disabled. So' dispara depois de buscarCpfConhecido() popular pacienteConhecido.
  useEffect(() => {
    if (!modoMedico) return;
    if (!pacConhCompleto) return;
    if (etapaInicio >= 4) return;
    setEtapaInicio(4);
    setTimeout(() => {
      if (refDataColeta.current) refDataColeta.current.focus();
    }, 100);
  }, [modoMedico, pacConhCompleto, etapaInicio]);

  // Sexo escolhido \u2192 Data Nasc
  useEffect(() => {
    if (!modoMedico) return;
    if (etapaInicio !== 2) return;
    if (!inputs.sexo) return;
    setEtapaInicio(3);
    setTimeout(() => {
      if (refDnInput.current) refDnInput.current.focus();
    }, 100);
  }, [inputs.sexo, modoMedico, etapaInicio]);

  // Data Nasc v\u00e1lida \u2192 Data do Hemograma
  useEffect(() => {
    if (!modoMedico) return;
    if (etapaInicio !== 3) return;
    const dn = String(inputs.dataNascimento || '').trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dn)) return;
    const [d, m, a] = dn.split('/').map(Number);
    const dt = new Date(a, m - 1, d);
    const valida = dt && dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
    const ehFutura = valida && a >= 1900 && dt > new Date();
    if (!valida || a < 1900 || ehFutura) {
      setErros(prev => ({ ...prev, dataNascimento: ehFutura ? 'A data de nascimento não pode ser no futuro.' : 'Data inválida.' }));
      setInputs(prev => ({ ...prev, dataNascimento: '' }));
      setTimeout(() => { if (refDnInput.current) refDnInput.current.focus(); }, 0);
      return;
    }
    // Limites de idade: >120 rejeita; >=100 pede confirmacao.
    const hoje = new Date();
    let idadeCalc = hoje.getFullYear() - a;
    const mDiffN = hoje.getMonth() - (m - 1);
    if (mDiffN < 0 || (mDiffN === 0 && hoje.getDate() < d)) idadeCalc--;
    // (fix) menor de 12 anos: rejeita imediatamente no campo (modulo pediatrico em
    // desenvolvimento) — antes o auto-avanco do medico so' checava futuro/>120/>=100.
    if (idadeCalc < 12) {
      setErros(prev => ({ ...prev, dataNascimento: 'O Projeto OBA®' + ' ainda não atende menores de 12 anos (módulo pediátrico em desenvolvimento).' }));
      setInputs(prev => ({ ...prev, dataNascimento: '' }));
      setTimeout(() => { if (refDnInput.current) refDnInput.current.focus(); }, 0);
      return;
    }
    if (idadeCalc > 120 || (idadeCalc >= 100 && !window.confirm(`A data informada resulta em ${idadeCalc} anos. Confirma?`))) {
      setErros(prev => ({ ...prev, dataNascimento: idadeCalc > 120 ? 'Idade acima de 120 anos não é aceita — verifique a data.' : 'Confirme a data de nascimento.' }));
      setInputs(prev => ({ ...prev, dataNascimento: '' }));
      setTimeout(() => { if (refDnInput.current) refDnInput.current.focus(); }, 0);
      return;
    }
    const t = setTimeout(() => {
      setEtapaInicio(4);
      setTimeout(() => {
        if (refDataColeta.current) refDataColeta.current.focus();
      }, 100);
    }, 800);
    return () => clearTimeout(t);
  }, [inputs.dataNascimento, modoMedico, etapaInicio]);

  // Data do Hemograma v\u00e1lida + (data estimada marcada): pula direto para HEMOGLOBINA.
  // Se data estimada n\u00e3o for marcada, o usu\u00e1rio decide quando avan\u00e7ar (clica em HB).
  useEffect(() => {
    if (!modoMedico) return;
    if (etapaInicio < 4) return;
    const dc = String(inputs.data_coleta || '').trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dc)) return;
    const [d, m, a] = dc.split('/').map(Number);
    const dt = new Date(a, m - 1, d);
    const valida = dt && dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
    // Data invalida ou futura: AVISAR, LIMPAR o campo e refocar o cursor no inicio.
    const ehFutura = valida && a >= 1900 && dt > new Date();
    if (!valida || a < 1900 || ehFutura) {
      setErros(prev => ({ ...prev, data_coleta: ehFutura ? 'A data do hemograma não pode ser no futuro.' : 'Data inválida.' }));
      setInputs(prev => ({ ...prev, data_coleta: '' }));
      setTimeout(() => { if (refDataColeta.current) refDataColeta.current.focus(); }, 0);
      return;
    }
    // Se data estimada marcada: salta foco para HB.
    if (inputs.data_estimada) {
      const t = setTimeout(() => {
        if (etapaInicio < 5) setEtapaInicio(5);
        setTimeout(() => {
          if (refHbHemograma.current && document.activeElement !== refHbHemograma.current) {
            refHbHemograma.current.focus();
          }
        }, 100);
      }, 600);
      return () => clearTimeout(t);
    } else if (etapaInicio === 4) {
      // Sem checkbox e ainda na etapa 4: libera o resto, mas n\u00e3o muda foco.
      setEtapaInicio(5);
    }
  }, [inputs.data_coleta, inputs.data_estimada, modoMedico, etapaInicio]);

  // --- Cadeia de foco no MODO PACIENTE (as tr\u00eas acima s\u00e3o exclusivas do m\u00e9dico) ---
  // Sexo escolhido pelo usu\u00e1rio \u2192 foca Data de Nascimento (ou, se o nascimento j\u00e1
  // veio do cadastro, pula direto pra Data da Coleta). pacConhSexoOk = veio do perfil.
  useEffect(() => {
    if (modoMedico) return;
    if (!inputs.sexo || pacConhSexoOk) return;
    const t = setTimeout(() => {
      if (!pacConhDataNascOk && refDnInput.current) refDnInput.current.focus();
      else if (refDataColeta.current) refDataColeta.current.focus();
    }, 120);
    return () => clearTimeout(t);
  }, [inputs.sexo, modoMedico, pacConhSexoOk, pacConhDataNascOk]);

  // Data de Nascimento completa (DD/MM/AAAA): calcula a idade NA HORA. Se < 12 anos,
  // bloqueia, limpa o campo e volta o cursor (com mensagem). Sen\u00e3o, foca Data da Coleta.
  useEffect(() => {
    if (modoMedico || pacConhDataNascOk) return;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(inputs.dataNascimento || ''))) return;
    const [d, m, a] = String(inputs.dataNascimento).split('/').map(Number);
    const dt = new Date(a, m - 1, d);
    const valida = dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
    if (valida && a >= 1900 && dt <= new Date()) {
      const hoje = new Date();
      let idade = hoje.getFullYear() - a;
      const mDiff = hoje.getMonth() - (m - 1);
      if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < d)) idade--;
      if (idade < 12) {
        setErros(prev => ({ ...prev, dataNascimento: 'O SISTEMA N\u00c3O AVALIA MENORES DE 12 ANOS DE IDADE' }));
        setInputs(prev => ({ ...prev, dataNascimento: '' }));
        setTimeout(() => { if (refDnInput.current) refDnInput.current.focus(); }, 0);
        return;
      }
    }
    const t = setTimeout(() => { if (refDataColeta.current) refDataColeta.current.focus(); }, 150);
    return () => clearTimeout(t);
  }, [inputs.dataNascimento, modoMedico, pacConhDataNascOk]);

  useEffect(() => {
    if (!inputs.sexo) return;
    // Em modo m\u00e9dico, n\u00e3o forcamos foco em HB antes de o fluxo de cabe\u00e7alho terminar (etapaInicio>=5).
    if (modoMedico && etapaInicio < 5) return;
    // Em modo paciente, n\u00e3o pular para o Hemograma antes da DATA DA COLETA estar
    // preenchida \u2014 sen\u00e3o o foco sa\u00eda do Sexo direto pra Hemoglobina, pulando
    // Nascimento e Data do Hemograma. (S\u00f3 vale para a 1\u00aa caixa, HB.)
    if (!modoMedico && etapaHemograma === 1 && !/^\d{2}\/\d{2}\/\d{4}$/.test(String(inputs.data_coleta || ''))) return;
    const targets = { 1: refHbHemograma, 2: refVcmHemograma, 3: refRdwHemograma };
    const target = targets[etapaHemograma];
    const t = setTimeout(() => {
      if (target && target.current) {
        target.current.focus();
      }
    }, 100);
    return () => clearTimeout(t);
  }, [etapaHemograma, inputs.sexo, inputs.bariatrica, inputs.gestante, inputs.data_coleta, etapaInicio, modoMedico]);

  function agendarAvancoHemograma(etapaAtual, valorAtual, maxChars) {
    if (timerHemogramaRef.current) clearTimeout(timerHemogramaRef.current);
    if (!valorAtual || String(valorAtual).length < 1) return;
    if (String(valorAtual).length >= maxChars) {
      setEtapaHemograma(prev => Math.max(prev, etapaAtual + 1));
      return;
    }
    // 2100ms (era 1300) \u2014 d\u00e1 conforto extra no mobile, especialmente quando o usu\u00e1rio digita
    // um decimal e demora pra encontrar o ponto/v\u00edrgula no teclado num\u00e9rico.
    timerHemogramaRef.current = setTimeout(() => {
      setEtapaHemograma(prev => Math.max(prev, etapaAtual + 1));
    }, 2100);
  }

  function revalidaGestante(pc) {
    if (!pc || pc === 'BLOQUEADO' || !pc.gestante) {
      return { gestanteAtual: false, semanas: null, dum: null };
    }
    const hoje = new Date();
    let semanasCalc = null;
    let dum = pc.dum || null;
    if (pc.semanas_gestacao_triagem && pc.data_triagem_gestacao) {
      const dataTriagem = new Date(pc.data_triagem_gestacao);
      const diasDecorridos = (hoje - dataTriagem) / (1000 * 60 * 60 * 24);
      semanasCalc = Number(pc.semanas_gestacao_triagem) + (diasDecorridos / 7);
    }
    else if (pc.semanas_gestacao && pc.created_at) {
      const dataTriagem = new Date(pc.created_at);
      const diasDecorridos = (hoje - dataTriagem) / (1000 * 60 * 60 * 24);
      semanasCalc = Number(pc.semanas_gestacao) + (diasDecorridos / 7);
    }
    if (semanasCalc === null) {
      return { gestanteAtual: true, semanas: null, dum };
    }
    if (semanasCalc > 40) {
      return { gestanteAtual: false, semanas: null, dum: null };
    }
    return { gestanteAtual: true, semanas: Math.round(semanasCalc), dum };
  }

  async function handleBuscarHistorico() {
    const cpfDigits = String(inputs.cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      setHistoricoMsg("Informe um CPF v\u00e1lido (11 d\u00edgitos) antes de buscar.");
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }
    setHistoricoBuscando(true);
    setHistoricoMsg('');

    // RLS Fase 2: as duas séries vêm por RPC; credenciais centralizadas em cred.js.
    const [tRes, aRes] = await Promise.all([
      supabase.rpc('triagens_por_cpf', { p_cpf: cpfDigits, ...credAmbas() }),
      supabase.rpc('avaliacoes_por_cpf', { p_cpf: cpfDigits, p_ordem: 'asc', ...credAmbas() }),
    ]);

    setHistoricoBuscando(false);

    const triagensOk = tRes.data && tRes.data.ok;
    if (tRes.error && aRes.error) {
      setHistoricoMsg("Erro ao buscar hist\u00f3rico. Tente novamente.");
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }

    const norm = (v) => {
      const n = Number(v);
      return (v === null || v === undefined || v === '' || isNaN(n)) ? null : n;
    };

    const serie = [];

    (triagensOk ? tRes.data.triagens : []).forEach((r) => {
      serie.push({
        data: r.created_at,
        hb: norm(r.hemoglobina),
        vcm: norm(r.vcm),
        rdw: norm(r.rdw),
        ferritina: null,
        sat: null,
        origem: 'triagem',
      });
    });

    (((aRes.data && aRes.data.ok) ? aRes.data.linhas : []) || []).forEach((r) => {
      serie.push({
        data: r.data_coleta,
        hb: norm(r.hemoglobina),
        vcm: norm(r.vcm),
        rdw: norm(r.rdw),
        ferritina: norm(r.ferritina),
        sat: norm(r.sat_transf),
        origem: 'avaliacao',
      });
    });

    serie.sort((a, b) => new Date(a.data) - new Date(b.data));

    const pontosG1 = serie.filter((p) => p.hb !== null || p.vcm !== null || p.rdw !== null);
    if (pontosG1.length < 2) {
      setHistoricoMsg("N\u00c3O H\u00c1 ELEMENTOS PARA GR\u00c1FICO");
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }

    setHistoricoData({ cpf: cpfDigits, serie });
  }

  return (<>
    <style>{`
      @keyframes rfArrowPulse {
        0%, 100% { transform: translateY(0); opacity: 0.6; }
        50% { transform: translateY(-6px); opacity: 1; }
      }
      .rf-arrow-x { animation: rfArrowPulse 1s ease-in-out infinite; }
      @keyframes rfPlayBlink {
        0%, 100% { box-shadow: 0 0 0 0 rgba(227,174,55,0.7); }
        50%      { box-shadow: 0 0 0 8px rgba(227,174,55,0); }
      }
      .rf-play-ready { background-color: #d1d5db; animation: rfPlayBlink 1s ease-in-out infinite; }
    `}</style>
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[97vh] sm:max-h-[95vh] overflow-y-auto shadow-2xl relative">
        {/* Barra do topo no padr\u00e3o da landing: fundo branco, logo-fada \u00e0 esquerda + "RedFairy" em serif (dois tons),
            X de fechar na extremidade direita centralizado verticalmente. Substitui a Fada grande + nome que ocupavam muito espa\u00e7o vertical. */}
        <div style={{ background: flagBariatricaOBA ? '#6B7280' : '#fff', borderBottom: '1px solid #f1f5f9', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={obaLogo} alt="Projeto OBA" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', margin: 0 }}>
              <span style={{ color: '#facc15', fontWeight: 700 }}>{"Projeto OBA"}<sup style={{ fontSize: '0.5em', verticalAlign: 'super' }}>{"®"}</sup></span>
            </h2>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className={`w-7 h-7 rounded-full ${flagBariatricaOBA ? 'bg-yellow-400 hover:bg-yellow-500 text-black' : 'bg-red-700 hover:bg-red-800 text-white'} text-sm flex items-center justify-center transition-colors shadow-md`}
            style={{ fontFamily: 'Apple Color Emoji, Segoe UI Symbol, Noto Sans Symbols, sans-serif', lineHeight: 1 }}>
            {"\u2715"}
          </button>
        </div>

        {/* Faixa pink mais estreita: 1 linha de texto principal + subtexto menor (centralizados). Seta vertical alinhada ao centro do X acima. */}
        <div style={{ background: '#FEF2F2', padding: '6px 14px 6px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <p style={{ fontSize: '0.62rem', fontWeight: 600, color: '#7B1E1E', letterSpacing: '0.5px', lineHeight: 1.2, margin: 0 }}>
              {twTopo}
            </p>
            {(() => {
              const pc = pacienteConhecido;
              if (!pc || pc === 'BLOQUEADO' || !(pc.nome || pc.sexo)) {
                return (
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#991B1B', letterSpacing: '0.5px', marginTop: 1, opacity: 0.8, lineHeight: 1.2 }}>
                    {"SEUS DADOS DE LOGIN EST\u00c3O SALVOS"}
                  </p>
                );
              }
              const sexoExt = pc.sexo === 'F' ? 'Feminino' : pc.sexo === 'M' ? 'Masculino' : '';
              const uh = pc.ultimoHemograma;
              const dataBR = uh && uh.data_coleta ? String(uh.data_coleta).slice(0, 10).split('-').reverse().join('/') : '';
              return (
                <>
                  <p style={{ fontSize: '0.66rem', fontWeight: 800, color: '#7B1E1E', lineHeight: 1.2, marginTop: 1 }}>
                    {(pc.nome || '').toUpperCase()}{sexoExt ? ' \u00b7 ' + sexoExt : ''}
                  </p>
                  {uh && (
                    <p style={{ fontSize: '0.58rem', fontWeight: 600, color: '#991B1B', lineHeight: 1.2, marginTop: 1, opacity: 0.9 }}>
                      {'Avalia\u00e7\u00e3o anterior' + (dataBR ? ' (' + dataBR + ')' : '') + ': '}
                      {uh.hemoglobina != null ? 'Hb ' + uh.hemoglobina : ''}
                      {uh.vcm != null ? ' \u00b7 VCM ' + uh.vcm : ''}
                      {uh.rdw != null ? ' \u00b7 RDW ' + uh.rdw : ''}
                    </p>
                  )}
                </>
              );
            })()}
          </div>
          {/* Seta em coluna propria (item flex): nunca sobrepoe o texto. Alinhada sob o X. */}
          <span className="rf-arrow-x" style={{ fontSize: '1.4rem', color: '#b91c1c', fontWeight: 900, pointerEvents: 'none', lineHeight: 1, flexShrink: 0, marginRight: '8px' }}>
            {"\u2191"}
          </span>
        </div>

        {/* Subt\u00edtulo TRIAGEM DO ERITRON centralizado abaixo da faixa pink (sem logo grande nem nome RedFairy duplicados) */}
        <div className="bg-white px-6 pt-5 pb-2 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500">{"\ud83e\ude7a Começamos por aqui"}</p>
          <h3 className="text-base font-semibold text-gray-800 mt-1 leading-tight">{fraseAbertura}</h3>
          {/* CPF já conhecido (entrou logado): pequeno e preto sob o título, no lugar do campo. */}
          {cpfBloqueado && inputs.cpf && (
            <p className="text-xs font-bold text-black mt-1">{formatarCPF(inputs.cpf)}</p>
          )}
          {/* (g) frase "Com apenas tres parametros..." removida (aparecia em 3 lugares). */}
        </div>

        <div className="p-6 space-y-4">
          {mostrarCPF && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                CPF{modoMedico ? ' do Paciente' : ''}
              </label>
              {/* CPF 2/3 + bot\u00e3o Buscar Hist\u00f3rico 1/3 lado a lado para reduzir altura do modal */}
              <div className="flex gap-2 items-start">
                <input
                  ref={refCpfInput}
                  type="text"
                  name="cpf"
                  value={inputs.cpf}
                  onChange={e => handleChange({ target: { name: 'cpf', value: formatarCPF(e.target.value) } })}
                  placeholder="000.000.000-00"
                  disabled={cpfBloqueado}
                  readOnly={cpfBloqueado}
                  tabIndex={cpfBloqueado ? -1 : 0}
                  style={{ flex: '2 1 0' }}
                  className={`border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    cpfBloqueado ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' :
                    erros.cpf ? 'border-red-500' :
                    etapaInicio === 1 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' :
                    'border-yellow-300 bg-yellow-50'
                  }`}
                />
                {modoMedico && (
                  <button
                    type="button"
                    onClick={handleBuscarHistorico}
                    disabled={historicoBuscando}
                    style={{ flex: '1 1 0' }}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs px-2 py-2.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                    {historicoBuscando ? 'Buscando...' : "\ud83d\udcca Buscar Hist\u00f3rico"}
                  </button>
                )}
              </div>
              {erros.cpf && <p className="text-red-500 text-xs mt-1">{erros.cpf}</p>}
              {modoMedico && historicoMsg && (
                <p className="text-xs text-center mt-1 font-medium text-red-700">{historicoMsg}</p>
              )}

              {(modoMedico || cpfBloqueado) && pacienteConhecido === 'BLOQUEADO' && (
                <div className="mt-3 p-4 rounded-xl bg-red-50 border-2 border-red-300">
                  <p className="text-sm font-bold text-red-800 mb-2">
                    {"\ud83d\uded1 Limite de triagens gratuitas atingido"}
                  </p>
                  <p className="text-xs text-red-900 leading-relaxed">
                    {"Para continuar avaliando a evolu\u00e7\u00e3o desse paciente, oriente-o a se "}<strong>CADASTRAR</strong>{" no Projeto OBA® para receber gratuitamente um primeiro pedido de exames (Hemograma + Ferritina + Satura\u00e7\u00e3o da Transferrina). E se voc\u00ea ainda n\u00e3o \u00e9 "}<strong>AFILIADO</strong>{", se filie para ter acesso aos benef\u00edcios do Programa."}
                  </p>
                </div>
              )}

              {(modoMedico || cpfBloqueado) && pacienteConhecido && pacienteConhecido !== 'BLOQUEADO' && (() => {
                const pc = pacienteConhecido;
                let idadeStr = '';
                if (pc.data_nascimento) {
                  const [ay, am, ad] = String(pc.data_nascimento).split('-').map(Number);
                  if (ay && am && ad) {
                    const h = new Date();
                    let anos = h.getFullYear() - ay;
                    let meses = (h.getMonth() + 1) - am;
                    if (h.getDate() < ad) meses -= 1;
                    if (meses < 0) { anos -= 1; meses += 12; }
                    const aTxt = anos + (anos === 1 ? ' ano' : ' anos');
                    const mTxt = meses === 0 ? '' : (meses === 1 ? " e 1 m\u00eas" : ' e ' + meses + ' meses');
                    idadeStr = aTxt + mTxt;
                  }
                }
                const sexoStr = pc.sexo === 'F' ? 'Feminino' : pc.sexo === 'M' ? 'Masculino' : '';
                const bariStr = pc.bariatrica ? (pc.sexo === 'F' ? "Bari\u00e1trica" : "Bari\u00e1trico") : '';
                const nomeStr = (pc.nome && String(pc.nome).trim()) ? String(pc.nome).trim() : '';
                const partes = [];
                if (nomeStr) partes.push(nomeStr);
                if (sexoStr) partes.push(sexoStr);
                if (idadeStr) partes.push(idadeStr);
                if (bariStr) partes.push(bariStr);
                if (partes.length === 0) return null;
                return (
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6B7280', fontWeight: 600, letterSpacing: '0.2px' }}>
                    {partes.join(' | ')}
                  </p>
                );
              })()}
            </div>
          )}

          {!pacConhCompleto && (<>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Sexo</label>
                <select
                  ref={refSexoSelect}
                  name="sexo"
                  value={inputs.sexo}
                  onChange={handleChange}
                  disabled={pacConhSexoOk || (modoMedico && etapaInicio < 2)}
                  className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    pacConhSexoOk ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' :
                    erros.sexo ? 'border-red-500' :
                    etapaInicio === 2 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' :
                    etapaInicio > 2 ? 'border-yellow-300 bg-yellow-50' :
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
                  disabled={pacConhDataNascOk || (modoMedico && etapaInicio < 3)}
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
                    pacConhDataNascOk ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' :
                    erros.dataNascimento ? 'border-red-500' :
                    etapaInicio === 3 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' :
                    etapaInicio > 3 ? 'border-yellow-300 bg-yellow-50' :
                    'border-gray-200 bg-gray-50 text-gray-400'
                  }`}
                />
                {erros.dataNascimento && <p className="text-red-500 text-xs mt-1">{erros.dataNascimento}</p>}
              </div>
            </div>
          </>)}

          {inputs.sexo === 'F' && (() => {
            // Gestante conhecida vem PR\u00c9-MARCADA com as semanas recalculadas, mas o campo
            // \u00e9 EDIT\u00c1VEL \u2014 a gravidez pode ter terminado (aborto/interrup\u00e7\u00e3o) ou a paciente
            // querer ajustar o n\u00famero de semanas.
            const gestanteConhecida = !!pacienteConhecido && pacienteConhecido !== 'BLOQUEADO' && !!pacienteConhecido.gestante;
            const showSemanas = inputs.gestante;
            return (
              <div className="rounded-xl border border-pink-200 bg-pink-50 p-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer" style={{ flex: '1 1 0' }}>
                    <input
                      type="checkbox"
                      name="gestante"
                      checked={!!inputs.gestante}
                      onChange={handleChange}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-pink-700">{"Gestante"}</span>
                  </label>
                  {showSemanas && (
                    <div style={{ flex: '1 1 0' }}>
                      <input
                        type="number"
                        name="semanas_gestacao"
                        value={inputs.semanas_gestacao}
                        onChange={handleChange}
                        min="1" max="42"
                        placeholder={"Semanas de gesta\u00e7\u00e3o"}
                        className={`w-full border-2 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400 ${erros.semanas_gestacao ? 'border-red-500' : 'border-pink-400 bg-white'}`}
                      />
                    </div>
                  )}
                </div>
                {showSemanas && gestanteConhecida && (
                  <p className="text-[11px] text-pink-600 mt-1">{"Semanas atualizadas por c\u00e1lculo desde a avalia\u00e7\u00e3o anterior \u2014 edite se necess\u00e1rio."}</p>
                )}
                {erros.semanas_gestacao && <p className="text-red-500 text-xs mt-1">{erros.semanas_gestacao}</p>}
              </div>
            );
          })()}

          {pacienteConhecido !== 'BLOQUEADO' && inputs.sexo && !(pacienteConhecido && pacienteConhecido.bariatrica === true) && (() => {
            // Card Bari\u00e1trica aparece SEMPRE (paciente ainda nao registrado: editavel;
            // paciente conhecido com bariatrica=true no perfil: pre-marcado e disabled,
            // pois a condicao bariatrica e' permanente uma vez registrada).
            // S\u00f3 aparece ap\u00f3s sele\u00e7\u00e3o do sexo \u2014 evita texto gen\u00e9rico "Sou paciente bari\u00e1trico/a".
            const lockedConhecido = !!pacienteConhecido && pacienteConhecido.bariatrica === true;
            const bariatricaLocked = lockedConhecido || flagBariatricaOBA;
            const checked = bariatricaLocked ? true : inputs.bariatrica;
            return (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <label className={`flex items-center gap-2 ${bariatricaLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    name="bariatrica"
                    checked={checked}
                    onChange={bariatricaLocked ? undefined : handleChange}
                    disabled={bariatricaLocked}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-amber-700">
                    {modoMedico
                      ? (inputs.sexo === 'F' ? "Paciente bari\u00e1trica" : "Paciente bari\u00e1trico")
                      : (inputs.sexo === 'F' ? "Sou bari\u00e1trica" : "Sou bari\u00e1trico")}
                    {bariatricaLocked ? (lockedConhecido ? " (j\u00e1 registrado)" : " (Projeto OBA\u00ae)") : ""}
                  </span>
                </label>
              </div>
            );
          })()}

          {pacienteConhecido !== 'BLOQUEADO' && (<>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{"Data do Hemograma"}</label>
              {/* Mesmo padr\u00e3o de grid grid-cols-2 do bloco Sexo/Data Nascimento, garantindo larguras id\u00eanticas. */}
              <div className="grid grid-cols-2 gap-3 items-start">
                <input
                  ref={refDataColeta}
                  type="text"
                  name="data_coleta"
                  autoComplete="off"
                  value={inputs.data_coleta}
                  onChange={e => {
                    // M\u00e1scara DD/MM/AAAA igual \u00e0 Data de Nascimento
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                    let v = digits;
                    if (digits.length <= 2) v = digits;
                    else if (digits.length <= 4) v = digits.slice(0, 2) + '/' + digits.slice(2);
                    else v = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
                    handleChange({ target: { name: 'data_coleta', value: v } });
                  }}
                  disabled={modoMedico && etapaInicio < 4}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="DD/MM/AAAA"
                  className={'w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ' + ((modoMedico && etapaInicio < 4) ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' : erros.data_coleta ? 'border-red-500' : (etapaInicio === 4 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' : 'border-yellow-300 bg-yellow-50'))}
                />
                <label className="flex items-center gap-2 cursor-pointer self-center">
                  <input
                    type="checkbox"
                    name="data_estimada"
                    checked={inputs.data_estimada}
                    onChange={handleChange}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-xs text-gray-500">Data estimada</span>
                </label>
              </div>
              {erros.data_coleta && <p className="text-red-500 text-xs mt-1">{erros.data_coleta}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-600">{"\ud83d\udcca Hemograma"}</p>
                {/* (PWA fase 5) Ilustra\u00e7\u00e3o: onde achar DATA/HB/VCM/RDW no exame. S\u00f3 paciente. */}
                {!modoMedico && (
                  <button type="button" onClick={() => setMostrarExemploHemograma(true)}
                    className="text-[0.68rem] font-semibold text-red-700 underline whitespace-nowrap">
                    {"Onde acho isso no meu exame?"}
                  </button>
                )}
              </div>
              {!modoMedico && mostrarExemploHemograma && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
                  style={{ background: 'rgba(0,0,0,0.95)' }}
                  onClick={() => setMostrarExemploHemograma(false)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
                    style={{ maxHeight: '85vh' }}
                    onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <p className="font-bold text-red-700 text-sm">{"Onde acho isso no meu exame?"}</p>
                      <button onClick={() => setMostrarExemploHemograma(false)}
                        className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Fechar">{"✕"}</button>
                    </div>
                    <div className="overflow-y-auto p-5">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {"Vá no ERITROGRAMA - geralmente a primeira parte do HEMOGRAMA - procure e anote o valor da HEMOGLOBINA expresso em g/dL. Abaixo você encontra e anota o VCM (ou VGM) que corresponde ao VOLUME CORPUSCULAR MÉDIO (ou VOLUME GLOBULAR MÉDIO) expresso em fL, por fim geralmente o último item é o RDW, ou RDW-CV expresso em %; anote também."}
                      </p>
                      <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                        <img
                          src="/hemograma-exemplo.jpg"
                          alt="Exemplo: HEMOGLOBINA, VCM e RDW no hemograma"
                          className="w-full h-auto block"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Grid 5 colunas: Hb (col-span-2), VCM (1), RDW (1), PLAY (1). PLAY substitui o bot\u00e3o CONFIRMO redondo. */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <label className="block text-[0.66rem] font-medium text-gray-600 mb-1 whitespace-nowrap">{"HEMOGLOBINA (g/dL)"}</label>
                  <input
                    ref={refHbHemograma}
                    type="text"
                    inputMode="decimal"
                    name="hemoglobina"
                    autoComplete="off"
                    value={inputs.hemoglobina}
                    maxLength={4}
                    disabled={etapaHemograma < 1 || (modoMedico && etapaInicio < 5)}
                    onChange={e => {
                      let v = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, 4);
                      handleChange({ target: { name: 'hemoglobina', value: v } });
                      agendarAvancoHemograma(1, v, 4);
                    }}
                    className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
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
                  <label className="block text-[0.66rem] font-medium text-gray-600 mb-1 whitespace-nowrap">VCM (fL)</label>
                  <input
                    ref={refVcmHemograma}
                    type="text"
                    inputMode="decimal"
                    name="vcm"
                    autoComplete="off"
                    value={inputs.vcm}
                    maxLength={5}
                    disabled={etapaHemograma < 2 || (modoMedico && etapaInicio < 5)}
                    onChange={e => {
                      let v = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, 5);
                      handleChange({ target: { name: 'vcm', value: v } });
                      agendarAvancoHemograma(2, v, 5);
                    }}
                    className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
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
                  <label className="block text-[0.66rem] font-medium text-gray-600 mb-1 whitespace-nowrap">RDW-CV (%)</label>
                  <input
                    ref={refRdwHemograma}
                    type="text"
                    inputMode="decimal"
                    name="rdw"
                    autoComplete="off"
                    value={inputs.rdw}
                    maxLength={4}
                    disabled={etapaHemograma < 3 || (modoMedico && etapaInicio < 5)}
                    onChange={e => {
                      let v = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, 4);
                      handleChange({ target: { name: 'rdw', value: v } });
                      agendarAvancoHemograma(3, v, 4);
                    }}
                    className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      etapaHemograma === 3
                        ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400'
                        : etapaHemograma > 3
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-300 bg-gray-100 text-gray-400'
                    }`}
                  />
                  {erros.rdw && <p className="text-red-500 text-xs mt-0.5">{erros.rdw}</p>}
                </div>
                {/* 5\u00aa coluna: tri\u00e2ngulo PLAY \u2014 cinza quando faltam campos, vermelho piscando quando os 3 est\u00e3o preenchidos. */}
                <div className="flex flex-col items-center justify-end pb-[3px]">
                  {(() => {
                    const ready = etapaHemograma >= 4 && inputs.hemoglobina && inputs.vcm && inputs.rdw;
                    return <PlayButton onClick={handleAvaliar} disabled={!ready} ariaLabel="Prosseguir" />;
                  })()}
                </div>
              </div>
              {/* Frase de orienta\u00e7\u00e3o subiu para logo abaixo dos campos do hemograma (em mai\u00fasculas, laranja, centralizada),
                  com bot\u00e3o "\u2190 VOLTAR" no canto esquerdo no mesmo n\u00edvel \u2014 economiza altura. */}
              <div className="flex items-center gap-2 mt-2 min-h-[1.25rem]">
                <button
                  onClick={onFechar}
                  className="flex-shrink-0 text-xs text-gray-500 hover:text-gray-800 underline whitespace-nowrap">
                  {"\u2190 VOLTAR"}
                </button>
                {etapaHemograma < 4 && (
                  <p className="flex-1 text-[0.66rem] text-center tracking-wide font-semibold" style={{ color: '#EA580C' }}>
                    {"PREENCHA OS CAMPOS AMARELOS EM SEQU\u00caNCIA"}
                  </p>
                )}
              </div>
            </div>
          </>)}
        </div>

        {pacienteConhecido !== 'BLOQUEADO' && (
          <div className="px-6 pb-3 flex flex-col items-center gap-2">
            {etapaHemograma >= 4 && inputs.hemoglobina && inputs.vcm && inputs.rdw && onAprofundar && (
              <button
                onClick={() => onAprofundar(inputs)}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm flex flex-col items-center mb-1">
                <span>{"\ud83d\udccb TENHO TAMB\u00c9M FERRITINA E SAT. DA TRANSFERRINA"}</span>
                <span className="text-xs font-normal opacity-90 mt-1">{"Avalia\u00e7\u00e3o completa do eritron"}</span>
              </button>
            )}
            {erroGeral && (
              <p className="text-xs text-red-600 font-semibold text-center mt-2">{erroGeral}</p>
            )}
          </div>
        )}
      </div>
    </div>
    {historicoData && (
      <HistoricoChartModal
        cpf={historicoData.cpf}
        serie={historicoData.serie}
        sexo={inputs.sexo}
        gestante={!!inputs.gestante}
        onFechar={() => setHistoricoData(null)} />
    )}
  </>)
}
