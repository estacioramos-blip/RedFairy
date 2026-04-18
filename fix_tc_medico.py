calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(calc_path, encoding='utf-8') as f:
    txt = f.read()

start = txt.find('          <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Termos e Condições de Uso — Profissionais de Saúde</p>')
end = txt.find('          <p className="text-gray-400 text-center text-xs">cytomica.com')
end_full = txt.find('</p>', end) + 4

if start < 0 or end < 0:
    print('ERRO: conteúdo não encontrado')
else:
    new_content = '''          <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Termos e Condições de Uso — Profissionais de Saúde</p>
          <p><strong>1. Natureza da Plataforma.</strong> O RedFairy é uma ferramenta digital de apoio à decisão clínica. NÃO substitui o julgamento clínico do profissional de saúde, o exame físico nem a anamnese detalhada. Os resultados gerados são orientativos e não constituem laudos médicos.</p>
          <p><strong>2. Elegibilidade.</strong> O acesso ao módulo profissional é restrito a profissionais de saúde com registro ativo em conselho de classe (CRM, COREN, CRN, CRF ou equivalente). Ao se cadastrar, o profissional declara possuir habilitação legal para exercício da profissão, sendo legalmente responsável por esta informação.</p>
          <p><strong>3. Responsabilidade Clínica.</strong> Médicos serão integralmente responsáveis pelas decisões clínicas tomadas com base nos resultados gerados. A plataforma mantém um canal de comunicação aberto para dúvidas ou esclarecimentos. O RedFairy é uma ferramenta auxiliar — a responsabilidade diagnóstica e terapêutica é exclusivamente do médico. Profissionais de saúde não médicos que utilizem a plataforma não devem fazer prescrições nem recomendações terapêuticas quando recomendado pelo algoritmo, e devem orientar os pacientes a consultarem os seus médicos, ou os médicos da plataforma.</p>
          <p><strong>4. Consentimento dos Pacientes.</strong> Ao inserir dados de pacientes, o profissional declara ter obtido o consentimento informado do titular dos dados, em conformidade com a legislação vigente e com o Código de Ética Profissional. De preferência, as avaliações devem ser feitas na presença dos pacientes, ou quando os pacientes encaminhem os seus resultados diretamente para o médico, por qualquer meio.</p>
          <p><strong>5. Programa de Afiliados.</strong> Ao avaliar pacientes na plataforma, o profissional integra automaticamente o Programa de Afiliados RedFairy, com suporte dos patrocinadores da Operadora. As regras e benefícios são estabelecidos em documento próprio que será enviado aos profissionais, e podem ser alterados com aviso prévio de 30 dias.</p>
          <p><strong>6. Proteção de Dados — LGPD.</strong> Os dados inseridos são tratados em conformidade com a Lei nº 13.709/2018. O profissional é corresponsável pelo tratamento adequado dos dados dos seus pacientes inseridos na plataforma.</p>
          <p><strong>7. Propriedade Intelectual.</strong> Todo o conteúdo da plataforma, incluindo o algoritmo, as matrizes de decisão e as orientações terapêuticas, é de propriedade exclusiva da Cytomica. É vedada reprodução, cópia ou distribuição sem autorização expressa.</p>
          <p><strong>8. Limitação de Responsabilidade.</strong> A Cytomica não se responsabiliza por danos decorrentes do uso inadequado da plataforma ou de decisões clínicas baseadas exclusivamente nos resultados gerados, sem a devida avaliação profissional.</p>
          <p><strong>9. Foro.</strong> Comarca de Salvador, Estado da Bahia. Lei aplicável: legislação brasileira vigente, especialmente a LGPD e o Código de Ética Profissional.</p>
          <p className="text-gray-400 text-center text-xs">cytomica.com | redfairy.bio | contato@redfairy.bio</p>'''

    txt = txt[:start] + new_content + txt[end_full:]
    with open(calc_path, 'w', encoding='utf-8') as f:
        f.write(txt)
    print('OK: T&C Profissionais atualizado')
