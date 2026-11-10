import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toReference, parseReference, mapStatus, expirationDate,
  signatureManifest, parseSignature, hmacHex, validSignature, cardRejection,
  excludedTypes, holdUntil,
} from './mercadopago.ts';

const ID = '3f2b8c1e-6a4d-4e2f-9b7a-1c2d3e4f5a6b';

test('referência ida e volta', () => {
  assert.deepEqual(parseReference(toReference('sale', ID)), { kind: 'sale', id: ID });
  assert.deepEqual(parseReference(`donation:${ID.toUpperCase()}`), { kind: 'donation', id: ID });
});

test('referência estranha é recusada', () => {
  for (const r of [null, '', 'sale:', `refund:${ID}`, `sale:${ID};drop`, 'sale:123']) {
    assert.equal(parseReference(r), null, String(r));
  }
});

test('status do Mercado Pago', () => {
  assert.equal(mapStatus('approved'), 'paid');
  assert.equal(mapStatus('cancelled'), 'cancelled');
  assert.equal(mapStatus('rejected'), 'cancelled');
  assert.equal(mapStatus('pending'), null);
  assert.equal(mapStatus('in_process'), null);
  assert.equal(mapStatus('refunded'), null);
});

test('expiração em horário de Brasília', () => {
  const now = Date.UTC(2026, 10, 8, 15, 0, 0); // 15:00 UTC = 12:00 BRT
  assert.equal(expirationDate(30, now), '2026-11-08T12:30:00.000-03:00');
  assert.equal(new Date(expirationDate(30, now)).getTime(), now + 30 * 60_000);
});

test('manifest da assinatura', () => {
  assert.equal(signatureManifest('ABC123', 'req-1', '170'), 'id:abc123;request-id:req-1;ts:170;');
  assert.equal(signatureManifest(null, null, '170'), 'ts:170;');
});

test('header x-signature', () => {
  assert.deepEqual(parseSignature('ts=1704908010,v1=abc'), { ts: '1704908010', v1: 'abc' });
  assert.deepEqual(parseSignature(' ts = 1 , v1 = f '), { ts: '1', v1: 'f' });
  assert.equal(parseSignature('v1=abc'), null);
  assert.equal(parseSignature(null), null);
});

test('HMAC-SHA256 confere com vetor conhecido', async () => {
  // RFC 4231, caso 2
  assert.equal(
    await hmacHex('Jefe', 'what do ya want for nothing?'),
    '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
  );
});

test('assinatura válida passa, adulterada não', async () => {
  const v1 = await hmacHex('segredo', signatureManifest('123', 'r', '99'));
  assert.equal(await validSignature('segredo', `ts=99,v1=${v1}`, '123', 'r'), true);
  assert.equal(await validSignature('segredo', `ts=99,v1=${v1}`, '124', 'r'), false);
  assert.equal(await validSignature('outro', `ts=99,v1=${v1}`, '123', 'r'), false);
  assert.equal(await validSignature('segredo', null, '123', 'r'), false);
});

test('recusa do cartão vira mensagem, nunca código cru', () => {
  assert.equal(cardRejection('cc_rejected_insufficient_amount'), 'O cartão não tem limite suficiente.');
  assert.match(cardRejection('cc_rejected_other_reason'), /recusado/);
  assert.match(cardRejection(undefined), /recusado/);
  assert.doesNotMatch(cardRejection('cc_rejected_xyz'), /cc_/);
});

test('Checkout Pro mostra só o tipo escolhido', () => {
  const ids = (p) => excludedTypes(p).map((t) => t.id);
  assert.ok(!ids('Pix').includes('bank_transfer'));
  assert.ok(ids('Pix').includes('credit_card'));
  assert.ok(!ids('Cartão de crédito').includes('credit_card'));
  assert.ok(ids('Cartão de crédito').includes('ticket'));
  assert.ok(!ids('Boleto').includes('ticket'));
  assert.throws(() => excludedTypes('Cheque'));
});

test('pagamento em andamento segura o pedido até o vencimento + folga', () => {
  const exp = '2026-11-10T12:00:00.000Z';
  assert.equal(holdUntil({ payment_type_id: 'bank_transfer', date_of_expiration: exp }), '2026-11-10T13:00:00.000Z');
  assert.equal(holdUntil({ payment_type_id: 'ticket', date_of_expiration: exp }), '2026-11-14T12:00:00.000Z');
  const now = Date.parse('2026-11-08T00:00:00Z');
  assert.equal(holdUntil({ payment_type_id: 'credit_card' }, now), '2026-11-11T00:00:00.000Z');
});
