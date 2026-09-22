// ─────────────────────────────────────────────────────────────────────────────
// Gerador de código Pix "copia e cola" (BR Code / padrão EMV do BACEN) para a
// ANUIDADE do paciente. Só o VALOR muda — os dados do recebedor (CYTOMICA) são
// fixos, extraídos do código válido original.
//
// VERIFICADO: gerarPixAnuidade(149.90) reproduz exatamente o código original
// (CRC final BA6A). Por isso é seguro gerar para outros valores — o dígito
// verificador (CRC16-CCITT) é recalculado corretamente.
// ─────────────────────────────────────────────────────────────────────────────

// Dados fixos do recebedor (do código original).
// ⚠ A chave da ANUIDADE (aleatória, abaixo) e a de `config.pix_chave` (o CNPJ,
// usada nos documentos) são da MESMA empresa — confirmado pelo Estácio em
// 22/09/2026. Por isso o nome/cidade do recebedor podem ser fixos aqui. Se um
// dia a chave do config passar a ser de OUTRA conta, nome e cidade precisam
// virar parâmetro junto com a chave, senão o código sai com a chave de uma
// empresa e o nome de outra.
const PIX_CHAVE  = '7f45b640-5732-4d2a-bb9a-f3de223d9eab';
const PIX_NOME   = 'CYTOMICA - MEDICINA, PESQ';
const PIX_CIDADE = 'SAO PAULO';
const PIX_CEP    = '05409000';
const PIX_TXID   = 'MRltMfAMak4i2IRfy0kup';

// Fallback apenas — a fonte da verdade é config.valor_anuidade no Supabase
// (calculado manualmente no ADMIN a partir da cotação do dólar digital).
export const VALOR_ANUIDADE_PADRAO = 200;

// CRC16-CCITT (poly 0x1021, init 0xFFFF) — hex maiúsculo, 4 dígitos.
function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Campo EMV TLV: id + tamanho(2) + valor.
function tlv(id, v) {
  return id + String(v.length).padStart(2, '0') + v;
}

/**
 * Gera o código Pix copia-e-cola (BR Code) para um valor.
 * @param {number|string} valor - ex.: 149.9 → "149.90" no código.
 * @param {object} [opcoes]
 * @param {string} [opcoes.chave] - chave Pix do recebedor. Vazia/ausente → a da anuidade.
 * @param {string} [opcoes.txid]  - rótulo da cobrança (até 25 caracteres, sem acento).
 * @returns {string} código BR Code válido (com CRC).
 */
export function gerarPixCopiaECola(valor, opcoes = {}) {
  const chave = String(opcoes.chave || '').trim() || PIX_CHAVE;
  // O rótulo aceita só letras, números e alguns sinais; qualquer outra coisa
  // faz banco recusar o código. '***' é o "sem identificador" do padrão.
  const txidBruto = String(opcoes.txid || PIX_TXID).replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
  const txid = txidBruto || '***';
  const valorStr = Number(valor).toFixed(2); // "149.90"
  const payload =
    tlv('00', '01') +
    tlv('26', tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave)) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', valorStr) +
    tlv('58', 'BR') +
    tlv('59', PIX_NOME) +
    tlv('60', PIX_CIDADE) +
    tlv('61', PIX_CEP) +
    tlv('62', tlv('05', txid));
  const semCrc = payload + '6304';
  return semCrc + crc16(semCrc);
}

/** Anuidade: mantém a chave e o rótulo originais, verificados contra o código real. */
export function gerarPixAnuidade(valor) {
  return gerarPixCopiaECola(valor);
}

/** Formata um valor numérico como BRL sem o "R$" (ex.: 149.9 → "149,90"). */
export function formatarBRL(valor) {
  return Number(valor).toFixed(2).replace('.', ',');
}
