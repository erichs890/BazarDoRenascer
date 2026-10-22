// Código Pix errado = dinheiro que não chega, ou que chega com o valor errado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc16, pixPayload, pixRef } from './pix.js';

/** Lê o payload de volta em campos — se os tamanhos não baterem, quebra aqui. */
function parse(s) {
  const out = {};
  for (let i = 0; i < s.length;) {
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    out[id] = s.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

test('crc16 bate com o valor de referência do CRC-16/CCITT-FALSE', () => {
  assert.equal(crc16('123456789'), '29B1');
});

test('payload tem os campos e valores certos', () => {
  const p = pixPayload({
    key: 'teste@bazar.org', name: 'Associação São João', city: 'São Paulo',
    amount: 15, txid: 'PEDIDO123',
  });
  const f = parse(p);
  assert.equal(f['00'], '01');
  assert.deepEqual(parse(f['26']), { '00': 'br.gov.bcb.pix', '01': 'teste@bazar.org' });
  assert.equal(f['53'], '986');
  assert.equal(f['54'], '15.00');          // ponto, duas casas
  assert.equal(f['58'], 'BR');
  assert.equal(f['59'], 'ASSOCIACAO SAO JOAO'); // sem acento, maiúsculo
  assert.equal(f['60'], 'SAO PAULO');
  assert.deepEqual(parse(f['62']), { '05': 'PEDIDO123' });
});

test('CRC no fim confere com o resto do código', () => {
  const p = pixPayload({ key: '+5511999999999', name: 'Maria', city: 'Rio', amount: 37.5 });
  assert.equal(p.slice(-8, -4), '6304');
  assert.equal(p.slice(-4), crc16(p.slice(0, -4)));
});

test('nome e cidade respeitam o limite do padrão', () => {
  const f = parse(pixPayload({ key: 'k', name: 'x'.repeat(40), city: 'y'.repeat(40), amount: 1 }));
  assert.equal(f['59'].length, 25);
  assert.equal(f['60'].length, 15);
});

test('recusa valor zero e chave vazia', () => {
  assert.throws(() => pixPayload({ key: 'k', name: 'n', city: 'c', amount: 0 }));
  assert.throws(() => pixPayload({ key: '', name: 'n', city: 'c', amount: 10 }));
});

test('pixRef vira txid válido a partir de um uuid', () => {
  const ref = pixRef('7d531e3f-8c1d-4553-badb-1acd59427996');
  assert.match(ref, /^[A-Z0-9]{25}$/);
});
