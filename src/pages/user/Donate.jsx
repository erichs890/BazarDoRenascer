import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Screen } from '../../components/AppShell';
import { Button, Field, Rise } from '../../components/ui';
import PaymentPicker from '../../components/PaymentPicker';
import { money, parseAmount } from '../../lib/format';

const PRESETS = [10, 20, 50, 100];

export default function Donate() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState(20);
  const [custom, setCustom] = useState('');
  const [payment, setPayment] = useState('Pix');

  const amount = custom ? parseAmount(custom) : preset;
  const valid = amount > 0;

  return (
    <Screen title="Quero apenas doar" atmosphere="accent">
      <Rise i={0} className="mb-4">
        <div className="orb orb--sm orb--accent mb-4">
          <Heart size={30} fill="currentColor" aria-hidden="true" />
        </div>
        <p className="t-label">Doação avulsa</p>
        <h2 className="t-title">
          Sua ajuda,<br />
          <span className="t-soft" style={{ color: 'var(--accent-ink)' }}>direto ao ponto.</span>
        </h2>
        <p className="t-muted mt-2">
          Não precisa comprar nada. Todo valor vai para as ações do Bazar do Renascer.
        </p>
      </Rise>

      <Rise i={1}>
        <div className="card">
          <h3 className="t-subtitle">Escolha um valor</h3>
          <div className="amount-opts" role="radiogroup" aria-label="Valor da doação">
            {PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={!custom && preset === v}
                className="amount-opt"
                onClick={() => { setPreset(v); setCustom(''); }}
              >
                R$ {v}
              </button>
            ))}
          </div>
          <Field
            label="Ou digite outro valor (R$)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            error={custom && !valid ? 'Informe um valor maior que zero.' : ''}
          />
        </div>
      </Rise>

      <Rise i={2}>
        <div className="card">
          <h3 className="t-subtitle">Forma de pagamento</h3>
          <PaymentPicker value={payment} onChange={setPayment} />
        </div>
        <Button
          variant="accent"
          disabled={!valid}
          icon={<Heart size={20} fill="currentColor" aria-hidden="true" />}
          onClick={() => navigate('/pagamento', { state: { kind: 'donation', amount, payment } })}
        >
          Doar {money(valid ? amount : 0)}
        </Button>
      </Rise>
    </Screen>
  );
}
