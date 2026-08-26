import { Heart } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { dateBR } from '../../lib/format';
import HistoryPage from './HistoryPage';

export default function Donations() {
  const { donations } = useApp();
  return (
    <HistoryPage
      title="Doações"
      noun="doação(ões)"
      icon={Heart}
      accent
      tone="var(--accent-ink)"
      records={donations.map((d) => ({ ...d, title: d.donorName }))}
      renderMeta={(d) => dateBR(d.date)}
    />
  );
}
