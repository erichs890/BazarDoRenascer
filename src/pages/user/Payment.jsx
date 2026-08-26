import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QrCode, Copy, AlertCircle } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Screen } from '../../components/AppShell';
import { Button, Field, KRow, Rise, toast } from '../../components/ui';
import { friendlyError } from '../../lib/supabase';
import { PAY_ICON } from '../../components/PaymentPicker';
import { money, dateBR } from '../../lib/format';

const FAKE_PIX = '00020126580014br.gov.bcb.pix0136bazar-do-renascer@pix.org.br5204000053039865802BR5918Bazar do Renascer6009SAO PAULO';
const FAKE_BOLETO = '23793.38128 60000.000003 00000.000400 1 99990000010000';

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

  // Sem contexto de pagamento (recarregou a página, link direto): volta ao início.
  if (!state?.payment) return <Navigate to="/loja" replace />;

  const { kind, amount, payment } = state;
  const Icon = PAY_ICON[payment];
  const set = (k) => (e) => setCard((c) => ({ ...c, [k]: e.target.value }));

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
    // ponytail: o gateway não existe — a RPC grava a venda/doação direto.
    // Com gateway real, isto vira "criar cobrança" e a confirmação chega por webhook.
    const { result, error } = kind === 'purchase'
      ? await checkout(payment)
      : await donate(amount, payment);
    setLoading(false);
    if (error) {
      // Peça vendida por outra pessoa no meio do caminho cai aqui.
      setFailure(friendlyError(error));
      return;
    }
    navigate('/sucesso', { replace: true, state: { kind, result, amount, payment } });
  };

  return (
    <Screen title="Pagamento" back noNav>
      <Rise i={0}>
        <div className="card t-center">
          <div className="orb orb--sm" style={{ marginInline: 'auto' }}>
            <Icon size={28} aria-hidden="true" />
          </div>
          <p className="t-label mt-2">{kind === 'purchase' ? 'Compra' : 'Doação'} via {payment}</p>
          <p className="t-display" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(amount)}</p>
        </div>
      </Rise>

      <form onSubmit={confirm} noValidate>
        {payment === 'Pix' && (
          <Rise i={1}>
            <div className="card">
              <h2 className="t-subtitle">Pix copia e cola</h2>
              <div className="qr" role="img" aria-label="QR Code Pix de demonstração">
                <QrCode size={128} aria-hidden="true" />
              </div>
              <CopyBox label="Copiar código Pix" code={FAKE_PIX} />
              <p className="t-muted t-sm mt-2">Após pagar no seu banco, toque em "Já paguei".</p>
            </div>
          </Rise>
        )}

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

        {failure && (
          <div className="notice notice--offline" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{failure}</span>
          </div>
        )}
        <Button type="submit" loading={loading}>
          {payment === 'Pix' ? 'Já paguei'
            : payment === 'Boleto' ? 'Gerar boleto e confirmar'
              : 'Pagar agora'}
        </Button>
        <p className="t-muted t-sm t-center mt-2">
          Ambiente de demonstração — nenhuma cobrança real.
        </p>
      </form>
    </Screen>
  );
}
