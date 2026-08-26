import { PackageCheck } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { dateBR } from '../../lib/format';
import HistoryPage from './HistoryPage';

export default function Sales() {
  const { sales } = useApp();
  return (
    <HistoryPage
      title="Vendas"
      noun="venda(s)"
      icon={PackageCheck}
      tone="var(--primary-deep)"
      records={sales.map((s) => ({ ...s, title: s.productName }))}
      renderMeta={(s) => `${s.buyerName} · ${dateBR(s.date)}`}
    />
  );
}
