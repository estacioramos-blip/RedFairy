// ============================================================
// cred.js — credenciais de sessão para as RPCs gateadas por token.
//
// O login deste app NÃO é o Supabase Auth: o paciente entra com CPF+token e o
// médico com CRM+token, ambos guardados no localStorage. Para o Postgres todo
// mundo é `anon` — quem separa um do outro são estas credenciais, passadas
// explicitamente a cada RPC (token_paciente_ok / token_medico_ok / token_admin_ok).
//
// Antes, cada ponto de chamada relia o localStorage no braço, com try/catch
// repetido. Centralizar evita esquecer um campo e faz o padrão ficar óbvio.
// ============================================================

function ler(chave) {
  try {
    return localStorage.getItem(chave) || ''
  } catch (e) {
    return ''
  }
}

// Só o paciente (telas em que não existe médico logado).
export function credPaciente() {
  return { p_pac_token: ler('paciente_token') }
}

// Só o médico (Calculator, fluxo de avaliação).
export function credMedico() {
  return { p_crm: ler('medico_crm'), p_med_token: ler('medico_token') }
}

// Ambas — para telas usadas pelos DOIS (ex.: OBAModal, que roda no fluxo do
// paciente e também no do médico). A RPC autoriza se QUALQUER uma bater.
export function credAmbas() {
  return {
    p_crm: ler('medico_crm'),
    p_med_token: ler('medico_token'),
    p_pac_token: ler('paciente_token'),
  }
}

// Admin — mesmo par do médico, mas as RPCs de admin usam os nomes p_crm/p_token
// e checam token_admin_ok. Espelha o credAdmin() local do AdminPage.
// ⚠ NÃO aceita operador de propósito: quem chama isto fora do painel (o
// salvar_config do Calculator) é decisão do administrador.
export function credAdministrador() {
  return { p_crm: ler('medico_crm'), p_token: ler('medico_token') }
}

// (operadores, 19/09/2026) Auxiliar administrativo: conta SEM CRM e sem
// plataforma (tabela `operadores`). O id tem a forma 'OP:<LOGIN>' e viaja no
// mesmo par p_crm/p_token das RPCs de admin — o banco decide o que ele alcança
// (token_gestao_ok). Chaves próprias, separadas das do médico: um operador
// nunca herda a sessão de médico deixada no mesmo computador.
export function sessaoOperador() {
  const id = ler('operador_id'), token = ler('operador_token')
  if (!id || !token) return null
  // Desempate: se QUALQUER médico entrou DEPOIS neste computador, a sessão do
  // operador não vale mais. Todo login de médico já apaga a sessão de operador
  // (limparSessaoOperador); isto é a segunda trava, para a porta que um dia
  // alguém esquecer. Sem ela, o Estácio abriria o painel com o token do Arthur
  // e os atos dele sairiam como 'OP:ARTHUR' — o defeito que os operadores
  // corrigem — ou um médico comum herdaria o painel do operador.
  const opEm = Number(ler('operador_login_at')) || 0
  const medEm = Number(ler('medico_login_at')) || 0
  if (medEm > opEm) return null
  return { id, token, nome: ler('operador_nome') }
}

// Credencial do PAINEL (AdminPage): a do operador, se houver; senão a do
// administrador.
export function credPainel() {
  const op = sessaoOperador()
  return op ? { p_crm: op.id, p_token: op.token } : credAdministrador()
}

export const CHAVES_OPERADOR = ['operador_id', 'operador_nome', 'operador_token', 'operador_login_at']

// Chamar em TODO login de médico ou de administrador. Um médico que entra num
// computador onde um operador ficou logado não pode ter o painel aberto com o
// token do operador por baixo.
export function limparSessaoOperador() {
  try { CHAVES_OPERADOR.forEach(k => localStorage.removeItem(k)) } catch (e) {}
}

// CPF do paciente logado (várias RPCs pedem junto com o token).
export function cpfPacienteLogado() {
  return ler('paciente_cpf').replace(/\D/g, '')
}
