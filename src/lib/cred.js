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
export function credAdministrador() {
  return { p_crm: ler('medico_crm'), p_token: ler('medico_token') }
}

// CPF do paciente logado (várias RPCs pedem junto com o token).
export function cpfPacienteLogado() {
  return ler('paciente_cpf').replace(/\D/g, '')
}
