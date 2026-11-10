import { PAYMENTS } from '../data/enums';

/**
 * VITE_PAYMENT_GATEWAY:
 *   vazio               Pix estático (confirmação manual) e cartão/boleto de demonstração
 *   mercadopago-pro     Checkout Pro: a pessoa paga na página do Mercado Pago
 *                       (Pix, cartão ou boleto) e volta para o app
 *   mercadopago         Checkout Transparente: Pix e cartão dentro do próprio app
 * Nos dois modos do Mercado Pago a confirmação é automática (webhook).
 */
const MODE = import.meta.env.VITE_PAYMENT_GATEWAY;
export const PRO = MODE === 'mercadopago-pro';
export const GATEWAY = MODE === 'mercadopago' || PRO;

// Public Key é pública por definição (fica no navegador de quem paga); quem
// cobra é o Access Token, que só existe nos secrets das Edge Functions.
export const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY || '';

/** Formulário de cartão dentro do app — só no modo transparente. */
export const CARD_GATEWAY = MODE === 'mercadopago' && !!MP_PUBLIC_KEY;

/**
 * Formas oferecidas ao usuário. No modo transparente o banco grava todo pedido
 * como pendente — boleto (simulado) e cartão sem Public Key ficariam
 * pendurados, então somem da lista. No Checkout Pro, as três são reais.
 */
export const OFFERED_PAYMENTS = PRO || !GATEWAY
  ? PAYMENTS
  : PAYMENTS.filter((p) => p === 'Pix' || (p === 'Cartão de crédito' && CARD_GATEWAY));
