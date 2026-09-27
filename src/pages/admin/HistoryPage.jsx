import { useState } from 'react';
import { Screen } from '../../components/AppShell';
import { Chips, Badge, Empty, Rise } from '../../components/ui';
import { money, dateBR } from '../../lib/format';

const PERIODS = ['Esta semana', 'Este mês'];
const inPeriod = (iso, period) =>
  !period || Date.now() - new Date(iso).getTime() <= (period === 'Esta semana' ? 7 : 30) * 864e5;

/**
 * Vendas e Doações são a mesma tela com dados diferentes — um componente só,
 * parametrizado, em vez de duas cópias que divergem na primeira mudança.
 */
export default function HistoryPage({ title, records, noun, icon: Icon, accent, tone, renderMeta }) {
  const [period, setPeriod] = useState(null);
  const list = records.filter((r) => inPeriod(r.date, period));
  const total = list.reduce((a, r) => a + r.amount, 0);

  return (
    <Screen title={title} wide>
      <Chips label="Período" options={PERIODS} value={period} onChange={setPeriod} allLabel="Tudo" />

      <div className="card between">
        <div>
          <p className="t-label">{period || 'Todo o período'}</p>
          <p className="t-muted t-sm">{list.length} {noun}</p>
        </div>
        <p className="t-title--sm t-title" style={{ color: tone, fontVariantNumeric: 'tabular-nums' }}>
          {money(total)}
        </p>
      </div>

      {list.length ? <div className="list-grid">{list.map((r, i) => (
        <Rise key={r.id} i={i}>
          <div className="card item">
            <span className={`item__icon ${accent ? 'item__icon--accent' : ''}`}>
              <Icon size={22} aria-hidden="true" />
            </span>
            <div className="item__body">
              <strong>{r.title}</strong>
              <span className="t-muted t-sm">{renderMeta(r)}</span>
              <span className="cluster mt-2">
                <Badge tone={accent ? 'accent' : 'primary'}>{r.payment}</Badge>
              </span>
            </div>
            <span className="item__amount">+{money(r.amount)}</span>
          </div>
        </Rise>
      ))}</div> : <Empty>Nenhum registro no período.</Empty>}
    </Screen>
  );
}

