import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Screen } from '../../components/AppShell';
import { Button, KRow, Price, Rise } from '../../components/ui';
import { money, dateBR } from '../../lib/format';

export default function Success() {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!state?.result) return <Navigate to="/loja" replace />;

  const { kind, result, amount, payment } = state;
  const purchase = kind === 'purchase';
  // replace: o "voltar" não retorna para o pagamento já concluído.
  const go = (to) => navigate(to, { replace: true });

  return (
    <Screen atmosphere="primary" center noNav>
      <div className="t-center mb-5">
        <div className="orb orb--success pop">
          <Check size={56} strokeWidth={3} aria-hidden="true" />
        </div>
        <Rise i={2}>
          <h1 className="t-title">{purchase ? 'Compra confirmada!' : 'Obrigado pela doação!'}</h1>
          <p className="t-muted mt-2">
            {purchase
              ? 'Suas peças serão enviadas para o endereço cadastrado.'
              : 'Sua generosidade transforma vidas.'}
          </p>
        </Rise>
      </div>

      <Rise i={4}>
        <div className="card">
          <p className="t-label">Resumo da transação</p>
          {purchase && result.items.map((p) => (
            <KRow key={p.id} label={p.name} value={money(p.price)} />
          ))}
          <KRow label="Forma de pagamento" value={payment} />
          <KRow label="Data" value={dateBR(result.date)} />
          <hr className="divider" />
          <KRow label="Total" value={<Price value={amount} />} total />
        </div>
        <Button onClick={() => go('/perfil')}>Ver meu histórico</Button>
        <Button variant="outline" onClick={() => go('/loja')}>Voltar à vitrine</Button>
      </Rise>
    </Screen>
  );
}
