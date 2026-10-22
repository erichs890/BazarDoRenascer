/**
 * Pix estático com valor — o "copia e cola" e o conteúdo do QR Code.
 *
 * Formato BR Code do Banco Central: campos TLV (id de 2 dígitos + tamanho de
 * 2 dígitos + valor) fechados por um CRC16. Qualquer app de banco lê.
 * Não há intermediário: o dinheiro cai direto na conta dona da chave.
 *
 * Estático significa que o banco NÃO avisa o app quando o pagamento cai —
 * por isso o pedido fica "aguardando" até o admin conferir o extrato.
 */

const tlv = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), o exigido pelo BR Code. */
export function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** O padrão aceita só ASCII no nome e na cidade: tira acento e símbolo. */
const ascii = (s, max) => String(s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9 ]/g, '')
  .trim().toUpperCase().slice(0, max);

/** txid: até 25 letras/números. Derivado do id do pedido para o admin achar no extrato. */
export const pixRef = (id) => String(id).replace(/[^A-Za-z0-9]/g, '').slice(0, 25).toUpperCase();

export function pixPayload({ key, name, city, amount, txid = '***' }) {
  if (!key) throw new Error('Chave Pix não configurada.');
  if (!(amount > 0)) throw new Error('Valor do Pix precisa ser maior que zero.');

  const conta = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);
  const corpo = tlv('00', '01')               // versão do payload
    + tlv('26', conta)                         // chave do recebedor
    + tlv('52', '0000')                        // categoria (não informada)
    + tlv('53', '986')                         // moeda: real
    + tlv('54', amount.toFixed(2))             // valor, com ponto
    + tlv('58', 'BR')
    + tlv('59', ascii(name, 25))
    + tlv('60', ascii(city, 15))
    + tlv('62', tlv('05', txid))               // referência do pedido
    + '6304';                                  // abre o campo do CRC
  return corpo + crc16(corpo);
}
