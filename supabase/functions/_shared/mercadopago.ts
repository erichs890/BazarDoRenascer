/**
 * Peças puras da integração com o Mercado Pago — sem rede, sem Deno.env.
 * Ficam aqui para serem testadas com `npm test` (Node lê TypeScript direto).
 */

export const MP_API = 'https://api.mercadopago.com';

export type Kind = 'sale' | 'donation';

/** external_reference do pagamento: diz ao webhook qual pedido ele paga. */
export const toReference = (kind: Kind, id: string) => `${kind}:${id}`;

export function parseReference(ref: unknown): { kind: Kind; id: string } | null {
  const m = /^(sale|donation):([0-9a-f-]{36})$/i.exec(String(ref ?? ''));
  return m ? { kind: m[1].toLowerCase() as Kind, id: m[2].toLowerCase() } : null;
}

/**
 * Status do Mercado Pago → status do bazar. null = ainda em andamento
 * (pending, in_process, authorized): não mexe no pedido.
 * Estorno de pedido já pago não volta a peça sozinho: isso é decisão do admin.
 */
export function mapStatus(mp: string): 'paid' | 'cancelled' | null {
  if (mp === 'approved') return 'paid';
  if (['cancelled', 'rejected', 'expired'].includes(mp)) return 'cancelled';
  return null;
}

/**
 * Motivo de recusa do cartão (status_detail) → mensagem para quem está pagando.
 * O que não estiver aqui cai na genérica: nunca mostrar o código cru.
 */
const RECUSA: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Confira o número do cartão.',
  cc_rejected_bad_filled_date: 'Confira a data de validade.',
  cc_rejected_bad_filled_security_code: 'Confira o código de segurança (CVV).',
  cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
  cc_rejected_insufficient_amount: 'O cartão não tem limite suficiente.',
  cc_rejected_call_for_authorize: 'O banco pediu autorização: ligue para ele e tente de novo.',
  cc_rejected_card_disabled: 'O cartão está bloqueado ou não foi ativado. Fale com o seu banco.',
  cc_rejected_invalid_installments: 'O cartão não aceita esse número de parcelas.',
  cc_rejected_duplicated_payment: 'Você já fez um pagamento igual agora há pouco.',
  cc_rejected_max_attempts: 'Limite de tentativas atingido. Use outro cartão.',
  cc_rejected_high_risk: 'O pagamento foi recusado por segurança. Tente outro cartão ou o Pix.',
};
export const cardRejection = (detail: unknown) =>
  RECUSA[String(detail)] ?? 'O cartão foi recusado. Tente outro cartão ou pague com Pix.';

/**
 * Checkout Pro: a página do Mercado Pago mostra só o tipo escolhido no app,
 * para o pedido gravado ("Pix", "Cartão de crédito", "Boleto") bater com o
 * que a pessoa paga. Saldo em conta do Mercado Pago sempre aparece (regra
 * deles, não dá para excluir).
 */
const TIPOS = ['credit_card', 'debit_card', 'prepaid_card', 'ticket', 'bank_transfer'];
const PERMITIDO: Record<string, string> = {
  Pix: 'bank_transfer',
  'Cartão de crédito': 'credit_card',
  Boleto: 'ticket',
};
export function excludedTypes(payment: string): { id: string }[] {
  const keep = PERMITIDO[payment];
  if (!keep) throw new Error(`forma de pagamento inválida: ${payment}`);
  return TIPOS.filter((t) => t !== keep).map((id) => ({ id }));
}

/**
 * Checkout Pro: até quando um pagamento EM ANDAMENTO segura o pedido.
 * Usa o vencimento que o próprio Mercado Pago informa, com folga para o banco
 * compensar (boleto leva até 3 dias úteis); sem vencimento, um padrão por tipo.
 */
export function holdUntil(
  payment: { payment_type_id?: string; date_of_expiration?: string | null },
  now = Date.now(),
): string {
  const H = 3_600_000;
  const boleto = payment.payment_type_id === 'ticket';
  const exp = payment.date_of_expiration ? Date.parse(payment.date_of_expiration) : NaN;
  if (!Number.isNaN(exp)) return new Date(exp + (boleto ? 96 : 1) * H).toISOString();
  const padrao = boleto ? 7 * 24 : payment.payment_type_id === 'bank_transfer' ? 24 : 72; // cartão em análise: até 2 dias
  return new Date(now + padrao * H).toISOString();
}

/**
 * date_of_expiration no formato que a API documenta (com fuso explícito).
 * Usa o horário de Brasília (-03:00, sem horário de verão desde 2019).
 */
export function expirationDate(minutes: number, now = Date.now()): string {
  const brt = new Date(now + minutes * 60_000 - 3 * 3_600_000);
  return brt.toISOString().replace('Z', '-03:00');
}

/**
 * Assinatura do webhook (header x-signature: "ts=...,v1=...").
 * O Mercado Pago assina o "manifest" `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * com HMAC-SHA256 usando a chave secreta do painel. Partes ausentes saem do manifest.
 */
export function signatureManifest(dataId: string | null, requestId: string | null, ts: string) {
  let m = '';
  // id alfanumérico vem em minúsculas no manifest
  if (dataId) m += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) m += `request-id:${requestId};`;
  m += `ts:${ts};`;
  return m;
}

export function parseSignature(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=').map((s) => s.trim())).filter((p) => p.length === 2),
  );
  return parts.ts && parts.v1 ? { ts: parts.ts, v1: parts.v1 } : null;
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparação em tempo constante: não vaza quantos caracteres bateram. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function validSignature(
  secret: string, header: string | null, dataId: string | null, requestId: string | null,
): Promise<boolean> {
  const sig = parseSignature(header);
  if (!sig) return false;
  const expected = await hmacHex(secret, signatureManifest(dataId, requestId, sig.ts));
  return safeEqual(expected, sig.v1.toLowerCase());
}
