"""
add_sexo_idade_dashboard.py

Solucao definitiva do problema 'sexo nao passa no fluxo Paciente/Bariatrico':

1. Adiciona dropdown Sexo (F/M) + input Idade visiveis no topo de Nova Avaliacao
2. State inicial de inputs agora inclui sexo='' e idade=''
3. useEffect que pre-preenche inputs.sexo/idade a partir do profile quando carrega
4. handleAvaliar passa a usar inputs.sexo e inputs.idade diretamente (paridade com Calculator)
5. Hipermenorreia/Gestante condicionais agora dependem de inputs.sexo === 'F'
   (reagem em tempo real ao dropdown)
6. Remove os console.logs de debug
"""

from pathlib import Path
import sys
import re

ARQ = Path("src/components/PatientDashboard.jsx")

if not ARQ.exists():
    print(f"ERRO: arquivo nao encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERACAO 1 — state inicial de inputs: adicionar sexo e idade
# ─────────────────────────────────────────────────────────────────────
ancora_1 = """  const [inputs, setInputs] = useState({
    dataColeta: '', ferritina: '', hemoglobina: '',
    vcm: '', rdw: '', satTransf: '',
    bariatrica: false, vegetariano: false, perda: false,
    hipermenorreia: false, gestante: false,
    aspirina: false, vitaminaB12: false, ferroOral: false,
  })"""

novo_1 = """  const [inputs, setInputs] = useState({
    sexo: '', idade: '',
    dataColeta: '', ferritina: '', hemoglobina: '',
    vcm: '', rdw: '', satTransf: '',
    bariatrica: false, vegetariano: false, perda: false,
    hipermenorreia: false, gestante: false,
    aspirina: false, vitaminaB12: false, ferroOral: false,
  })"""

if ancora_1 not in src:
    if "sexo: '', idade: ''," in src:
        print("AVISO 1: state inputs ja tem sexo/idade.")
    else:
        print("ERRO 1: ancora do state inputs nao encontrada.")
        sys.exit(1)
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("OK 1: state inputs agora inclui sexo e idade.")

# ─────────────────────────────────────────────────────────────────────
# ALTERACAO 2 — useEffect para pre-preencher sexo/idade do profile
# Inserimos logo depois do useEffect de handleDemoKey
# ─────────────────────────────────────────────────────────────────────
ancora_2 = """    window.addEventListener('keydown', handleDemoKey)
    return () => window.removeEventListener('keydown', handleDemoKey)
  }, [])

  async function carregarDados() {"""

novo_2 = """    window.addEventListener('keydown', handleDemoKey)
    return () => window.removeEventListener('keydown', handleDemoKey)
  }, [])

  // Pre-preenche sexo/idade em inputs assim que o profile for carregado
  useEffect(() => {
    if (!profile) return
    const idadeProfile = profile.data_nascimento ? calcularIdade(profile.data_nascimento) : ''
    setInputs(prev => ({
      ...prev,
      sexo: prev.sexo || profile.sexo || '',
      idade: prev.idade || (idadeProfile ? String(idadeProfile) : ''),
    }))
  }, [profile])

  async function carregarDados() {"""

if ancora_2 not in src:
    if "Pre-preenche sexo/idade em inputs" in src:
        print("AVISO 2: useEffect de pre-preenchimento ja existe.")
    else:
        print("ERRO 2: ancora do useEffect nao encontrada.")
        sys.exit(1)
else:
    src = src.replace(ancora_2, novo_2, 1)
    print("OK 2: useEffect pre-preenche sexo/idade a partir do profile.")

# ─────────────────────────────────────────────────────────────────────
# ALTERACAO 3 — handleAvaliar: usar inputs.sexo e inputs.idade direto
# + remover logs de debug
# ─────────────────────────────────────────────────────────────────────
ancora_3 = """  async function handleAvaliar() {
    console.log('[RF DEBUG] === handleAvaliar chamado ===')
    console.log('[RF DEBUG] profile:', profile)
    console.log('[RF DEBUG] profile.sexo:', profile?.sexo)
    console.log('[RF DEBUG] profile.data_nascimento:', profile?.data_nascimento)
    console.log('[RF DEBUG] inputs.sexo:', inputs.sexo)
    console.log('[RF DEBUG] inputs.idade:', inputs.idade)
    console.log('[RF DEBUG] inputs completo:', inputs)

    if (!profile) return

    // Fallback sexo: profile primeiro, depois inputs (demo/bariatrico)
    const sexoFinal = profile.sexo || inputs.sexo || ''
    // Fallback idade: calculada do profile, depois inputs.idade
    const idadeFinal = profile.data_nascimento
      ? calcularIdade(profile.data_nascimento)
      : (inputs.idade ? Number(inputs.idade) : null)

    console.log('[RF DEBUG] sexoFinal calculado:', sexoFinal)
    console.log('[RF DEBUG] idadeFinal calculada:', idadeFinal)

    if (!sexoFinal || !idadeFinal) {
      console.log('[RF DEBUG] ABORTANDO: sexo ou idade invalidos')
      alert('Antes de avaliar, use um dos atalhos: Ctrl+M (masc 20a), Ctrl+B (masc 50a), Ctrl+F (fem 20a), Ctrl+G (fem 50a) para definir sexo e idade.')
      return
    }

    if (!inputs.ferritina || !inputs.hemoglobina || !inputs.vcm || !inputs.rdw || !inputs.satTransf) {
      alert('Preencha todos os campos laboratoriais: Ferritina, Hemoglobina, VCM, RDW e Sat. Transferrina.')
      return
    }
    if (!inputs.dataColeta) {
      alert('Informe a data da coleta.')
      return
    }

    const inputsNumericos = {
      ...inputs,
      cpf: profile.cpf || '',
      sexo: sexoFinal,
      idade: idadeFinal,
      ferritina: Number(inputs.ferritina),
      hemoglobina: Number(inputs.hemoglobina),
      vcm: Number(inputs.vcm),
      rdw: Number(inputs.rdw),
      satTransf: Number(inputs.satTransf),
    }
    const res = avaliarPaciente(inputsNumericos)"""

novo_3 = """  async function handleAvaliar() {
    if (!profile) return

    // Validacao: sexo e idade
    if (!inputs.sexo) {
      alert('Selecione o Sexo.')
      return
    }
    const idadeNum = Number(inputs.idade)
    if (!idadeNum || idadeNum < 12 || idadeNum > 100) {
      alert('Informe uma idade valida (12 a 100 anos).')
      return
    }

    // Validacao: campos laboratoriais
    if (!inputs.ferritina || !inputs.hemoglobina || !inputs.vcm || !inputs.rdw || !inputs.satTransf) {
      alert('Preencha todos os campos laboratoriais: Ferritina, Hemoglobina, VCM, RDW e Sat. Transferrina.')
      return
    }
    if (!inputs.dataColeta) {
      alert('Informe a data da coleta.')
      return
    }

    const inputsNumericos = {
      ...inputs,
      cpf: profile.cpf || '',
      sexo: inputs.sexo,
      idade: idadeNum,
      ferritina: Number(inputs.ferritina),
      hemoglobina: Number(inputs.hemoglobina),
      vcm: Number(inputs.vcm),
      rdw: Number(inputs.rdw),
      satTransf: Number(inputs.satTransf),
    }
    const res = avaliarPaciente(inputsNumericos)"""

if ancora_3 not in src:
    # Tentativa alternativa caso o debug ja tenha sido removido parcialmente
    print("ERRO 3: ancora do handleAvaliar nao encontrada (com os logs de debug).")
    print("   Verifique se o script add_debug_logs.py foi aplicado anteriormente.")
    sys.exit(1)

src = src.replace(ancora_3, novo_3, 1)
print("OK 3: handleAvaliar usa inputs.sexo/idade, logs de debug removidos.")

# ─────────────────────────────────────────────────────────────────────
# ALTERACAO 4 — Adicionar JSX dos campos Sexo e Idade no topo do form
# Logo depois do titulo 'Nova Avaliacao' e antes da Data da Coleta
# ─────────────────────────────────────────────────────────────────────
ancora_4 = """            <h2 className="font-semibold text-gray-700">Nova Avaliação</h2>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data da Coleta</label>"""

novo_4 = """            <h2 className="font-semibold text-gray-700">Nova Avaliação</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Sexo</label>
                <select name="sexo" value={inputs.sexo} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="">Selecione...</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Idade (anos)</label>
                <input type="number" name="idade" value={inputs.idade} onChange={handleChange}
                  min="12" max="100" placeholder="35"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data da Coleta</label>"""

if ancora_4 not in src:
    if 'name="sexo" value={inputs.sexo}' in src:
        print("AVISO 4: campos Sexo/Idade ja existem no form.")
    else:
        print("ERRO 4: ancora do formulario nao encontrada.")
        sys.exit(1)
else:
    src = src.replace(ancora_4, novo_4, 1)
    print("OK 4: campos Sexo e Idade adicionados ao topo do formulario.")

# ─────────────────────────────────────────────────────────────────────
# ALTERACAO 5 — Hipermenorreia/Gestante passam a olhar inputs.sexo
# (reagem em tempo real ao dropdown, em vez de depender de profile.sexo)
# ─────────────────────────────────────────────────────────────────────
ancora_5 = """                  ...(profile?.sexo === 'F' ? [
                    { name: 'hipermenorreia', label: 'Hipermenorreia', sub: 'Fluxo excessivo', color: 'pink' },
                    { name: 'gestante', label: 'Gestante', sub: 'Gravidez atual', color: 'pink' },
                  ] : []),"""

novo_5 = """                  ...(inputs.sexo === 'F' ? [
                    { name: 'hipermenorreia', label: 'Hipermenorreia', sub: 'Fluxo excessivo', color: 'pink' },
                    { name: 'gestante', label: 'Gestante', sub: 'Gravidez atual', color: 'pink' },
                  ] : []),"""

if ancora_5 not in src:
    if "inputs.sexo === 'F' ? [" in src:
        print("AVISO 5: Hipermenorreia/Gestante ja usam inputs.sexo.")
    else:
        print("ERRO 5: ancora Hipermenorreia/Gestante nao encontrada.")
        sys.exit(1)
else:
    src = src.replace(ancora_5, novo_5, 1)
    print("OK 5: Hipermenorreia/Gestante reagem ao dropdown Sexo em tempo real.")

ARQ.write_text(src, encoding="utf-8")
print(f"\nArquivo salvo: {ARQ.resolve()}")
print("\nProximo passo:")
print('  git add . && git commit -m "feat: adiciona Sexo e Idade visiveis no Dashboard, remove debug" && git push origin main')
