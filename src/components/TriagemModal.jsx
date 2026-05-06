import { useState } from 'react'
import { triagemEritron } from '../engine/decisionEngine'
import logo from '../assets/logo.png'

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
    semanas_gestacao: '',
    dataNascimento: '',
    hemoglobina: '',
    vcm: '',
    rdw: '',
  })
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl">

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
                type="text"
                name="cpf"
                value={inputs.cpf}
                onChange={e => handleChange({ target: { name: 'cpf', value: formatarCPF(e.target.value) } })}
                placeholder="000.000.000-00"
                className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${erros.cpf ? 'border-red-500' : 'border-gray-200'}`}
              />
              {erros.cpf && <p className="text-red-500 text-xs mt-1">{erros.cpf}</p>}
            </div>
          )}

          {/* Sexo + Data de Nascimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Sexo</label>
              <select
                name="sexo"
                value={inputs.sexo}
                onChange={handleChange}
                className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${erros.sexo ? 'border-red-500' : 'border-gray-200'}`}
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
                type="text"
                name="dataNascimento"
                value={inputs.dataNascimento}
                onChange={handleChange}
                inputMode="numeric"
                maxLength={10}
                placeholder="DD/MM/AAAA"
                className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${erros.dataNascimento ? 'border-red-500' : 'border-gray-200'}`}
              />
              {erros.dataNascimento && <p className="text-red-500 text-xs mt-1">{erros.dataNascimento}</p>}
            </div>
          </div>

          {/* Gestante (so se sexo F) */}
          {inputs.sexo === 'F' && (
            <div className="rounded-xl border border-pink-200 bg-pink-50 p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="gestante"
                  checked={inputs.gestante}
                  onChange={handleChange}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium text-pink-700">Gestante</p>
                  <p className="text-xs text-pink-600">{modoMedico ? 'Marque se a paciente está grávida' : 'Marque se está grávida'}</p>
                </div>
              </label>
              {inputs.gestante && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Semanas de gestação</label>
                  <input
                    type="number"
                    name="semanas_gestacao"
                    value={inputs.semanas_gestacao}
                    onChange={handleChange}
                    min="1" max="42"
                    placeholder="Ex: 24"
                    className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${erros.semanas_gestacao ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {erros.semanas_gestacao && <p className="text-red-500 text-xs mt-1">{erros.semanas_gestacao}</p>}
                </div>
              )}
            </div>
          )}

          {/* Hb, VCM, RDW (bordas vermelhas - sao de triagem) */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">📋 Hemograma</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hemoglobina (g/dL)</label>
                <input
                  type="number" step="0.1"
                  name="hemoglobina"
                  value={inputs.hemoglobina}
                  onChange={handleChange}
                  className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${erros.hemoglobina ? 'border-red-500' : 'border-red-500'}`}
                />
                {erros.hemoglobina && <p className="text-red-500 text-xs mt-0.5">{erros.hemoglobina}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">VCM (fL)</label>
                <input
                  type="number" step="0.1"
                  name="vcm"
                  value={inputs.vcm}
                  onChange={handleChange}
                  className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${erros.vcm ? 'border-red-500' : 'border-red-500'}`}
                />
                {erros.vcm && <p className="text-red-500 text-xs mt-0.5">{erros.vcm}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">RDW-CV (%)</label>
                <input
                  type="number" step="0.1"
                  name="rdw"
                  value={inputs.rdw}
                  onChange={handleChange}
                  className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${erros.rdw ? 'border-red-500' : 'border-red-500'}`}
                />
                {erros.rdw && <p className="text-red-500 text-xs mt-0.5">{erros.rdw}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Acoes */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onFechar}
            className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
          >
            Fechar
          </button>
          <button
            onClick={handleAvaliar}
            className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold transition-colors text-sm"
          >
            Avaliar Triagem
          </button>
        </div>
      </div>
    </div>
  )
}
