auth_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'

with open(auth_path, encoding='utf-8') as f:
    txt = f.read()

# Encontrar e substituir o conteúdo do modal de pacientes
start = txt.find('          <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Termos e Condições de Uso — Pacientes</p>')
end = txt.find('          <p className="text-gray-400 text-center text-xs">cytomica.com')
end_full = txt.find('</p>', end) + 4

if start < 0 or end < 0:
    print('ERRO: conteúdo não encontrado')
else:
    new_content = '''          <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Termos e Condições de Uso — Pacientes</p>
          <p><strong>1. O que é o RedFairy.</strong> Ferramenta de saúde digital que analisa parâmetros laboratoriais do eritron e gera orientações personalizadas. NÃO é um serviço médico e NÃO emite diagnósticos definitivos. Não substitui consulta médica presencial ou teleconsulta.</p>
          <p><strong>2. Elegibilidade.</strong> Maiores de 18 anos. Menores somente com autorização expressa de responsáveis legais.</p>
          <p><strong>3. Como Funciona.</strong> Você insere dados laboratoriais e de contexto clínico, e o algoritmo gera orientações baseadas em evidências. Quando necessário, médico hematologista da plataforma, ou médicos parceiros associados podem ser acionados para aprimorar as recomendações via teleconsulta subsidiada.</p>
          <p><strong>4. Pedidos de Exames e Prescrições.</strong> Se o usuário solicitar um pedido de exames ou prescrição médica com base no resultado da avaliação, um médico avaliará criticamente o resultado do algoritmo e, se concordar, emitirá os documentos mediante o pagamento das taxas cobradas pela plataforma. Por medida de segurança, o médico poderá solicitar uma teleconsulta com o paciente, sem ônus para este.</p>
          <p><strong>5. Responsabilidade do Usuário.</strong> Você é responsável pela integridade e veracidade dos dados inseridos. Decisões de saúde devem ser tomadas em conjunto com profissional de saúde habilitado. Em emergências, procure serviço de urgência imediatamente.</p>
          <p><strong>6. Dados e Privacidade — LGPD.</strong> Seus dados pessoais e de saúde são tratados em conformidade com a Lei nº 13.709/2018 (LGPD). Não são vendidos a terceiros nem usados para fins publicitários. Você pode solicitar acesso, correção ou exclusão a qualquer momento pelo e-mail: contato@redfairy.bio.</p>
          <p><strong>7. Segurança.</strong> Seus dados são armazenados em servidores seguros com criptografia. O acesso é protegido por autenticação individual.</p>
          <p><strong>8. Limitação de Responsabilidade.</strong> O RedFairy e a Cytomica não se responsabilizam por decisões de saúde tomadas exclusivamente com base nos resultados gerados pela plataforma, sem consulta a profissional habilitado.</p>
          <p><strong>9. Alterações.</strong> Estes termos podem ser atualizados. Você será notificado por e-mail com antecedência mínima de 15 dias.</p>
          <p><strong>10. Foro.</strong> Comarca de Salvador, Estado da Bahia. Lei aplicável: LGPD e Código de Defesa do Consumidor.</p>
          <p className="text-gray-400 text-center text-xs">cytomica.com | redfairy.bio | contato@redfairy.bio</p>'''

    txt = txt[:start] + new_content + txt[end_full:]
    with open(auth_path, 'w', encoding='utf-8') as f:
        f.write(txt)
    print('OK: T&C Pacientes atualizado')
