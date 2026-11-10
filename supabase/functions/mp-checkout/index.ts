/**
 * mp-checkout — Checkout Pro: cria o pedido (ou a doação) e uma "preferência"
 * no Mercado Pago, e devolve o link da página de pagamento deles.
 *
 * A pessoa paga lá (Pix, cartão ou boleto — só o tipo escolhido no app
 * aparece) e volta para /pagamento/retorno. Quem confirma é o webhook: o
 * retorno pelo navegador só serve para mostrar a tela certa.
 *
 * Chamada pelo app com o token de quem está logado:
 *   { kind: 'purchase', productIds, payment, returnUrl }
 *   { kind: 'donation', amount, anonymous?, payment, returnUrl }
 * payment = 'Pix' | 'Cartão de crédito' | 'Boleto'
 * returnUrl = origem do app (ex.: https://bazar.exemplo.com). Se o secret
 * SITE_URL existir, ele vence — assim ninguém usa a função para redirecionar
 * para outro site.
 *
 * Secrets: MP_ACCESS_TOKEN (obrigatório), SITE_URL (recomendado em produção).
 */
import { MP_API, excludedTypes, toReference } from '../_shared/mercadopago.ts';
import { cors, criaPedido, json } from '../_shared/pedido.ts';

const MAX_PARCELAS = 3;
const PAGAMENTOS = ['Pix', 'Cartão de crédito', 'Boleto'] as const;
type Pagamento = typeof PAGAMENTOS[number];

const iso = (ms: number) => new Date(ms).toISOString();

function origem(body: unknown): string | null {
  const raw = Deno.env.get('SITE_URL') || (body as { returnUrl?: string })?.returnUrl;
  try {
    const u = new URL(String(raw));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return json({ error: 'Pagamento pelo Mercado Pago ainda não configurado.' }, 503);

  // Valida antes de criar o pedido: requisição ruim não reserva peça.
  const peek = await req.clone().json().catch(() => null);
  const payment = peek?.payment as Pagamento;
  const base = origem(peek);
  if (!PAGAMENTOS.includes(payment) || !base) return json({ error: 'Requisição inválida' }, 400);

  const pedido = await criaPedido(req, payment);
  if (pedido instanceof Response) return pedido;
  const { kind, ref, amount, email, admin, url, desfaz } = pedido;

  const reference = toReference(kind, ref);
  const volta = `${base}/pagamento/retorno?kind=${kind === 'sale' ? 'purchase' : 'donation'}&id=${ref}`;
  const now = Date.now();
  const titulo = kind === 'sale' ? 'Bazar do Renascer — compra' : 'Bazar do Renascer — doação';

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': reference,
    },
    body: JSON.stringify({
      items: [{
        id: ref, title: titulo, quantity: 1, currency_id: 'BRL',
        unit_price: Number(amount.toFixed(2)),
      }],
      payer: { email },
      external_reference: reference,
      notification_url: `${url}/functions/v1/mp-webhook`,
      back_urls: { success: volta, pending: volta, failure: volta },
      // O Mercado Pago só aceita voltar sozinho para endereço https.
      ...(base.startsWith('https:') ? { auto_return: 'approved' } : {}),
      payment_methods: {
        excluded_payment_types: excludedTypes(payment),
        installments: MAX_PARCELAS,
      },
      // A página vale por 1 h; depois de 2 h sem pagamento em andamento, o
      // pg_cron cancela o pedido e devolve as peças.
      expires: true,
      expiration_date_from: iso(now - 60_000),
      expiration_date_to: iso(now + 60 * 60_000),
      // Boleto vence em 3 dias (o Mercado Pago exige entre 1 e 30).
      ...(payment === 'Boleto' ? { date_of_expiration: iso(now + 3 * 24 * 3_600_000) } : {}),
      statement_descriptor: 'BAZARRENASCER',
    }),
  });
  const pref = await res.json().catch(() => null);

  if (!res.ok || !pref?.init_point) {
    console.error('Mercado Pago recusou a preferência', res.status, JSON.stringify(pref));
    await desfaz();
    return json({ error: 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.' }, 502);
  }

  const { error: attachError } = await admin.rpc('gateway_attach', {
    p_kind: kind, p_ref: ref, p_provider_ref: `pref:${pref.id}`,
  });
  if (attachError) {
    // Sem a marca "pref:", o webhook não reconheceria o pagamento: melhor não abrir.
    console.error('gateway_attach falhou', ref, attachError.message);
    await desfaz();
    return json({ error: 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.' }, 500);
  }

  // Sempre init_point: o Mercado Pago não tem mais sandbox. Teste e produção
  // usam o mesmo link; muda só a credencial (conta real ou usuário de teste).
  return json({ id: ref, amount, init_point: pref.init_point });
});
