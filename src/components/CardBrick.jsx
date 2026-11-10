import { useMemo } from 'react';
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import { MP_PUBLIC_KEY } from '../lib/gateway';

// Carregado sob demanda (React.lazy): quem paga com Pix não baixa o SDK.
initMercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });

export const MAX_INSTALLMENTS = 3; // espelha MAX_PARCELAS em supabase/functions/mp-card

/**
 * Formulário de cartão do próprio Mercado Pago. Os campos rodam em iframes
 * deles: o número do cartão nunca toca o app nem o nosso servidor — `onSubmit`
 * recebe só um token de uso único.
 *
 * `onSubmit` deve resolver sempre (o erro é mostrado pela tela de pagamento);
 * se rejeitar, o formulário mostra a mensagem genérica dele.
 */
/**
 * Cores do app (tokens.css) aplicadas ao formulário do Mercado Pago, para ele
 * parecer parte da tela e não um bloco de outro site. Lidas na hora: acompanham
 * o tema claro/escuro.
 */
function appStyle(dark) {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  return {
    theme: dark ? 'dark' : 'default',
    customVariables: {
      baseColor: v('--primary'),
      textPrimaryColor: v('--text'),
      textSecondaryColor: v('--muted'),
      inputBackgroundColor: v('--surface'),
      formBackgroundColor: 'transparent', // o card da tela já é o fundo
      outlinePrimaryColor: v('--border'),
      errorColor: v('--danger'),
      successColor: v('--success'),
      borderRadiusMedium: '12px',
      borderRadiusLarge: '14px',
      formPadding: '0px',
    },
  };
}

export default function CardBrick({ amount, email, onSubmit, onReady, onError }) {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Objetos estáveis: o Brick se recria inteiro quando essas props mudam.
  const initialization = useMemo(() => ({ amount, payer: { email } }), [amount, email]);
  const customization = useMemo(() => ({
    paymentMethods: { maxInstallments: MAX_INSTALLMENTS, types: { excluded: ['debit_card', 'prepaid_card'] } },
    visual: { hideFormTitle: true, style: appStyle(dark) },
  }), [dark]);

  return (
    <CardPayment
      initialization={initialization}
      customization={customization}
      onSubmit={onSubmit}
      onReady={onReady}
      onError={onError}
    />
  );
}
