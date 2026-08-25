import assert from 'node:assert/strict';
import { money } from './src/theme/index.js';
import { PRODUCTS, SALES } from './src/mocks/data.js';

assert.equal(money(1234.5), 'R$ 1.234,50');
assert.equal(money(10), 'R$ 10,00');
// vendas mockadas apontam para produtos marcados como vendidos
for (const s of SALES) assert.equal(PRODUCTS.find((p) => p.id === s.productId)?.status, 'sold', s.id);
console.log('ok');
