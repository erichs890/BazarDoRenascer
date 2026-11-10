/**
 * CEP → endereço pelo ViaCEP (https://viacep.com.br), serviço público e
 * gratuito. Só o CEP sai do navegador; nada do usuário vai junto.
 */

export const cepDigits = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 8);

/** "01001000" → "01001-000", formatando enquanto a pessoa digita. */
export const maskCep = (v) => {
  const d = cepDigits(v);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

/**
 * Resposta do ViaCEP → campos do formulário. Só devolve o que veio preenchido:
 * CEP geral de cidade pequena não tem rua nem bairro, e isso não pode apagar o
 * que a pessoa já digitou. null = CEP inexistente.
 */
export function fromViaCep(r) {
  if (!r || r.erro) return null;
  const out = {
    street: r.logradouro,
    neighborhood: r.bairro,
    city: r.localidade,
    state: r.uf,
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v && String(v).trim()));
}

/**
 * Busca o CEP. Devolve os campos encontrados, null se o CEP não existe, ou
 * lança erro em falha de rede (aí a pessoa preenche na mão).
 */
export async function lookupCep(cep, { signal } = {}) {
  const d = cepDigits(cep);
  if (d.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal });
  if (res.status === 400) return null; // formato inválido
  if (!res.ok) throw new Error(`ViaCEP respondeu ${res.status}`);
  return fromViaCep(await res.json());
}
