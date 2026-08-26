// Único check runnable: `npm test`. Protege o parser de moeda e a formatação
// de dinheiro — é o caminho onde um erro vira preço errado na tela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money, parseAmount, dateBR } from './format.js';

const nbsp = (s) => s.replace(/ /g, ' '); // Intl usa espaço não-quebrável

test('money formata em BRL', () => {
  assert.equal(nbsp(money(15)), 'R$ 15,00');
  assert.equal(nbsp(money(1234.5)), 'R$ 1.234,50');
  assert.equal(nbsp(money(0)), 'R$ 0,00');
  assert.equal(nbsp(money('abc')), 'R$ 0,00'); // entrada suja não quebra a tela
});

test('parseAmount aceita vírgula, ponto de milhar e número', () => {
  assert.equal(parseAmount('12,50'), 12.5);
  assert.equal(parseAmount('12.50'), 12.5); // sem vírgula, o ponto é decimal
  assert.equal(parseAmount('1.234,56'), 1234.56);
  assert.equal(parseAmount(' 20 '), 20);
  assert.ok(Number.isNaN(parseAmount('abc')));
});

test('dateBR formata dd/mm/aaaa', () => {
  assert.equal(dateBR('2026-03-09T12:00:00.000Z'), '09/03/2026');
});
