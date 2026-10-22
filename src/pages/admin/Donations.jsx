import { Heart } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { dateBR } from '../../lib/format';
import { pixRef } from '../../lib/pix';
import HistoryPage from './HistoryPage';

export default function Donations() {
  const { donations, resolvePayment } = useApp();
  return (
    <HistoryPage
      title="Doações"
      noun="doação(ões)"
      icon={Heart}
      accent
      tone="var(--accent-ink)"
      records={donations.map((d) => ({ ...d, title: d.donorName, ref: pixRef(d.id) }))}
      renderMeta={(d) => dateBR(d.date)}
      onResolve={(r, status) => resolvePayment('donation', r.id, status)}
    />
  );
}
