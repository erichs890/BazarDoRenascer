import { PackageCheck } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { dateBR } from '../../lib/format';
import { pixRef } from '../../lib/pix';
import HistoryPage from './HistoryPage';

export default function Sales() {
  const { sales, resolvePayment } = useApp();

  // Um pedido pode ter várias peças, mas é UM Pix com o total. É esse total
  // que o admin procura no extrato — não o preço de cada peça.
  const orderTotal = {};
  for (const s of sales) orderTotal[s.orderId] = (orderTotal[s.orderId] || 0) + s.amount;

  return (
    <HistoryPage
      title="Vendas"
      noun="venda(s)"
      icon={PackageCheck}
      tone="var(--primary-deep)"
      records={sales.map((s) => ({
        ...s, title: s.productName, ref: pixRef(s.orderId), pixAmount: orderTotal[s.orderId],
      }))}
      renderMeta={(s) => `${s.buyerName} · ${dateBR(s.date)}`}
      // Confirmar ou cancelar vale para o pedido inteiro, não só para esta peça.
      onResolve={(r, status) => resolvePayment('sale', r.orderId, status)}
    />
  );
}
