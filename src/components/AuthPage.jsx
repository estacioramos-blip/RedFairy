import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'

export default function AuthPage({ onVoltar }) {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [sexo, setSexo] = useState('F')
  const [dataNascimento, setDataNascimento] = useState('')
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function handleLogin() {
    setLoading(true)
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos.')
    setLoading(false)
  }

  async function handleCadastro() {
    setLoading(true)
    setErro('')
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) {
      if (error.message.includes('after')) {
        setErro('Por segurança, aguarde alguns segundos antes de tentar novamente.')
      } else if (error.message.includes('already registered')) {
        setErro('Este e-mail já está cadastrado. Tente fazer login.')
      } else if (error.message.includes('Password')) {
        setErro('A senha deve ter pelo menos 6 caracteres.')
      } else {
        setErro('Erro ao cadastrar. Tente novamente.')
      }
      setLoading(false); return
    }

    if (data.user) {
      const partes = dataNascimento.split('/')
      const dataFormatada = partes.length === 3
        ? `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`
        : dataNascimento

      await supabase.from('profiles').insert({
        id: data.user.id,
        nome,
        sexo,
        data_nascimento: dataFormatada,
        cpf: cpf.replace(/\D/g, ''),
      })
    }
    setSucesso('Cadastro realizado! Verifique seu e-mail para confirmar.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 relative">
      <button onClick={onVoltar} className="absolute top-4 left-4 bg-white text-red-700 border border-red-300 px-3 py-1 rounded-lg text-sm shadow flex items-center gap-1">← Voltar</button>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src={logo}
            alt="RedFairy"
            className="w-16 h-16 object-contain mx-auto mb-2"
            style={{ filter: "drop-shadow(0 0 12px rgba(239,68,68,0.6))" }}
          />
          <h2 className="text-2xl font-bold text-red-700">RedFairy</h2>
          <p className="text-gray-500 text-sm">Modo Paciente</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setModo('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${modo === 'login' ? 'bg-white shadow text-red-700' : 'text-gray-500'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setModo('cadastro')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${modo === 'cadastro' ? 'bg-white shadow text-red-700' : 'text-gray-500'}`}
          >
            Cadastrar
          </button>
        </div>

        <div className="space-y-4">
          {modo === 'cadastro' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">CPF</label>
                  <input type="text" value={cpf} onChange={e => setCpf(e.target.value)}
                    placeholder="000.000.000-00" maxLength={14} inputMode="numeric"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Sexo</label>
                  <select value={sexo} onChange={e => setSexo(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nascimento</label>
                  <input
                    type="text"
                    value={dataNascimento}
                    onChange={e => setDataNascimento(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    inputMode="numeric"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>

          {erro && <p className="text-red-500 text-sm">{erro}</p>}
          {sucesso && <p className="text-green-600 text-sm">{sucesso}</p>}

          <button
            onClick={modo === 'login' ? handleLogin : handleCadastro}
            disabled={loading}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </div>
      </div>
    </div>
  )
}