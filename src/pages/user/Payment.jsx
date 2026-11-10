import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Copy, AlertCircle, QrCode, Loader2, Lock, ExternalLink } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Screen } from '../../components/AppShell';
import { Button, Field, KRow, Rise, toast } from '../../components/ui';
import { friendlyError } from '../../lib/supabase';
import { pixPayload, pixRef } from '../../lib/pix';
import { PAY_ICON } from '../../components/PaymentPicker';
import { money, dateBR } from '../../lib/format';
import { GATEWAY, CARD_GATEWAY, PRO } from '../../lib/gateway';

// O SDK do Mercado Pago só é baixado por quem escolhe cartão.
const CardBrick = lazy(() => import('../../components/CardBrick'));

const FAKE_BOLETO = '23793.38128 60000.000003 00000.000400 1 99990000010000';

// A chave Pix é pública por natureza (vai dentro de todo QR que o app gera),
// mas fica no .env para não ser commitada nem fixada no código.
const PIX = {
  key: import.meta.env.VITE_PIX_KEY,
  name: import.meta.env.VITE_PIX_NAME || 'Bazar do Renascer',
  city: import.meta.env.VITE_PIX_CITY || 'Sao Paulo',
};

const POLL_MS = 4000;

function CopyBox({ label, code }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast('Código copiado.');
    } catch {
      toast('Não foi possível copiar. Selecione o código manualmente.');
    }
  };
  return (
    <>
      <code className="code">{code}</code>
      <Button variant="outline" className="mt-2" onClick={copy} icon={<Copy size={18} aria-hidden="true" />}>
        {label}
      </Button>
    </>
  );
}

export default function Payment() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, checkout, donate, pixCharge, cardCharge, proCharge, paymentStatus } = useApp();
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');
  const [pix, setPix] = useState(null); // { ref, code, qr, result, auto, expiresAt } depois de gerado
  const [expired, setExpired] = useState(false);
  const [brickReady, setBrickReady] = useState(false);

  // Gateway: o webhook grava o pagamento no banco; aqui só se observa o status.
  useEffect(() => {
    if (!pix?.auto) return undefined;
    let stop = false;
    const tick = async () => {
      const status = await paymentStatus(state.kind, pix.result.id);
      if (stop) return;
      if (status === 'paid') {
        navigate('/sucesso', {
          replace: true,
          state: { kind: state.kind, result: pix.result, amount: pix.result.amount, payment: 'Pix' },
        });
      } else if (status === 'cancelled') {
        setPix(null);
        setExpired(true);
      }
    };
    const t = setInterval(tick, POLL_MS);
    return () => { stop = true; clearInterval(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix]);

  // Sem contexto de pagamento (recarregou a página, link direto): volta ao início.
  if (!state?.payment) return <Navigate to="/loja" replace />;

  const { kind, amount, payment } = state;
  const pixReady = GATEWAY || PIX.key;
  const Icon = PAY_ICON[payment];
  const set = (k) => (e) => setCard((c) => ({ ...c, [k]: e.target.value }));
  const register = () => (kind === 'purchase' ? checkout(payment) : donate(amount, payment));

  /**
   * Gera o Pix só depois de criar o pedido pendente: a peça sai da vitrine na
   * hora, ninguém paga por algo que outra pessoa está pagando, e o código já
   * carrega a referência do pedido para o admin achar no extrato.
   */
  const gerarPix = async () => {
    setFailure('');
    setLoading(true);

    if (GATEWAY) {
      const { result, charge, error } = await pixCharge(kind, amount);
      setLoading(false);
      if (error) {
        setFailure(friendlyError(error));
        return;
      }
      setPix({
        ref: pixRef(result.id),
        code: charge.code,
        qr: `data:image/png;base64,${charge.qrBase64}`,
        expiresAt: charge.expiresAt,
        result,
        auto: true,
      });
      return;
    }

    const { result, error } = await register();
    if (error) {
      setLoading(false);
      setFailure(friendlyError(error));
      return;
    }
    const ref = pixRef(result.id);
    const code = pixPayload({ ...PIX, amount, txid: ref });
    // QR só é baixado aqui: quem paga com cartão não carrega essa biblioteca.
    const { default: qrcode } = await import('qrcode-generator');
    const q = qrcode(0, 'M');
    q.addData(code);
    q.make();
    setPix({ ref, code, qr: q.createDataURL(6, 2), result });
    setLoading(false);
  };

  /**
   * Cartão real: o Brick já tokenizou os dados; a Edge Function cria o pedido e
   * cobra. Resolve sempre — recusa vira mensagem aqui e o formulário continua
   * de pé para tentar outro cartão (o pedido recusado já foi desfeito).
   */
  const pagarCartao = async (formData) => {
    setFailure('');
    const { result, charge, error } = await cardCharge(kind, amount, formData);
    if (error) {
      setFailure(friendlyError(error));
      return;
    }
    const pending = charge.status !== 'approved'; // em análise antifraude
    navigate('/sucesso', {
      replace: true,
      state: {
        kind, result, amount: result.amount, payment, pending, auto: pending,
        installments: charge.installments,
      },
    });
  };

  /** Checkout Pro: cria o pedido e sai do app para a página do Mercado Pago. */
  const irParaMercadoPago = async () => {
    setFailure('');
    setLoading(true);
    const { charge, error } = await proCharge(kind, amount, payment);
    if (error) {
      setLoading(false);
      setFailure(friendlyError(error));
      return;
    }
    window.location.assign(charge.init_point); // o loading fica até a página trocar
  };

  // Sem gateway, cartão e boleto são simulados: gravam como pagos.
  const confirm = async (e) => {
    e.preventDefault();
    if (payment === 'Cartão de crédito') {
      const err = {};
      if (card.number.replace(/\D/g, '').length < 16) err.number = 'Número inválido — precisa de 16 dígitos.';
      if (!card.name.trim()) err.name = 'Informe o nome impresso no cartão.';
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) err.expiry = 'Use o formato MM/AA.';
      if (card.cvv.length < 3) err.cvv = 'CVV com 3 ou 4 dígitos.';
      setErrors(err);
      if (Object.keys(err).length) {
        document.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
    }
    setFailure('');
    setLoading(true);
    const { result, error } = await register();
    setLoading(false);
    if (error) {
      setFailure(friendlyError(error));
      return;
    }
    navigate('/sucesso', { replace: true, state: { kind, result, amount, payment } });
  };

  const failureBox = failure && (
    <div className="notice notice--offline" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <span>{failure}</span>
    </div>
  );

  return (
    <Screen title="Pagamento" back={!pix} noNav>
      <Rise i={0}>
        <div className="card t-center">
          <div className="orb orb--sm" style={{ marginInline: 'auto' }}>
            <Icon size={28} aria-hidden="true" />
          </div>
          <p className="t-label mt-2">{kind === 'purchase' ? 'Compra' : 'Doação'} via {payment}</p>
          <p className="t-display" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(amount)}</p>
        </div>
      </Rise>

      {PRO ? (
        <Rise i={1}>
          <div className="card">
            <h2 className="t-subtitle">Pagamento pelo Mercado Pago</h2>
            <p className="t-muted mb-4">
              Você vai para a página segura do Mercado Pago para pagar com{' '}
              {payment === 'Cartão de crédito' ? 'cartão de crédito (em até 3x)' : payment}.
              {kind === 'purchase' && ' As peças ficam reservadas para você enquanto isso.'}
              {' '}Depois é só voltar para o app: a confirmação é automática.
            </p>
            {failureBox}
            <Button
              data-mp-checkout-cta="checkout-pro"
              loading={loading}
              onClick={irParaMercadoPago}
              icon={<ExternalLink size={20} aria-hidden="true" />}
            >
              Pagar com Mercado Pago
            </Button>
          </div>
        </Rise>
      ) : payment === 'Pix' ? (
        <Rise i={1}>
          {!pixReady ? (
            <div className="notice notice--offline" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>O Pix ainda não foi configurado. Escolha outra forma de pagamento.</span>
            </div>
          ) : expired ? (
            <div className="card">
              <h2 className="t-subtitle">O Pix expirou</h2>
              <p className="t-muted mb-4">
                O prazo para pagar terminou e nada foi cobrado.
                {kind === 'purchase' && ' As peças voltaram para a vitrine.'}
              </p>
              <Button onClick={() => navigate(kind === 'purchase' ? '/loja' : '/doar', { replace: true })}>
                {kind === 'purchase' ? 'Voltar à vitrine' : 'Tentar de novo'}
              </Button>
            </div>
          ) : !pix ? (
            <div className="card">
              <h2 className="t-subtitle">Pagamento por Pix</h2>
              <p className="t-muted mb-4">
                {kind === 'purchase'
                  ? 'Ao gerar o código, as peças ficam reservadas para você.'
                  : 'Ao gerar o código, registramos a sua doação.'}
                {GATEWAY
                  ? ' A confirmação é automática assim que o pagamento cair.'
                  : ' A confirmação é feita pela equipe do bazar assim que o Pix aparecer no extrato.'}
              </p>
              {failureBox}
              <Button loading={loading} onClick={gerarPix} icon={<QrCode size={20} aria-hidden="true" />}>
                Gerar código Pix
              </Button>
            </div>
          ) : (
            <div className="card">
              <h2 className="t-subtitle">Escaneie ou copie o código</h2>
              <img
                className="qr-img"
                src={pix.qr}
                width="232"
                height="232"
                alt={`QR Code Pix de ${money(amount)} para ${PIX.name}`}
              />
              <CopyBox label="Copiar código Pix" code={pix.code} />
              {!pix.auto && <KRow label="Recebedor" value={PIX.name} />}
              <KRow label="Referência" value={pix.ref} />
              {pix.expiresAt && (
                <KRow
                  label="Pague até"
                  value={new Date(pix.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                />
              )}
              {pix.auto ? (
                <p className="t-muted t-sm mt-2 cluster" role="status">
                  <Loader2 size={16} className="spin" aria-hidden="true" />
                  Aguardando o pagamento — esta tela atualiza sozinha.
                </p>
              ) : (
                <p className="t-muted t-sm mt-2">
                  O valor já vem preenchido. Depois de pagar no app do seu banco, toque em "Já paguei".
                </p>
              )}
              <Button
                className="mt-4"
                variant={pix.auto ? 'outline' : undefined}
                onClick={() => navigate('/sucesso', {
                  replace: true,
                  state: {
                    kind, result: pix.result, amount: pix.result.amount ?? amount, payment,
                    pending: true, auto: pix.auto, ref: pix.ref,
                  },
                })}
              >
                Já paguei
              </Button>
            </div>
          )}
        </Rise>
      ) : payment === 'Cartão de crédito' && CARD_GATEWAY ? (
        <Rise i={1}>
          <div className="card">
            <h2 className="t-subtitle">Dados do cartão</h2>
            <p className="t-muted t-sm cluster mb-4">
              <Lock size={14} aria-hidden="true" />
              Os dados vão direto para o Mercado Pago — o bazar nunca vê o número do cartão.
            </p>
            {!brickReady && (
              <p className="t-muted t-sm cluster" role="status">
                <Loader2 size={16} className="spin" aria-hidden="true" />
                Carregando formulário seguro…
              </p>
            )}
            <Suspense fallback={null}>
              <CardBrick
                amount={amount}
                email={user?.email}
                onSubmit={pagarCartao}
                onReady={() => setBrickReady(true)}
                onError={(e) => {
                  console.error('Card Payment Brick', e);
                  setBrickReady(true);
                  setFailure('Não foi possível carregar o formulário do cartão. Recarregue a página ou pague com Pix.');
                }}
              />
            </Suspense>
          </div>
          {failureBox}
        </Rise>
      ) : (
        <form onSubmit={confirm} noValidate>
          {payment === 'Boleto' && (
            <Rise i={1}>
              <div className="card">
                <h2 className="t-subtitle">Boleto bancário</h2>
                <CopyBox label="Copiar linha digitável" code={FAKE_BOLETO} />
                <KRow label="Vencimento" value={dateBR(Date.now() + 3 * 864e5)} />
                <p className="t-muted t-sm">A confirmação pode levar até 2 dias úteis.</p>
              </div>
            </Rise>
          )}

          {payment === 'Cartão de crédito' && (
            <Rise i={1}>
              <div className="card">
                <h2 className="t-subtitle">Dados do cartão</h2>
                <Field
                  label="Número do cartão" value={card.number} onChange={set('number')}
                  inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"
                  maxLength={19} error={errors.number}
                />
                <Field
                  label="Nome impresso" value={card.name} onChange={set('name')}
                  autoComplete="cc-name" autoCapitalize="characters"
                  placeholder="NOME COMO NO CARTÃO" error={errors.name}
                />
                <div className="row-2">
                  <Field
                    label="Validade" value={card.expiry} onChange={set('expiry')}
                    inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA"
                    maxLength={5} error={errors.expiry}
                  />
                  <Field
                    label="CVV" value={card.cvv} onChange={set('cvv')}
                    inputMode="numeric" autoComplete="cc-csc" placeholder="123"
                    maxLength={4} error={errors.cvv}
                  />
                </div>
              </div>
            </Rise>
          )}

          {failureBox}
          <Button type="submit" loading={loading}>
            {payment === 'Boleto' ? 'Gerar boleto e confirmar' : 'Pagar agora'}
          </Button>
          <p className="t-muted t-sm t-center mt-2">
            Cartão e boleto são de demonstração — nenhuma cobrança real.
          </p>
        </form>
      )}
    </Screen>
  );
}
