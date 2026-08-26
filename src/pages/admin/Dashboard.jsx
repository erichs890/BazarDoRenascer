import { CheckCheck, Shirt, Receipt, Heart, LogOut } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Screen, OfflineBar, InstallPrompt } from '../../components/AppShell';
import { KRow, Rise, IconButton } from '../../components/ui';
import { money, monthBR } from '../../lib/format';

const thisMonth = (iso) => {
  const d = new Date(iso);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};

function Stat({ icon: Icon, label, value, success }) {
  return (
    <div className="card stat">
      <span
        className="item__icon"
        style={success ? { background: 'var(--success-soft)', color: 'var(--success)' } : undefined}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="stat__value mt-2">{value}</p>
      <p className="t-label" style={{ marginBottom: 0 }}>{label}</p>
    </div>
  );
}

function Bar({ icon: Icon, label, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bar">
      <div className="bar__head">
        <span className="cluster" style={{ gap: 6 }}>
          <Icon size={14} aria-hidden="true" style={{ color }} />
          {label}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {money(value)} <span className="t-muted t-sm">· {pct}%</span>
        </span>
      </div>
      <div
        className="bar__track"
        role="progressbar"
        aria-label={`${label}: ${pct}% do arrecadado`}
        aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      >
        <div className="bar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, products, sales, donations, logout } = useApp();

  const mSales = sales.filter((s) => thisMonth(s.date));
  const mDon = donations.filter((d) => thisMonth(d.date));
  const salesTotal = mSales.reduce((a, s) => a + s.amount, 0);
  const donTotal = mDon.reduce((a, d) => a + d.amount, 0);
  const total = salesTotal + donTotal;

  return (
    <Screen
      title="Painel do bazar"
      atmosphere="primary"
      action={
        <IconButton label="Sair da conta" onClick={logout}>
          <LogOut size={22} aria-hidden="true" />
        </IconButton>
      }
    >
      <OfflineBar />
      <InstallPrompt />

      <Rise i={0}><p className="t-label">Olá, {user.name}</p></Rise>

      <Rise i={1}>
        <div className="hero-card">
          <p className="t-label">Arrecadado em {monthBR()}</p>
          <p className="hero-card__value">{money(total)}</p>
          <p style={{ opacity: .85, fontWeight: 500 }}>
            {mSales.length} vendas · {mDon.length} doações
          </p>
        </div>
      </Rise>

      <Rise i={2}>
        <div className="card">
          <h2 className="t-subtitle">Vendas × Doações no mês</h2>
          <Bar icon={Receipt} label="Vendas" value={salesTotal} total={total} color="var(--primary-ink)" />
          <Bar icon={Heart} label="Doações" value={donTotal} total={total} color="var(--accent)" />
        </div>
      </Rise>

      <Rise i={3}>
        <div className="stats">
          <Stat icon={CheckCheck} label="Vendidos" success value={products.filter((p) => p.status === 'sold').length} />
          <Stat icon={Shirt} label="Disponíveis" value={products.filter((p) => p.status === 'available').length} />
        </div>
      </Rise>

      <Rise i={4}>
        <div className="card">
          <h2 className="t-subtitle">Histórico geral</h2>
          <KRow label="Total em vendas" value={money(sales.reduce((a, s) => a + s.amount, 0))} />
          <KRow label="Total em doações" value={money(donations.reduce((a, d) => a + d.amount, 0))} />
          <KRow label="Peças cadastradas" value={products.length} />
        </div>
      </Rise>
    </Screen>
  );
}
