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
const PIX_CHAVE  = '7f45b640-5732-4d2a-bb9a-f3de223d9eab';
const PIX_NOME   = 'CYTOMICA - MEDICINA, PESQ';
const PIX_CIDADE = 'SAO PAULO';
const PIX_CEP    = '05409000';
const PIX_TXID   = 'MRltMfAMak4i2IRfy0kup';

export const VALOR_ANUIDADE_PADRAO = 149.90;

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
 * Gera o código Pix copia-e-cola para um dado valor (R$).
 * @param {number|string} valor - ex.: 149.9 → "149.90" no código.
 * @returns {string} código BR Code válido (com CRC).
 */
export function gerarPixAnuidade(valor) {
  const valorStr = Number(valor).toFixed(2); // "149.90"
  const payload =
    tlv('00', '01') +
    tlv('26', tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', PIX_CHAVE)) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', valorStr) +
    tlv('58', 'BR') +
    tlv('59', PIX_NOME) +
    tlv('60', PIX_CIDADE) +
    tlv('61', PIX_CEP) +
    tlv('62', tlv('05', PIX_TXID));
  const semCrc = payload + '6304';
  return semCrc + crc16(semCrc);
}

/** Formata um valor numérico como BRL sem o "R$" (ex.: 149.9 → "149,90"). */
export function formatarBRL(valor) {
  return Number(valor).toFixed(2).replace('.', ',');
}
