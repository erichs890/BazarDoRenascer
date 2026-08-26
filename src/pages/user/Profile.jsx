import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageCheck, Heart, LogOut } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Screen } from '../../components/AppShell';
import { Button, Field, KRow, Price, Rise, toast } from '../../components/ui';
import { money, dateBR } from '../../lib/format';
import { friendlyError } from '../../lib/supabase';
import { formatAddress } from './Address';

function HistoryItem({ icon: Icon, accent, title, meta, amount }) {
  return (
    <div className="item hist">
      <span className={`item__icon ${accent ? 'item__icon--accent' : ''}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="item__body">
        <strong>{title}</strong>
        <span className="t-muted t-sm">{meta}</span>
      </span>
      <Price value={amount} />
    </div>
  );
}

export default function Profile() {
  const { user, updateUser, sales, donations, logout } = useApp();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ name: user.name, phone: user.phone });

  const myPurchases = sales.filter((s) => s.buyerId === user.id);
  const myDonations = donations.filter((d) => d.donorId === user.id);

  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    setSaving(true);
    const err = await updateUser(f);
    setSaving(false);
    if (err) return toast(friendlyError(err));
    setEditing(false);
    toast('Dados atualizados.');
  };

  return (
    <Screen title="Perfil" atmosphere="primary">
      <Rise i={0}>
        <div className="card t-center">
          <div className="orb orb--brand orb--avatar" style={{ width: 76, height: 76 }} aria-hidden="true">
            {user.name[0]}
          </div>
          {editing ? (
            <form onSubmit={save} style={{ textAlign: 'left' }}>
              <Field label="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
              <Field label="Telefone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" autoComplete="tel" />
              <Button type="submit" loading={saving}>Salvar</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            </form>
          ) : (
            <>
              <p className="t-title--sm t-title">{user.name}</p>
              <p className="t-muted t-sm">{user.email}</p>
              <p className="t-muted t-sm">{user.phone}</p>
              <button type="button" className="link-btn mt-4" onClick={() => setEditing(true)}>
                Editar dados
              </button>
            </>
          )}
        </div>
      </Rise>

      <Rise i={1}>
        <div className="card">
          <div className="card-head mb-4">
            <h2 className="t-subtitle">Endereço de entrega</h2>
            <Link className="link-btn" to="/endereco">{user.address ? 'Editar' : 'Cadastrar'}</Link>
          </div>
          {user.address
            ? <p className="t-body">{formatAddress(user.address)}</p>
            : <p className="t-muted">Nenhum endereço cadastrado ainda.</p>}
        </div>
      </Rise>

      <Rise i={2}>
        <div className="card">
          <h2 className="t-subtitle">Minhas compras ({myPurchases.length})</h2>
          {myPurchases.length
            ? myPurchases.map((s) => (
              <HistoryItem
                key={s.id} icon={PackageCheck} title={s.productName}
                meta={`${dateBR(s.date)} · ${s.payment}`} amount={s.amount}
              />
            ))
            : <p className="t-muted">Você ainda não comprou nenhuma peça.</p>}
        </div>
      </Rise>

      <Rise i={3}>
        <div className="card">
          <h2 className="t-subtitle">Minhas doações ({myDonations.length})</h2>
          {myDonations.length
            ? myDonations.map((d) => (
              <HistoryItem
                key={d.id} icon={Heart} accent title="Doação"
                meta={`${dateBR(d.date)} · ${d.payment}`} amount={d.amount}
              />
            ))
            : <p className="t-muted">Nenhuma doação ainda.</p>}
          <hr className="divider" />
          <KRow label="Total doado" value={money(myDonations.reduce((a, d) => a + d.amount, 0))} total />
        </div>
        {/* Sair fica separado do resto: ação de saída não se mistura com navegação. */}
        <Button variant="outline" onClick={logout} icon={<LogOut size={20} aria-hidden="true" />}>
          Sair da conta
        </Button>
      </Rise>
    </Screen>
  );
}
