import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Screen } from '../../components/AppShell';
import { Button, Rise } from '../../components/ui';

const POLL_MS = 3000;
const ESPERA_MAX_MS = 60_000;
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Volta do Checkout Pro. O Mercado Pago acrescenta ?status=... na URL, mas isso
 * vem do navegador e qualquer um edita: serve só para escolher a mensagem.
 * Quem diz se está pago é o banco, atualizado pelo webhook.
 */
export default function PaymentReturn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { orderSummary, refresh } = useApp();
  const kind = params.get('kind') === 'donation' ? 'donation' : 'purchase';
  const id = params.get('id') || '';
  const mpStatus = params.get('collection_status') || params.get('status') || '';
  const [order, setOrder] = useState(undefined); // undefined = carregando, null = não achou
  const [timedOut, setTimedOut] = useState(false);

  let retryUrl = null;
  try { retryUrl = sessionStorage.getItem(`mp-checkout:${id}`); } catch { /* aba privada */ }

  useEffect(() => {
    if (!UUID.test(id)) return undefined;
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      const o = await orderSummary(kind, id);
      if (stop) return;
      setOrder(o);
      if (o?.status !== 'pending') return;
      if (Date.now() - started > ESPERA_MAX_MS) { setTimedOut(true); return; }
      setTimeout(tick, POLL_MS);
    };
    tick();
    return () => { stop = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id]);

  const toSuccess = (pending) => {
    refresh();
    try { sessionStorage.removeItem(`mp-checkout:${id}`); } catch { /* idem */ }
    navigate('/sucesso', {
      replace: true,
      state: {
        kind,
        result: { id, items: order.items, date: order.date },
        amount: order.amount,
        payment: order.payment,
        pending,
        auto: true,
      },
    });
  };

  // Decisões que levam a outra tela.
  const emAndamento = ['pending', 'in_process'].includes(mpStatus);
  useEffect(() => {
    if (!order) return;
    if (order.status === 'paid') toSuccess(false);
    // Boleto emitido / Pix gerado / cartão em análise: o webhook confirma depois.
    else if (order.status === 'pending' && (emAndamento || (mpStatus === 'approved' && timedOut))) toSuccess(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, timedOut]);

  if (!UUID.test(id)) return <Navigate to="/loja" replace />;

  const voltar = () => navigate(kind === 'purchase' ? '/loja' : '/doar', { replace: true });
  const aguardando = order === undefined || (order?.status === 'pending' && (mpStatus === 'approved' || emAndamento));

  return (
    <Screen title="Pagamento" noNav>
      <Rise i={0}>
        {aguardando ? (
          <div className="card t-center">
            <Loader2 size={32} className="spin" aria-hidden="true" style={{ marginInline: 'auto' }} />
            <p className="t-muted mt-2" role="status">Confirmando o pagamento com o Mercado Pago…</p>
          </div>
        ) : order === null ? (
          <div className="card">
            <h2 className="t-subtitle">Pedido não encontrado</h2>
            <p className="t-muted mb-4">Confira o seu histórico: se o pagamento foi feito, ele aparece lá.</p>
            <Button onClick={() => navigate('/perfil', { replace: true })}>Ver meu histórico</Button>
          </div>
        ) : order.status === 'cancelled' ? (
          <div className="card">
            <h2 className="t-subtitle">Pagamento não concluído</h2>
            <p className="t-muted mb-4">
              O prazo terminou e nada foi cobrado.
              {kind === 'purchase' && ' As peças voltaram para a vitrine.'}
            </p>
            <Button onClick={voltar}>{kind === 'purchase' ? 'Voltar à vitrine' : 'Tentar de novo'}</Button>
          </div>
        ) : (
          <div className="card">
            <h2 className="t-subtitle">O pagamento não foi concluído</h2>
            <div className="notice notice--offline mb-4" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>
                {mpStatus === 'rejected'
                  ? 'O Mercado Pago recusou o pagamento. Você pode tentar com outro cartão.'
                  : 'Você saiu do Mercado Pago antes de terminar.'}
              </span>
            </div>
            <p className="t-muted mb-4">
              {kind === 'purchase' ? 'As peças continuam reservadas por enquanto.' : 'Nada foi cobrado.'}
              {' '}Se não for pago em até 2 horas, o pedido é cancelado sozinho.
            </p>
            {retryUrl && (
              <Button onClick={() => window.location.assign(retryUrl)} icon={<ExternalLink size={20} aria-hidden="true" />}>
                Tentar de novo no Mercado Pago
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/perfil', { replace: true })}>
              Ver meu histórico
            </Button>
          </div>
        )}
      </Rise>
    </Screen>
  );
}
