// ============================================================
// origem.js — de onde a pessoa veio (medição de marketing).
//
// A landing (bariatrico.net) guarda a origem num cookie próprio de 90 dias e a
// anexa ao link quando a pessoa clica num CTA para cá. Como os dois domínios
// são diferentes, o cookie NÃO atravessa: a URL é o único caminho. Este
// módulo pega os parâmetros da URL, guarda no aparelho e devolve na hora de
// registrar o cadastro e a assinatura.
//
// ⚠ ISTO NÃO É O PROGRAMA DE INDICAÇÃO. Não usa código de indicador
// (`?ind=`/`?ref=`), não gera crédito e não paga ninguém por conversão — o
// parceiro é remunerado por contrato de valor fixo, fora do sistema. Pagar por
// paciente trazido é captação de clientela (CFM 2.336/2023 e 2.170/2017; ver a
// seção da reforma no CLAUDE.md).
//
// A separação é estrutural: a origem vai para a tabela `oba_origem`, que
// nenhuma função de crédito, desconto ou vínculo enxerga. Não misturar.
// ============================================================

import { supabase } from './supabase'

const CHAVE = 'rf_utm'
const CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']

function ler() {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? JSON.parse(bruto) : null
  } catch (e) {
    return null
  }
}

/**
 * Lê os utm_* da URL e guarda — uma vez. Chamado no início do App.
 *
 * PRIMEIRO TOQUE VENCE, igual à landing: quem já tem origem gravada neste
 * aparelho não a perde ao voltar por outro caminho. Sem isso, a pessoa que
 * chega pelo influenciador, some por duas semanas e volta pelo Google seria
 * creditada ao Google — e é justamente a volta demorada que caracteriza o
 * paciente bariátrico.
 */
export function capturarOrigemDaUrl() {
  try {
    if (ler()) return                       // já temos: não sobrescreve
    const sp = new URLSearchParams(window.location.search || '')
    const achado = {}
    let tem = false
    for (const c of CAMPOS) {
      // Minúsculas, pelo mesmo motivo da landing: caixa diferente
      // fragmentaria o funil do parceiro sem avisar ninguém.
      const v = (sp.get(c) || '').trim().toLowerCase().slice(0, 100)
      if (v) { achado[c] = v; tem = true }
    }
    if (!tem) return
    localStorage.setItem(CHAVE, JSON.stringify(achado))
  } catch (e) { /* sem localStorage: o app funciona igual, só não mede */ }
}

/**
 * Registra a origem no banco. `etapa` é 'cadastro' ou 'assinatura'.
 *
 * Chamada DEPOIS do cadastro e DEPOIS da assinatura, nunca de dentro delas: se
 * a medição falhar, perde-se a atribuição de um parceiro — e só. Um cadastro
 * de paciente jamais pode cair porque o marketing não conseguiu gravar.
 * Por isso este função nunca lança: engole o erro e registra no console.
 */
export async function registrarOrigem(cpf, etapa) {
  const o = ler()
  // Sem origem conhecida não há o que gravar: quem veio direto é "(direto)" na
  // view por ausência de linha, não por uma linha vazia.
  if (!o) return
  const cpfLimpo = String(cpf || '').replace(/\D/g, '')
  if (cpfLimpo.length !== 11) return
  let token = ''
  try { token = localStorage.getItem('paciente_token') || '' } catch (e) {}
  if (!token) return
  try {
    const { data, error } = await supabase.rpc('oba_origem_registrar', {
      p_cpf: cpfLimpo,
      p_token: token,
      p_etapa: etapa,
      p_utm_source: o.utm_source || null,
      p_utm_medium: o.utm_medium || null,
      p_utm_campaign: o.utm_campaign || null,
      p_utm_content: o.utm_content || null,
    })
    if (error || data?.ok === false) console.error('oba_origem_registrar:', error || data?.erro)
  } catch (e) {
    console.error('oba_origem_registrar:', e)
  }
}
