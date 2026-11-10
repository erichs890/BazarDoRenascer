/**
 * mp-card — cria o pedido (ou a doação) e cobra no cartão pelo Mercado Pago.
 *
 * O número do cartão NUNCA passa por aqui: o formulário do Mercado Pago (Card
 * Payment Brick) roda no navegador e troca os dados por um token de uso único.
 * Esta função só recebe esse token.
 *
 * Chamada pelo app com o token de quem está logado:
 *   { kind: 'purchase', productIds, card }
 *   { kind: 'donation', amount, anonymous?, card }
 * card = o que o Brick entrega: { token, payment_method_id, issuer_id,
 *                                 installments, payer: { email, identification } }
 *
 * O valor cobrado vem do banco (o do formulário é ignorado). Cartão responde na
 * hora: aprovado já confirma o pedido; recusado cancela e devolve as peças;
 * em análise fica pendente e o webhook resolve depois.
 *
 * Secrets: MP_ACCESS_TOKEN (obrigatório).
 */
import { MP_API, cardRejection, mapStatus, toReference } from '../_shared/mercadopago.ts';
import { cors, criaPedido, json } from '../_shared/pedido.ts';

const MAX_PARCELAS = 3;

type Card = {
  token?: string;
  payment_method_id?: string;
  issuer_id?: string | number;
  installments?: number;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return json({ error: 'Pagamento com cartão ainda não configurado.' }, 503);

  // Valida o cartão ANTES de criar o pedido: corpo ruim não reserva peça.
  const peek = await req.clone().json().catch(() => null);
  const card: Card = peek?.card ?? {};
  const installments = Math.trunc(Number(card.installments) || 1);
  if (!card.token || !card.payment_method_id || installments < 1 || installments > MAX_PARCELAS) {
    return json({ error: 'Dados do cartão incompletos.' }, 400);
  }

  const pedido = await criaPedido(req, 'Cartão de crédito');
  if (pedido instanceof Response) return pedido;
  const { kind, ref, amount, email, admin, url, desfaz } = pedido;

  const reference = toReference(kind, ref);
  const res = await fetch(`${MP_API}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': reference, // um pedido = no máximo uma cobrança
    },
    body: JSON.stringify({
      transaction_amount: Number(amount.toFixed(2)),
      token: card.token,
      installments,
      payment_method_id: card.payment_method_id,
      ...(card.issuer_id ? { issuer_id: Number(card.issuer_id) } : {}),
      description: kind === 'sale' ? 'Bazar do Renascer — compra' : 'Bazar do Renascer — doação',
      statement_descriptor: 'BAZARRENASCER',
      external_reference: reference,
      notification_url: `${url}/functions/v1/mp-webhook`,
      payer: {
        // E-mail da conta do bazar: é a ele que o pedido pertence.
        email,
        ...(card.payer?.identification?.number ? { identification: card.payer.identification } : {}),
      },
    }),
  });
  const payment = await res.json().catch(() => null);

  if (!res.ok || !payment?.id) {
    console.error('Mercado Pago recusou a requisição', res.status, JSON.stringify(payment));
    await desfaz();
    return json({ error: 'Não foi possível processar o cartão agora. Tente de novo em instantes.' }, 502);
  }

  const providerRef = String(payment.id);
  const status = mapStatus(payment.status);

  if (status === 'cancelled') {
    // Recusado: a cobrança não existe, o pedido sai e as peças voltam.
    await desfaz();
    return json({ status: 'rejected', error: cardRejection(payment.status_detail) }, 402);
  }

  const { error: attachError } = await admin.rpc('gateway_attach', {
    p_kind: kind, p_ref: ref, p_provider_ref: providerRef,
  });
  if (attachError) console.error('gateway_attach falhou', ref, attachError.message);

  if (status === 'paid') {
    const { data: result, error } = await admin.rpc('gateway_settle', {
      p_kind: kind, p_ref: ref, p_provider_ref: providerRef, p_status: 'paid',
      p_amount: payment.transaction_amount,
    });
    // Se falhar aqui, o webhook tenta de novo — o cliente pagou, não é erro dele.
    if (error || result !== 'ok') console.error('gateway_settle (cartão)', ref, result, error?.message);
  }

  return json({
    id: ref,
    amount,
    status: status === 'paid' ? 'approved' : 'pending', // pending = em análise antifraude
    installments,
  });
});
