import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, Clock } from 'lucide-react';
import { Screen } from '../../components/AppShell';
import { Button, KRow, Price, Rise } from '../../components/ui';
import { money, dateBR } from '../../lib/format';

export default function Success() {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!state?.result) return <Navigate to="/loja" replace />;

  const { kind, result, amount, payment, pending, auto, ref, installments } = state;
  const purchase = kind === 'purchase';
  // Pagamento ainda não confirmado: dizer "confirmado" aqui seria mentir.
  const title = pending
    ? (purchase ? 'Pedido reservado!' : 'Doação registrada!')
    : (purchase ? 'Compra confirmada!' : 'Obrigado pela doação!');
  const card = payment === 'Cartão de crédito';
  const quem = card
    ? 'o Mercado Pago terminar a análise do cartão (pode levar até 2 dias), o bazar confirma'
    : payment === 'Boleto' ? 'o boleto compensar (até 3 dias úteis depois de pago), o bazar confirma'
    : auto ? 'o Mercado Pago confirmar o pagamento, o bazar confirma' : 'o Pix aparecer no extrato, a equipe do bazar confirma';
  const text = pending
    ? `Assim que ${quem} ${purchase ? 'o pedido e prepara o envio' : 'a doação'}. Você acompanha o status no seu histórico.`
    : (purchase ? 'Suas peças serão enviadas para o endereço cadastrado.' : 'Sua generosidade transforma vidas.');
  // replace: o "voltar" não retorna para o pagamento já concluído.
  const go = (to) => navigate(to, { replace: true });

  return (
    <Screen atmosphere="primary" center noNav>
      <div className="t-center mb-5">
        <div className={`orb ${pending ? 'orb--accent' : 'orb--success'} pop`}>
          {pending
            ? <Clock size={52} strokeWidth={2.5} aria-hidden="true" />
            : <Check size={56} strokeWidth={3} aria-hidden="true" />}
        </div>
        <Rise i={2}>
          <h1 className="t-title">{title}</h1>
          <p className="t-muted mt-2">{text}</p>
        </Rise>
      </div>

      <Rise i={4}>
        <div className="card">
          <p className="t-label">Resumo da transação</p>
          {purchase && result.items.map((p) => (
            <KRow key={p.id} label={p.name} value={money(p.price)} />
          ))}
          <KRow label="Forma de pagamento" value={installments > 1 ? `${payment} (${installments}x)` : payment} />
          {pending && <KRow label="Situação" value="Aguardando confirmação" />}
          {ref && <KRow label="Referência" value={ref} />}
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
