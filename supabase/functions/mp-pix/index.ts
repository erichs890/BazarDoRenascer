/**
 * mp-pix — cria o pedido (ou a doação) e a cobrança Pix no Mercado Pago.
 *
 * Chamada pelo app com o token de quem está logado:
 *   { kind: 'purchase', productIds: string[] }
 *   { kind: 'donation', amount: number, anonymous?: boolean }
 *
 * O pedido é criado pelas MESMAS RPCs de sempre (checkout/donate), com o token
 * do usuário — então reserva atômica, endereço obrigatório e auth.uid() valem
 * igualzinho. O valor cobrado é lido do banco, nunca do corpo da requisição.
 *
 * Secrets: MP_ACCESS_TOKEN (obrigatório).
 * SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY o Supabase injeta.
 */
import { MP_API, expirationDate, toReference } from '../_shared/mercadopago.ts';
import { cors, criaPedido, json } from '../_shared/pedido.ts';

const EXPIRA_EM_MIN = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return json({ error: 'Pagamento por Pix ainda não configurado.' }, 503);

  const pedido = await criaPedido(req, 'Pix');
  if (pedido instanceof Response) return pedido;
  const { kind, ref, amount, email, admin, url, desfaz } = pedido;

  const reference = toReference(kind, ref);
  const res = await fetch(`${MP_API}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': reference, // repetir a chamada não cobra duas vezes
    },
    body: JSON.stringify({
      transaction_amount: Number(amount.toFixed(2)),
      payment_method_id: 'pix',
      description: kind === 'sale' ? 'Bazar do Renascer — compra' : 'Bazar do Renascer — doação',
      external_reference: reference,
      notification_url: `${url}/functions/v1/mp-webhook`,
      date_of_expiration: expirationDate(EXPIRA_EM_MIN),
      payer: { email },
    }),
  });
  const payment = await res.json().catch(() => null);
  const pix = payment?.point_of_interaction?.transaction_data;

  if (!res.ok || !pix?.qr_code) {
    console.error('Mercado Pago recusou a cobrança', res.status, JSON.stringify(payment));
    await desfaz();
    return json({ error: 'Não foi possível gerar o Pix agora. Tente de novo em instantes.' }, 502);
  }

  const { error: attachError } = await admin.rpc('gateway_attach', {
    p_kind: kind, p_ref: ref, p_provider_ref: String(payment.id),
  });
  if (attachError) console.error('gateway_attach falhou', ref, attachError.message);

  return json({
    id: ref,
    amount,
    code: pix.qr_code,
    qrBase64: pix.qr_code_base64,
    ticketUrl: pix.ticket_url ?? null,
    expiresAt: payment.date_of_expiration ?? null,
  });
});
