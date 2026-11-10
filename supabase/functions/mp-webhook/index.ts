/**
 * mp-webhook — o Mercado Pago avisa aqui quando um pagamento muda.
 *
 * A notificação só traz o id do pagamento. O status é sempre buscado na API do
 * Mercado Pago com o nosso token: mesmo que alguém forje uma notificação, o
 * máximo que consegue é fazer o bazar reconsultar um pagamento real.
 *
 * Roda SEM verificação de JWT (o Mercado Pago não tem token do Supabase):
 * deploy com --no-verify-jwt, ou o config.toml já cuida disso.
 *
 * Secrets: MP_ACCESS_TOKEN (obrigatório), MP_WEBHOOK_SECRET (opcional —
 * quando presente, notificações com assinatura inválida são recusadas).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { MP_API, holdUntil, mapStatus, parseReference, validSignature } from '../_shared/mercadopago.ts';

const ok = (msg = 'ok') => new Response(msg, { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });

  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return new Response('não configurado', { status: 503 });

  const url = new URL(req.url);
  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try { body = await req.json(); } catch { /* notificação no formato antigo vem só na URL */ }

  // Formato atual: ?data.id=..&type=payment. Formato antigo (IPN): ?id=..&topic=payment.
  const type = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? body.type ?? body.topic;
  const dataId = url.searchParams.get('data.id') ?? body?.data?.id ?? url.searchParams.get('id');
  if (type !== 'payment' || !dataId) return ok('ignorado'); // merchant_order etc.

  const secret = Deno.env.get('MP_WEBHOOK_SECRET');
  const signature = req.headers.get('x-signature');
  if (secret && signature) {
    const valid = await validSignature(secret, signature, String(dataId), req.headers.get('x-request-id'));
    if (!valid) return new Response('assinatura inválida', { status: 401 });
  }

  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(String(dataId))}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // 5xx: o Mercado Pago reenvia mais tarde. 404 de pagamento inexistente não adianta reenviar.
  if (res.status === 404) return ok('pagamento desconhecido');
  if (!res.ok) return new Response('falha ao consultar pagamento', { status: 502 });
  const payment = await res.json();

  const target = parseReference(payment.external_reference);
  if (!target) return ok('não é do bazar');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const status = mapStatus(payment.status);
  if (!status) {
    // Checkout Pro: boleto emitido / Pix gerado / cartão em análise segura o
    // pedido até o vencimento (pedidos de outros fluxos não são afetados).
    const { error } = await admin.rpc('gateway_hold', {
      p_kind: target.kind, p_ref: target.id, p_until: holdUntil(payment),
    });
    if (error) console.error('gateway_hold falhou', target, error.message);
    return ok(`em andamento: ${payment.status}`);
  }

  const { data: outcome, error } = await admin.rpc('gateway_settle', {
    p_kind: target.kind,
    p_ref: target.id,
    p_provider_ref: String(payment.id),
    p_status: status,
    p_amount: payment.transaction_amount,
  });
  if (error) {
    console.error('gateway_settle falhou', target, error.message);
    return new Response('erro ao gravar', { status: 500 }); // deixa o Mercado Pago reenviar
  }

  // Casos que pedem gente olhando: aparecem em Edge Functions → mp-webhook → Logs.
  if (['paid_after_cancel', 'amount_mismatch', 'ref_mismatch'].includes(outcome)) {
    console.error(`ATENÇÃO ${outcome}: pagamento ${payment.id} (${payment.status}, R$ ${payment.transaction_amount}) → ${target.kind} ${target.id}`);
  }
  return ok(outcome);
});
