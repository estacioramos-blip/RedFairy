import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatarBRL, VALOR_ANUIDADE_PADRAO } from '../lib/pix'

/**
 * TermosModal - modal compartilhado de Termos e Condicoes de Uso.
 *
 * Props:
 *   tipo:      'medico' | 'paciente' (padrao: 'paciente')
 *   onFechar:  funcao chamada ao fechar o modal
 *
 * Uso:
 *   const [showTC, setShowTC] = useState(false)
 *   {showTC && <TermosModal tipo="paciente" onFechar={() => setShowTC(false)} />}
 */

const VERSAO = "Versao 1.0 - Maio de 2026"

function ConteudoMedico() {
  return (
    <>
      <p className="font-bold text-red-700 uppercase tracking-wide mb-1">
        {"Termos e Condi\u00e7\u00f5es de Uso \u2014 Profissionais de Sa\u00fade"}
      </p>
      <p><strong>{"1. Natureza da Plataforma."}</strong>{" O RedFairy \u00e9 uma ferramenta digital de apoio \u00e0 decis\u00e3o cl\u00ednica. N\u00c3O substitui o julgamento cl\u00ednico do profissional de sa\u00fade, o exame f\u00edsico nem a anamnese detalhada. Os resultados gerados s\u00e3o orientativos e n\u00e3o constituem laudos m\u00e9dicos."}</p>
      <p><strong>{"2. Elegibilidade."}</strong>{" O acesso ao m\u00f3dulo profissional \u00e9 restrito a profissionais de sa\u00fade com registro ativo em conselho de classe (CRM, COREN, CRN, CRF ou equivalente). Ao se cadastrar, o profissional declara possuir habilita\u00e7\u00e3o legal para exerc\u00edcio da profiss\u00e3o, sendo legalmente respons\u00e1vel por esta informa\u00e7\u00e3o."}</p>
      <p><strong>{"3. Responsabilidade Cl\u00ednica."}</strong>{" M\u00e9dicos ser\u00e3o integralmente respons\u00e1veis pelas decis\u00f5es cl\u00ednicas tomadas com base nos resultados gerados. A plataforma mant\u00e9m um canal de comunica\u00e7\u00e3o aberto para d\u00favidas ou esclarecimentos. O RedFairy \u00e9 uma ferramenta auxiliar \u2014 a responsabilidade diagn\u00f3stica e terap\u00eautica \u00e9 exclusivamente do m\u00e9dico. Profissionais de sa\u00fade n\u00e3o m\u00e9dicos que utilizem a plataforma n\u00e3o devem fazer prescri\u00e7\u00f5es nem recomenda\u00e7\u00f5es terap\u00eauticas quando recomendado pelo algoritmo, e devem orientar os pacientes a consultarem os seus m\u00e9dicos, ou os m\u00e9dicos da plataforma."}</p>
      <p><strong>{"4. Consentimento dos Pacientes."}</strong>{" Ao inserir dados de pacientes, o profissional declara ter obtido o consentimento informado do titular dos dados, em conformidade com a legisla\u00e7\u00e3o vigente e com o C\u00f3digo de \u00c9tica Profissional. De prefer\u00eancia, as avalia\u00e7\u00f5es devem ser feitas na presen\u00e7a dos pacientes, ou quando os pacientes encaminhem os seus resultados diretamente para o m\u00e9dico, por qualquer meio."}</p>
      <p><strong>{"5. Programa de Afiliados."}</strong>{" Ao avaliar pacientes na plataforma, o profissional integra automaticamente o Programa de Afiliados RedFairy, com suporte dos patrocinadores da Operadora. As regras e benef\u00edcios s\u00e3o estabelecidos em documento pr\u00f3prio que ser\u00e1 enviado aos profissionais, e podem ser alterados com aviso pr\u00e9vio de 30 dias."}</p>
      <p><strong>{"6. Prote\u00e7\u00e3o de Dados \u2014 LGPD."}</strong>{" Os dados inseridos s\u00e3o tratados em conformidade com a Lei n\u00ba 13.709/2018. O profissional \u00e9 corespons\u00e1vel pelo tratamento adequado dos dados dos seus pacientes inseridos na plataforma."}</p>
      <p><strong>{"7. Propriedade Intelectual."}</strong>{" Todo o conte\u00fado da plataforma, incluindo o algoritmo, as matrizes de decis\u00e3o e as orienta\u00e7\u00f5es terap\u00eauticas, \u00e9 de propriedade exclusiva da Cytomica. \u00c9 vedada reprodu\u00e7\u00e3o, c\u00f3pia ou distribui\u00e7\u00e3o sem autoriza\u00e7\u00e3o expressa."}</p>
      <p><strong>{"8. Limita\u00e7\u00e3o de Responsabilidade."}</strong>{" A Cytomica n\u00e3o se responsabiliza por danos decorrentes do uso inadequado da plataforma ou de decis\u00f5es cl\u00ednicas baseadas exclusivamente nos resultados gerados, sem a devida avalia\u00e7\u00e3o profissional."}</p>
      <p><strong>{"9. Foro."}</strong>{" Comarca de Salvador, Estado da Bahia. Lei aplic\u00e1vel: legisla\u00e7\u00e3o brasileira vigente, especialmente a LGPD e o C\u00f3digo de \u00c9tica Profissional."}</p>
    </>
  )
}

function ConteudoPaciente({ anuidadeBRL, marca = 'RedFairy' }) {
  return (
    <>
      <p className="font-bold text-red-700 uppercase tracking-wide mb-1">
        {"Termos e Condi\u00e7\u00f5es de Uso \u2014 Pacientes"}
      </p>
      <p><strong>{`1. O que \u00e9 o ${marca}.`}</strong>{` O ${marca} \u00e9 uma plataforma digital para acompanhamento do seu eritron (gl\u00f3bulos vermelhos e hemoglobina). Voc\u00ea registra seus hemogramas, recebe orienta\u00e7\u00f5es automatizadas e pode solicitar pedidos m\u00e9dicos de exames complementares. O ${marca} \u00e9 uma ferramenta de apoio \u2014 N\u00c3O substitui consultas m\u00e9dicas, exame f\u00edsico nem laudos profissionais.`}</p>
      <p><strong>{"2. Quem pode usar."}</strong>{" Maiores de 18 anos com CPF v\u00e1lido. Menores de idade devem ser cadastrados por respons\u00e1vel legal, que se responsabiliza pelo uso da plataforma e pela veracidade dos dados informados."}</p>
      <p><strong>{"3. Assinatura anual."}</strong>{" O acesso \u00e0 plataforma \u00e9 anual e custa R$ "}{anuidadeBRL}{" \u2014 pagos via PIX no momento do cadastro. A vig\u00eancia \u00e9 de 365 dias a partir da confirma\u00e7\u00e3o do pagamento. N\u00e3o h\u00e1 renova\u00e7\u00e3o autom\u00e1tica: ao final do per\u00edodo, voc\u00ea ser\u00e1 convidado a renovar manualmente."}</p>
      <p><strong>{"4. Documentos m\u00e9dicos."}</strong>{` Pedidos de exames e prescri\u00e7\u00f5es geradas pela plataforma s\u00e3o emitidos por m\u00e9dicos parceiros do ${marca}, com base nos dados que voc\u00ea informar. O primeiro pedido ap\u00f3s o cadastro \u00e9 gratuito; pedidos subsequentes custam R$ 60,00 cada. A emiss\u00e3o depende da an\u00e1lise cl\u00ednica do m\u00e9dico respons\u00e1vel.`}</p>
      <p><strong>{"5. Sua responsabilidade."}</strong>{" Voc\u00ea \u00e9 respons\u00e1vel pela veracidade dos dados que insere (hemogramas, idade, sexo, condi\u00e7\u00f5es cl\u00ednicas). Resultados imprecisos podem gerar orienta\u00e7\u00f5es incorretas. Em caso de d\u00favida, sempre consulte um m\u00e9dico de sua confian\u00e7a."}</p>
      <p><strong>{"6. Prote\u00e7\u00e3o dos seus dados \u2014 LGPD."}</strong>{" Seus dados s\u00e3o tratados em conformidade com a Lei n\u00ba 13.709/2018 (LGPD). N\u00c3O compartilhamos suas informa\u00e7\u00f5es com terceiros sem o seu consentimento, exceto quando exigido por lei. Voc\u00ea pode solicitar exclus\u00e3o ou portabilidade dos seus dados a qualquer momento via contato@redfairy.bio."}</p>
      <p><strong>{"7. Limita\u00e7\u00e3o de Responsabilidade."}</strong>{" A Cytomica n\u00e3o se responsabiliza por decis\u00f5es de sa\u00fade tomadas exclusivamente com base na plataforma, sem acompanhamento m\u00e9dico. Em emerg\u00eancias, procure atendimento m\u00e9dico imediato."}</p>
      <p><strong>{"8. Cancelamento e reembolso."}</strong>{" Voc\u00ea pode cancelar o seu acesso a qualquer momento via contato@redfairy.bio. Reembolso integral \u00e9 garantido se solicitado em at\u00e9 7 dias ap\u00f3s o pagamento (direito de arrependimento \u2014 CDC art. 49)."}</p>
      <p><strong>{"9. Foro."}</strong>{" Comarca de Salvador, Estado da Bahia. Lei aplic\u00e1vel: legisla\u00e7\u00e3o brasileira vigente, especialmente a LGPD e o C\u00f3digo de Defesa do Consumidor."}</p>
    </>
  )
}

export default function TermosModal({ tipo = 'paciente', onFechar }) {
  // Valor da anuidade do banco, para o texto dos termos refletir o preço atual.
  const [anuidadeBRL, setAnuidadeBRL] = useState(formatarBRL(VALOR_ANUIDADE_PADRAO))
  useEffect(() => {
    supabase.from('config').select('valor').eq('chave', 'valor_anuidade').maybeSingle()
      .then(({ data }) => { const n = Number(data?.valor); if (Number.isFinite(n) && n > 0) setAnuidadeBRL(formatarBRL(n)) })
  }, [])

  // RedFairy sai do fluxo OBA: paciente bariátrico vê "Projeto OBA®" nos termos.
  const ehBari = (() => { try { return localStorage.getItem('rf_flag') === 'bariatrica' || localStorage.getItem('rf_dom_bari') === '1' } catch (e) { return false } })()
  const marca = (tipo === 'paciente' && ehBari) ? 'Projeto OBA®' : 'RedFairy'

  const titulo = tipo === 'medico'
    ? "Termos e Condi\u00e7\u00f5es de Uso \u2014 Profissionais de Sa\u00fade"
    : "Termos e Condi\u00e7\u00f5es de Uso \u2014 Pacientes"

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.95)', zIndex: 10000 }}
      onClick={onFechar}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="font-bold text-red-700 text-sm">{titulo}</p>
            <p className="text-gray-400 text-xs">{marca + " \u2014 " + VERSAO}</p>
          </div>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-600 text-xl ml-2"
            aria-label="Fechar"
            style={{ fontFamily: 'Apple Color Emoji, Segoe UI Symbol, Noto Sans Symbols, sans-serif', lineHeight: 1, flexShrink: 0 }}>
            {"\u2715"}
          </button>
        </div>

        <div className="overflow-y-auto p-5 text-xs text-gray-700 leading-relaxed space-y-4">
          {tipo === 'medico' ? <ConteudoMedico /> : <ConteudoPaciente anuidadeBRL={anuidadeBRL} marca={marca} />}
          <p className="text-gray-400 text-center text-xs pt-2">
            {"cytomica.com | redfairy.bio | contato@redfairy.bio"}
          </p>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onFechar}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            {"Fechar e voltar"}
          </button>
        </div>
      </div>
    </div>
  )
}
