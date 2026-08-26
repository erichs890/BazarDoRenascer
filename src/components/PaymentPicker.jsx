import { QrCode, CreditCard, Barcode, Circle, CheckCircle2 } from 'lucide-react';
import { PAYMENTS } from '../data/enums';

export const PAY_ICON = { Pix: QrCode, 'Cartão de crédito': CreditCard, Boleto: Barcode };
const HINT = {
  Pix: 'Aprovação imediata',
  'Cartão de crédito': 'Até 3x sem juros',
  Boleto: 'Compensa em até 2 dias úteis',
};

export default function PaymentPicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Forma de pagamento">
      {PAYMENTS.map((p) => {
        const Icon = PAY_ICON[p];
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            className="opt"
            onClick={() => onChange(p)}
          >
            <Icon size={22} aria-hidden="true" style={{ color: active ? 'var(--primary-ink)' : 'var(--muted)' }} />
            <span className="opt__body">
              <strong>{p}</strong>
              <span className="t-muted t-sm">{HINT[p]}</span>
            </span>
            {/* ícone + borda: a seleção não depende só de cor */}
            {active
              ? <CheckCircle2 size={22} aria-hidden="true" style={{ color: 'var(--primary-ink)' }} />
              : <Circle size={22} aria-hidden="true" style={{ color: 'var(--border)' }} />}
          </button>
        );
      })}
    </div>
  );
}
