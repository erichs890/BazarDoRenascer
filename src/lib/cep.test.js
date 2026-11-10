import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cepDigits, maskCep, fromViaCep } from './cep.js';

test('máscara do CEP enquanto digita', () => {
  assert.equal(maskCep('01001'), '01001');
  assert.equal(maskCep('010010'), '01001-0');
  assert.equal(maskCep('01001000'), '01001-000');
  assert.equal(maskCep('01001-000123'), '01001-000');
  assert.equal(cepDigits('01.001-000'), '01001000');
});

test('ViaCEP preenche só o que veio', () => {
  assert.deepEqual(
    fromViaCep({ logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' }),
    { street: 'Praça da Sé', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' },
  );
  // CEP geral de cidade: sem rua nem bairro — não sobrescreve com vazio.
  assert.deepEqual(
    fromViaCep({ logradouro: '', bairro: '', localidade: 'Itu', uf: 'SP' }),
    { city: 'Itu', state: 'SP' },
  );
  assert.equal(fromViaCep({ erro: true }), null);
  assert.equal(fromViaCep({ erro: 'true' }), null);
});
