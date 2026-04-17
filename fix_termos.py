auth_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'
calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

MODAL_TC = '''
function TermosModal({ onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight:'85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-red-700 text-sm">Termos e Condições de Uso</p>
            <p className="text-gray-400 text-xs">RedFairy — Versão 1.0 — Abril de 2026</p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>
        <div className="overflow-y-auto p-5 text-xs text-gray-700 leading-relaxed space-y-4">
          <div>
            <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Parte I — Profissionais de Saúde</p>
            <p><strong>1. Natureza da Plataforma.</strong> O RedFairy é uma ferramenta digital de apoio à decisão clínica. NÃO substitui o julgamento clínico do profissional de saúde, o exame físico nem a anamnese detalhada.</p>
            <p><strong>2. Elegibilidade.</strong> O acesso ao módulo profissional é restrito a profissionais de saúde com registro ativo em conselho de classe (CRM, COREN, CRN, CRF ou equivalente).</p>
            <p><strong>3. Responsabilidade Clínica.</strong> O profissional é integralmente responsável pelas decisões clínicas tomadas com base nos resultados gerados. O RedFairy não gera laudos médicos nem prescrições.</p>
            <p><strong>4. Programa de Afiliados.</strong> Ao avaliar pacientes, o profissional integra automaticamente o Programa de Afiliados, com suporte dos patrocinadores da Operadora. As regras são estabelecidas em documento próprio e podem ser alteradas com aviso prévio de 30 dias.</p>
            <p><strong>5. LGPD.</strong> Os dados são tratados em conformidade com a Lei nº 13.709/2018. O profissional declara ter obtido consentimento dos pacientes cujos dados insere na plataforma.</p>
            <p><strong>6. Propriedade Intelectual.</strong> Todo o conteúdo é de propriedade exclusiva da Cytomica. É vedada reprodução sem autorização expressa.</p>
            <p><strong>7. Foro.</strong> Comarca de Salvador, Estado da Bahia. Lei aplicável: legislação brasileira, especialmente a LGPD.</p>
          </div>
          <div>
            <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Parte II — Pacientes</p>
            <p><strong>1. O que é o RedFairy.</strong> Ferramenta de saúde que analisa parâmetros laboratoriais do eritron. NÃO é um serviço médico e NÃO emite diagnósticos definitivos.</p>
            <p><strong>2. Elegibilidade.</strong> Maiores de 18 anos. Menores somente com autorização de responsáveis legais.</p>
            <p><strong>3. Como Funciona.</strong> Você insere dados laboratoriais e o algoritmo gera orientações. Quando necessário, médicos hematologistas parceiros podem contatar para aprimorar as recomendações via teleconsulta subsidiada.</p>
            <p><strong>4. LGPD.</strong> Seus dados pessoais e de saúde são tratados em conformidade com a Lei nº 13.709/2018. Não são vendidos a terceiros nem usados para fins publicitários. Você pode solicitar acesso, correção ou exclusão pelo e-mail: contato@redfairy.bio.</p>
            <p><strong>5. Limitação de Responsabilidade.</strong> O RedFairy não se responsabiliza por decisões de saúde tomadas exclusivamente com base nos resultados sem consulta a profissional. Em emergências, procure serviço de urgência imediatamente.</p>
            <p><strong>6. Foro.</strong> Comarca de Salvador, Estado da Bahia. Lei aplicável: LGPD e Código de Defesa do Consumidor.</p>
          </div>
          <p className="text-gray-400 text-center text-xs">cytomica.com | redfairy.bio | contato@redfairy.bio</p>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onFechar} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
'''

# ── AuthPage.jsx ──────────────────────────────────────────────────────────────
with open(auth_path, encoding='utf-8') as f:
    auth = f.read()

# Adicionar TermosModal antes do export default
old_export = 'export default function AuthPage'
new_export = MODAL_TC + '\nexport default function AuthPage'
if old_export in auth and 'function TermosModal' not in auth:
    auth = auth.replace(old_export, new_export)
    print('OK: TermosModal adicionado ao AuthPage')
else:
    print('AVISO: TermosModal já existe ou export não encontrado no AuthPage')

# Adicionar estado showTC e aceitoTC no AuthPage
old_state = "  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState(0)"
new_state = "  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState(0)\n  const [aceitoTC, setAceitoTC] = useState(false)\n  const [showTC, setShowTC] = useState(false)"
if old_state in auth:
    auth = auth.replace(old_state, new_state)
    print('OK: estados TC adicionados ao AuthPage')
else:
    print('ERRO: estado avaliacoesPendentes não encontrado')

# Adicionar validação no handleCadastro
old_cad = "  async function handleCadastro() {\n    if (!emailOk) { setErro('Os e-mails não coincidem.'); return }"
new_cad = "  async function handleCadastro() {\n    if (!aceitoTC) { setErro('Você deve aceitar os Termos e Condições para criar conta.'); return }\n    if (!emailOk) { setErro('Os e-mails não coincidem.'); return }"
if old_cad in auth:
    auth = auth.replace(old_cad, new_cad)
    print('OK: validação TC no handleCadastro AuthPage')
else:
    print('ERRO: handleCadastro AuthPage')

# Adicionar checkbox T&C antes do botão Criar conta
old_btn_auth = """            <button onClick={handleCadastro} disabled={loading || !emailOk || !senhaOk}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Aguarde...' : 'Criar conta'}
            </button>"""
new_btn_auth = """            {showTC && <TermosModal onFechar={() => setShowTC(false)} />}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={aceitoTC} onChange={e => setAceitoTC(e.target.checked)} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
              <span className="text-xs text-gray-600">Li e aceito os{' '}
                <button type="button" onClick={() => setShowTC(true)} className="text-red-700 font-semibold hover:underline">
                  Termos e Condições de Uso
                </button>
              </span>
            </label>
            <button onClick={handleCadastro} disabled={loading || !emailOk || !senhaOk || !aceitoTC}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Aguarde...' : 'Criar conta'}
            </button>"""
if old_btn_auth in auth:
    auth = auth.replace(old_btn_auth, new_btn_auth)
    print('OK: checkbox TC adicionado ao AuthPage cadastro')
else:
    print('ERRO: botão Criar conta não encontrado')

with open(auth_path, 'w', encoding='utf-8') as f:
    f.write(auth)

# ── Calculator.jsx — AuthMedico ───────────────────────────────────────────────
with open(calc_path, encoding='utf-8') as f:
    calc = f.read()

# Adicionar TermosModal antes do AuthMedico
old_auth = '// ─── Tela de login/cadastro do médico ────────────────────────────────────────\nfunction AuthMedico'
new_auth = MODAL_TC + '\n// ─── Tela de login/cadastro do médico ────────────────────────────────────────\nfunction AuthMedico'
if old_auth in calc and 'function TermosModal' not in calc:
    calc = calc.replace(old_auth, new_auth)
    print('OK: TermosModal adicionado ao Calculator')
else:
    print('AVISO: TermosModal já existe ou âncora não encontrada no Calculator')

# Adicionar estados no AuthMedico
old_cad_state = "  const [cadSucesso, setCadSucesso] = useState(false)"
new_cad_state = "  const [cadSucesso, setCadSucesso] = useState(false)\n  const [aceitoTC, setAceitoTC] = useState(false)\n  const [showTC, setShowTC] = useState(false)"
if old_cad_state in calc:
    calc = calc.replace(old_cad_state, new_cad_state)
    print('OK: estados TC adicionados ao AuthMedico')
else:
    print('ERRO: cadSucesso não encontrado')

# Adicionar validação no handleCadastro médico
old_hcad = "  async function handleCadastro() {\n    setCadErro('')\n    const conselhoLimpo = conselho.trim().toUpperCase()"
new_hcad = "  async function handleCadastro() {\n    setCadErro('')\n    if (!aceitoTC) { setCadErro('Você deve aceitar os Termos e Condições para criar acesso.'); return }\n    const conselhoLimpo = conselho.trim().toUpperCase()"
if old_hcad in calc:
    calc = calc.replace(old_hcad, new_hcad)
    print('OK: validação TC no handleCadastro médico')
else:
    print('ERRO: handleCadastro médico')

# Adicionar checkbox antes do botão Criar acesso
old_btn_med = """            {cadErro && <p className="text-red-500 text-sm">{cadErro}</p>}
            <button onClick={handleCadastro} disabled={cadLoading}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              {cadLoading ? 'Cadastrando...' : 'Criar acesso →'}
            </button>"""
new_btn_med = """            {cadErro && <p className="text-red-500 text-sm">{cadErro}</p>}
            {showTC && <TermosModal onFechar={() => setShowTC(false)} />}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={aceitoTC} onChange={e => setAceitoTC(e.target.checked)} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
              <span className="text-xs text-gray-600">Li e aceito os{' '}
                <button type="button" onClick={() => setShowTC(true)} className="text-red-700 font-semibold hover:underline">
                  Termos e Condições de Uso
                </button>
              </span>
            </label>
            <button onClick={handleCadastro} disabled={cadLoading || !aceitoTC}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              {cadLoading ? 'Cadastrando...' : 'Criar acesso →'}
            </button>"""
if old_btn_med in calc:
    calc = calc.replace(old_btn_med, new_btn_med)
    print('OK: checkbox TC adicionado ao AuthMedico cadastro')
else:
    print('ERRO: botão Criar acesso não encontrado')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(calc)

print('Concluído.')
