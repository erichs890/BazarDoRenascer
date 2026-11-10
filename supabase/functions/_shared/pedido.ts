/**
 * Parte comum de mp-pix e mp-card: autentica, cria o pedido pendente pelas
 * RPCs de sempre (com o token do usuário) e lê do banco o valor a cobrar.
 *
 * Devolve uma Response pronta quando algo dá errado, para a função só repassar.
 */
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { Kind } from './mercadopago.ts';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export type Pedido = {
  kind: Kind;
  ref: string;
  amount: number;
  email: string;
  body: Record<string, unknown>;
  admin: SupabaseClient;
  url: string;
  /** Cancela o pedido e devolve as peças — para quando a cobrança não sai. */
  desfaz: () => PromiseLike<unknown>;
};

export async function criaPedido(req: Request, payment: 'Pix' | 'Cartão de crédito' | 'Boleto'): Promise<Pedido | Response> {
  const url = Deno.env.get('SUPABASE_URL')!;
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: auth } = await user.auth.getUser();
  if (!auth?.user?.email) return json({ error: 'Não autenticado' }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Requisição inválida' }, 400); }

  let kind: Kind;
  let ref: string;
  if (body.kind === 'purchase') {
    const { data, error } = await user.rpc('checkout', { product_ids: body.productIds, payment });
    if (error) return json({ error: error.message }, 400);
    kind = 'sale';
    ref = data;
  } else if (body.kind === 'donation') {
    const { data, error } = await user.rpc('donate', {
      amount: body.amount, payment, anonymous: !!body.anonymous,
    });
    if (error) return json({ error: error.message }, 400);
    kind = 'donation';
    ref = data;
  } else {
    return json({ error: 'Requisição inválida' }, 400);
  }

  const desfaz = () => admin.rpc('gateway_settle', {
    p_kind: kind, p_ref: ref, p_provider_ref: null, p_status: 'cancelled', p_amount: null,
  });

  const { data: amount } = await admin.rpc('gateway_amount', { p_kind: kind, p_ref: ref });
  if (!(Number(amount) > 0)) {
    await desfaz();
    return json({ error: 'Não foi possível calcular o valor do pedido.' }, 500);
  }

  return { kind, ref, amount: Number(amount), email: auth.user.email, body, admin, url, desfaz };
}
