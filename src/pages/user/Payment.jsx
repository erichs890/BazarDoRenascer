import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Copy, AlertCircle, QrCode } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Screen } from '../../components/AppShell';
import { Button, Field, KRow, Rise, toast } from '../../components/ui';
import { friendlyError } from '../../lib/supabase';
import { pixPayload, pixRef } from '../../lib/pix';
import { PAY_ICON } from '../../components/PaymentPicker';
import { money, dateBR } from '../../lib/format';

const FAKE_BOLETO = '23793.38128 60000.000003 00000.000400 1 99990000010000';

// A chave Pix é pública por natureza (vai dentro de todo QR que o app gera),
// mas fica no .env para não ser commitada nem fixada no código.
const PIX = {
  key: import.meta.env.VITE_PIX_KEY,
  name: import.meta.env.VITE_PIX_NAME || 'Bazar do Renascer',
  city: import.meta.env.VITE_PIX_CITY || 'Sao Paulo',
};

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
  const { checkout, donate } = useApp();
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');
  const [pix, setPix] = useState(null); // { ref, code, qr, result } depois de gerado

  // Sem contexto de pagamento (recarregou a página, link direto): volta ao início.
  if (!state?.payment) return <Navigate to="/loja" replace />;

  const { kind, amount, payment } = state;
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

  // Cartão e boleto continuam simulados: gravam como pagos.
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

      {payment === 'Pix' ? (
        <Rise i={1}>
          {!PIX.key ? (
            <div className="notice notice--offline" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>O Pix ainda não foi configurado. Escolha outra forma de pagamento.</span>
            </div>
          ) : !pix ? (
            <div className="card">
              <h2 className="t-subtitle">Pagamento por Pix</h2>
              <p className="t-muted mb-4">
                {kind === 'purchase'
                  ? 'Ao gerar o código, as peças ficam reservadas para você.'
                  : 'Ao gerar o código, registramos a sua doação.'}
                {' '}A confirmação é feita pela equipe do bazar assim que o Pix aparecer no extrato.
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
              <KRow label="Recebedor" value={PIX.name} />
              <KRow label="Referência" value={pix.ref} />
              <p className="t-muted t-sm mt-2">
                O valor já vem preenchido. Depois de pagar no app do seu banco, toque em "Já paguei".
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate('/sucesso', {
                  replace: true,
                  state: { kind, result: pix.result, amount, payment, pending: true, ref: pix.ref },
                })}
              >
                Já paguei
              </Button>
            </div>
          )}
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
