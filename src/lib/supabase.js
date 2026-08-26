import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Falhar aqui, alto e claro, é melhor que um "Failed to fetch" opaco em cada tela.
if (!url || !key) {
  throw new Error(
    'Supabase não configurado. Copie .env.example para .env e preencha '
    + 'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (Dashboard → Project Settings → API).',
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Mensagens do Supabase são em inglês e técnicas. Traduz o que o usuário pode causar. */
export function friendlyError(error) {
  if (!error) return '';
  const m = error.message || String(error);
  const map = {
    'Invalid login credentials': 'E-mail ou senha inválidos.',
    'User already registered': 'Já existe uma conta com esse e-mail.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
    'Password should be at least 6 characters': 'A senha precisa de pelo menos 6 caracteres.',
    'Endereço de entrega obrigatório': 'Cadastre um endereço de entrega antes de finalizar.',
    'Uma ou mais peças não estão mais disponíveis': 'Alguém comprou uma das peças antes de você. Revise o carrinho.',
    'Failed to fetch': 'Sem conexão com o servidor. Verifique sua internet.',
  };
  for (const [k, v] of Object.entries(map)) if (m.includes(k)) return v;
  return m;
}

/**
 * O banco fala snake_case e devolve numeric como texto; o app fala camelCase e
 * faz conta com número. A tradução acontece só aqui, na borda.
 */
export const fromDbProduct = (p) => ({
  ...p, image: p.image_url, createdAt: p.created_at, price: Number(p.price),
});
export const fromDbSale = (s) => ({
  ...s, productName: s.product_name, buyerName: s.buyer_name, buyerId: s.buyer_id,
  amount: Number(s.amount),
});
export const fromDbDonation = (d) => ({
  ...d, donorName: d.donor_name, donorId: d.donor_id, amount: Number(d.amount),
});
export const toDbProduct = ({ image, createdAt, id, created_at, image_url, ...rest }) => ({
  ...rest,
  image_url: image || image_url || null,
});
