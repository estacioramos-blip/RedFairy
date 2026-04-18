auth_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'
calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

fixed = []

MODAL_PACIENTE = '''
function TermosModal({ onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight:'85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-red-700 text-sm">Termos e Condições de Uso — Pacientes</p>
            <p className="text-gray-400 text-xs">RedFairy — Versão 1.0 — Abril de 2026</p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>
        <div className="overflow-y-auto p-5 text-xs text-gray-700 leading-relaxed space-y-4">
          <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Termos e Condições de Uso — Pacientes</p>
          <p><strong>1. O que é o RedFairy.</strong> Ferramenta de saúde digital que analisa parâmetros laboratoriais do eritron e gera orientações personalizadas. NÃO é um serviço médico e NÃO emite diagnósticos definitivos. Não substitui consulta médica presencial.</p>
          <p><strong>2. Elegibilidade.</strong> Maiores de 18 anos. Menores somente com autorização expressa de responsáveis legais.</p>
          <p><strong>3. Como Funciona.</strong> Você insere dados laboratoriais e de contexto clínico, e o algoritmo gera orientações baseadas em evidências. Quando necessário, médicos hematologistas parceiros podem ser acionados para aprimorar as recomendações via teleconsulta subsidiada.</p>
          <p><strong>4. Responsabilidade do Usuário.</strong> Você é responsável pela veracidade dos dados inseridos. Decisões de saúde devem ser tomadas em conjunto com profissional de saúde habilitado. Em emergências, procure serviço de urgência imediatamente.</p>
          <p><strong>5. Dados e Privacidade — LGPD.</strong> Seus dados pessoais e de saúde são tratados em conformidade com a Lei nº 13.709/2018 (LGPD). Não são vendidos a terceiros nem usados para fins publicitários. Você pode solicitar acesso, correção ou exclusão a qualquer momento pelo e-mail: contato@redfairy.bio.</p>
          <p><strong>6. Segurança.</strong> Seus dados são armazenados em servidores seguros com criptografia. O acesso é protegido por autenticação individual.</p>
          <p><strong>7. Limitação de Responsabilidade.</strong> O RedFairy e a Cytomica não se responsabilizam por decisões de saúde tomadas exclusivamente com base nos resultados gerados pela plataforma, sem consulta a profissional habilitado.</p>
          <p><strong>8. Alterações.</strong> Estes termos podem ser atualizados. Você será notificado por e-mail com antecedência mínima de 15 dias.</p>
          <p><strong>9. Foro.</strong> Comarca de Salvador, Estado da Bahia. Lei aplicável: LGPD e Código de Defesa do Consumidor.</p>
          <p className="text-gray-400 text-center text-xs">cytomica.com | redfairy.bio | contato@redfairy.bio</p>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onFechar} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}
'''

MODAL_MEDICO = '''
function TermosModal({ onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight:'85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-red-700 text-sm">Termos e Condições de Uso — Profissionais de Saúde</p>
            <p className="text-gray-400 text-xs">RedFairy — Versão 1.0 — Abril de 2026</p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>
        <div className="overflow-y-auto p-5 text-xs text-gray-700 leading-relaxed space-y-4">
          <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Termos e Condições de Uso — Profissionais de Saúde</p>
          <p><strong>1. Natureza da Plataforma.</strong> O RedFairy é uma ferramenta digital de apoio à decisão clínica. NÃO substitui o julgamento clínico do profissional de saúde, o exame físico nem a anamnese detalhada. Os resultados gerados são orientativos e não constituem laudos médicos.</p>
          <p><strong>2. Elegibilidade.</strong> O acesso ao módulo profissional é restrito a profissionais de saúde com registro ativo em conselho de classe (CRM, COREN, CRN, CRF ou equivalente). Ao se cadastrar, o profissional declara possuir habilitação legal para exercício da profissão.</p>
          <p><strong>3. Responsabilidade Clínica.</strong> O profissional é integralmente responsável pelas decisões clínicas tomadas com base nos resultados gerados. O RedFairy é uma ferramenta auxiliar — a responsabilidade diagnóstica e terapêutica é exclusivamente do profissional habilitado.</p>
          <p><strong>4. Consentimento dos Pacientes.</strong> Ao inserir dados de pacientes, o profissional declara ter obtido o consentimento informado do titular dos dados, em conformidade com a legislação vigente e com o Código de Ética Profissional.</p>
          <p><strong>5. Programa de Afiliados.</strong> Ao avaliar pacientes na plataforma, o profissional integra automaticamente o Programa de Afiliados RedFairy, com suporte dos patrocinadores da Operadora. As regras e benefícios são estabelecidos em documento próprio e podem ser alterados com aviso prévio de 30 dias.</p>
          <p><strong>6. Proteção de Dados — LGPD.</strong> Os dados inseridos são tratados em conformidade com a Lei nº 13.709/2018. O profissional é corresponsável pelo tratamento adequado dos dados dos seus pacientes inseridos na plataforma.</p>
          <p><strong>7. Propriedade Intelectual.</strong> Todo o conteúdo da plataforma, incluindo o algoritmo, as matrizes de decisão e as orientações terapêuticas, é de propriedade exclusiva da Cytomica. É vedada reprodução, cópia ou distribuição sem autorização expressa.</p>
          <p><strong>8. Limitação de Responsabilidade.</strong> A Cytomica não se responsabiliza por danos decorrentes do uso inadequado da plataforma ou de decisões clínicas baseadas exclusivamente nos resultados gerados, sem a devida avaliação profissional.</p>
          <p><strong>9. Foro.</strong> Comarca de Salvador, Estado da Bahia. Lei aplicável: legislação brasileira vigente, especialmente a LGPD e o Código de Ética Profissional.</p>
          <p className="text-gray-400 text-center text-xs">cytomica.com | redfairy.bio | contato@redfairy.bio</p>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onFechar} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}
'''

# ── AuthPage.jsx: substituir TermosModal pelo de pacientes ───────────────────
with open(auth_path, encoding='utf-8') as f:
    auth = f.read()

# Encontrar e substituir o TermosModal atual
start = auth.find('\nfunction TermosModal({')
end = auth.find('\nexport default function AuthPage')
if start > 0 and end > 0:
    auth = auth[:start] + '\n' + MODAL_PACIENTE + '\n' + auth[end:]
    fixed.append('OK: TermosModal paciente substituído no AuthPage')
else:
    fixed.append('ERRO: TermosModal no AuthPage não encontrado')

with open(auth_path, 'w', encoding='utf-8') as f:
    f.write(auth)

# ── Calculator.jsx: substituir TermosModal pelo de médicos ───────────────────
with open(calc_path, encoding='utf-8') as f:
    calc = f.read()

start2 = calc.find('\nfunction TermosModal({')
end2 = calc.find('\n// ─── Tela de login/cadastro do médico')
if start2 > 0 and end2 > 0:
    calc = calc[:start2] + '\n' + MODAL_MEDICO + '\n' + calc[end2:]
    fixed.append('OK: TermosModal médico substituído no Calculator')
else:
    fixed.append('ERRO: TermosModal no Calculator não encontrado')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(calc)

for msg in fixed:
    print(msg)
print('Concluído.')
