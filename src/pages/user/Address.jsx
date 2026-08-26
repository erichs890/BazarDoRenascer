import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { friendlyError } from '../../lib/supabase';
import { Screen } from '../../components/AppShell';
import { Button, Field, toast } from '../../components/ui';

const FIELDS = [
  ['cep', 'CEP', { inputMode: 'numeric', placeholder: '00000-000', maxLength: 9, autoComplete: 'postal-code' }],
  ['street', 'Rua', { placeholder: 'Nome da rua', autoComplete: 'address-line1' }],
  ['number', 'Número', { inputMode: 'numeric', placeholder: '123' }],
  ['complement', 'Complemento', { placeholder: 'Apto, bloco...', autoComplete: 'address-line2', optional: true }],
  ['neighborhood', 'Bairro', { placeholder: 'Bairro', autoComplete: 'address-level3' }],
  ['city', 'Cidade', { placeholder: 'Cidade', autoComplete: 'address-level2' }],
  ['state', 'Estado (UF)', { placeholder: 'SP', maxLength: 2, autoCapitalize: 'characters', autoComplete: 'address-level1' }],
];

export const formatAddress = (a) =>
  `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ''}\n`
  + `${a.neighborhood}, ${a.city} - ${a.state}\nCEP ${a.cep}`;

export default function Address() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { address, saveAddress } = useApp();
  const [a, setA] = useState(
    address || Object.fromEntries(FIELDS.map(([k]) => [k, ''])),
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    FIELDS.forEach(([k, label, { optional }]) => {
      if (!optional && !String(a[k] ?? '').trim()) err[k] = `Informe ${label.toLowerCase()}.`;
    });
    if (a.cep && String(a.cep).replace(/\D/g, '').length !== 8) err.cep = 'CEP deve ter 8 dígitos.';
    setErrors(err);
    if (Object.keys(err).length) {
      // Foco no primeiro campo inválido: exigência de acessibilidade em formulário.
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setSaving(true);
    const saveErr = await saveAddress(Object.fromEntries(FIELDS.map(([k]) => [k, a[k] || null])));
    setSaving(false);
    if (saveErr) {
      setErrors({ cep: friendlyError(saveErr) });
      return;
    }
    toast('Endereço salvo.');
    navigate(state?.next || -1, state?.next ? { replace: true } : undefined);
  };

  return (
    <Screen title="Endereço de entrega" back noNav>
      <div className="notice">
        <Lock size={18} aria-hidden="true" />
        <span>
          Usamos seu endereço apenas para a entrega das peças compradas. Nem a
          administração do bazar lê a lista de endereços — só o do pedido em envio.
        </span>
      </div>

      <form className="card" onSubmit={submit} noValidate>
        {FIELDS.map(([k, label, { optional, ...props }]) => (
          <Field
            key={k}
            label={optional ? label : `${label} *`}
            value={a[k] ?? ''}
            onChange={(e) => setA((x) => ({ ...x, [k]: e.target.value }))}
            error={errors[k]}
            {...props}
          />
        ))}
        <p className="t-muted t-sm mb-4">* campos obrigatórios</p>
        <Button type="submit" loading={saving}>Salvar endereço</Button>
      </form>
    </Screen>
  );
}
