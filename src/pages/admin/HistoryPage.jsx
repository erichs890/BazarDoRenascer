import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Screen } from '../../components/AppShell';
import { Chips, Badge, Empty, Rise, Button, Sheet, toast } from '../../components/ui';
import { money } from '../../lib/format';
import { friendlyError, isPaid, STATUS_LABEL } from '../../lib/supabase';

const PERIODS = ['Esta semana', 'Este mês'];
const VIEWS = ['Aguardando Pix'];
const inPeriod = (iso, period) =>
  !period || Date.now() - new Date(iso).getTime() <= (period === 'Esta semana' ? 7 : 30) * 864e5;

/**
 * Vendas e Doações são a mesma tela com dados diferentes — um componente só,
 * parametrizado, em vez de duas cópias que divergem na primeira mudança.
 *
 * `onResolve(record, status)` confirma ou cancela um Pix pendente. O total
 * soma só o que foi pago: Pix pendente ainda não é dinheiro na conta.
 */
export default function HistoryPage({
  title, records, noun, icon: Icon, accent, tone, renderMeta, onResolve,
}) {
  const [period, setPeriod] = useState(null);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(null);
  const [toCancel, setToCancel] = useState(null);

  const inRange = records.filter((r) => inPeriod(r.date, period));
  const pending = inRange.filter((r) => r.status === 'pending');
  const list = view ? pending : inRange;
  const total = inRange.filter(isPaid).reduce((a, r) => a + r.amount, 0);

  const resolve = async (r, status) => {
    setBusy(r.id);
    const err = await onResolve(r, status);
    setBusy(null);
    setToCancel(null);
    toast(err ? friendlyError(err)
      : status === 'paid' ? 'Pagamento confirmado.' : 'Cancelado. A peça voltou para a vitrine.');
  };

  return (
    <Screen title={title} wide>
      <Chips label="Período" options={PERIODS} value={period} onChange={setPeriod} allLabel="Tudo" />
      {pending.length > 0 && (
        <Chips label="Situação" options={VIEWS} value={view} onChange={setView} allLabel="Todos" />
      )}

      <div className="card between">
        <div>
          <p className="t-label">{period || 'Todo o período'}</p>
          <p className="t-muted t-sm">
            {inRange.filter(isPaid).length} {noun} paga(s)
            {pending.length > 0 && ` · ${pending.length} aguardando Pix`}
          </p>
        </div>
        <p className="t-title--sm t-title" style={{ color: tone, fontVariantNumeric: 'tabular-nums' }}>
          {money(total)}
        </p>
      </div>

      {list.length ? <div className="list-grid">{list.map((r, i) => {
        const isPending = r.status === 'pending';
        const cancelled = r.status === 'cancelled';
        return (
          <Rise key={r.id} i={i}>
            <div className="card">
              <div className="item">
                <span className={`item__icon ${accent ? 'item__icon--accent' : ''}`}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div className="item__body">
                  <strong>{r.title}</strong>
                  <span className="t-muted t-sm">{renderMeta(r)}</span>
                  <span className="cluster mt-2">
                    <Badge tone={accent ? 'accent' : 'primary'}>{r.payment}</Badge>
                    {!isPaid(r) && (
                      <Badge tone={isPending ? 'accent' : 'muted'}>{STATUS_LABEL[r.status]}</Badge>
                    )}
                  </span>
                </div>
                <span
                  className="item__amount"
                  style={!isPaid(r) ? { color: 'var(--muted)', textDecoration: cancelled ? 'line-through' : 'none' } : undefined}
                >
                  {isPaid(r) ? '+' : ''}{money(r.amount)}
                </span>
              </div>

              {isPending && onResolve && (
                <>
                  <p className="t-muted t-sm mt-2">
                    Confira no extrato um Pix de <strong>{money(r.pixAmount ?? r.amount)}</strong>
                    {r.ref && <> com a referência <strong>{r.ref}</strong></>}.
                  </p>
                  <div className="row-2 mt-2">
                    <Button
                      variant="primary"
                      loading={busy === r.id}
                      disabled={!!busy}
                      onClick={() => resolve(r, 'paid')}
                      icon={<Check size={18} aria-hidden="true" />}
                    >
                      Confirmar
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!!busy}
                      onClick={() => setToCancel(r)}
                      icon={<X size={18} aria-hidden="true" />}
                      style={{ marginTop: 0 }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Rise>
        );
      })}</div> : <Empty>Nenhum registro no período.</Empty>}

      {/* Cancelar devolve a peça à vitrine — confirmação antes de agir. */}
      <Sheet open={!!toCancel} onClose={() => setToCancel(null)} title="Cancelar este Pix?">
        <p className="t-muted mb-4">
          Use quando o pagamento não chegou. {toCancel?.orderId
            ? 'As peças do pedido voltam para a vitrine e podem ser compradas por outra pessoa.'
            : 'A doação fica registrada como cancelada.'}
        </p>
        <Button variant="danger" loading={!!busy} onClick={() => resolve(toCancel, 'cancelled')}>
          Cancelar pagamento
        </Button>
        <Button variant="ghost" onClick={() => setToCancel(null)}>Voltar</Button>
      </Sheet>
    </Screen>
  );
}

