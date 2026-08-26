import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { Screen } from '../../components/AppShell';
import { Button, KRow, Price, Rise } from '../../components/ui';
import PaymentPicker from '../../components/PaymentPicker';
import { money } from '../../lib/format';
import { formatAddress } from './Address';

export default function Checkout() {
  const navigate = useNavigate();
  const { user, products, cart } = useApp();
  const [payment, setPayment] = useState('Pix');

  const items = products.filter((p) => cart.includes(p.id) && p.status === 'available');
  const total = items.reduce((a, p) => a + p.price, 0);

  // Carrinho esvaziado noutra aba (ou link direto): não deixa um checkout vazio de pé.
  if (!items.length) return <Navigate to="/carrinho" replace />;

  return (
    <Screen title="Finalizar compra" back noNav>
      <Rise i={0}>
        <div className="card">
          <h2 className="t-subtitle">Resumo do pedido</h2>
          {items.map((p) => (
            <KRow key={p.id} label={`${p.name} (Tam. ${p.size})`} value={money(p.price)} />
          ))}
          <hr className="divider" />
          <KRow label="Total" value={<Price value={total} />} total />
        </div>
      </Rise>

      <Rise i={1}>
        <div className="card">
          <div className="card-head mb-4">
            <h2 className="t-subtitle">Endereço de entrega</h2>
            <Link className="link-btn" to="/endereco">Editar</Link>
          </div>
          <p className="t-body">
            {user.address ? formatAddress(user.address) : 'Nenhum endereço cadastrado.'}
          </p>
        </div>
      </Rise>

      <Rise i={2}>
        <div className="card">
          <h2 className="t-subtitle">Forma de pagamento</h2>
          <PaymentPicker value={payment} onChange={setPayment} />
        </div>
        <Button
          disabled={!user.address}
          onClick={() => navigate('/pagamento', { state: { kind: 'purchase', amount: total, payment } })}
        >
          Pagar {money(total)}
        </Button>
        <p className="t-muted t-sm t-center mt-2">
          Pagamento simulado — nenhuma cobrança real será feita.
        </p>
      </Rise>
    </Screen>
  );
}
