import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Screen } from '../../components/AppShell';
import { Button, Field, Chips, Badge, Price, Empty, Rise, Sheet, IconButton, toast } from '../../components/ui';
import { friendlyError } from '../../lib/supabase';

const STATUS = ['Disponível', 'Vendido'];

export default function Products() {
  const navigate = useNavigate();
  const { products, removeProduct } = useApp();
  const [status, setStatus] = useState(null);
  const [q, setQ] = useState('');
  const [toRemove, setToRemove] = useState(null);

  const list = products.filter((p) =>
    (!status || (status === 'Vendido') === (p.status === 'sold'))
    && p.name.toLowerCase().includes(q.trim().toLowerCase()));

  const [removing, setRemoving] = useState(false);

  const confirmRemove = async () => {
    setRemoving(true);
    const err = await removeProduct(toRemove.id);
    setRemoving(false);
    toast(err ? friendlyError(err) : `"${toRemove.name}" removida do bazar.`);
    if (!err) setToRemove(null);
  };

  return (
    <Screen title="Peças" wide>
      <div className="toolbar">
        <Field
          type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar peça..." aria-label="Buscar peça"
        />
        <Button
          icon={<Plus size={20} aria-hidden="true" />}
          onClick={() => navigate('/admin/produtos/novo')}
        >
          Cadastrar nova peça
        </Button>
      </div>
      <Chips label="Status" options={STATUS} value={status} onChange={setStatus} allLabel="Todos" />

      {list.length ? <div className="list-grid">{list.map((p, i) => {
        const sold = p.status === 'sold';
        return (
          <Rise key={p.id} i={i}>
            <div className="card item">
              <img
                className="item__thumb" src={p.image} alt="" loading="lazy"
                width="64" height="64" style={{ opacity: sold ? .45 : 1 }}
              />
              <div className="item__body">
                <strong>{p.name}</strong>
                <span className="t-muted t-sm">{p.category} · Tam. {p.size} · {p.condition}</span>
                <span className="cluster mt-2">
                  <Price value={p.price} />
                  <Badge tone={sold ? 'muted' : 'success'}>{sold ? 'Vendido' : 'Disponível'}</Badge>
                </span>
              </div>
              {!sold && (
                <>
                  <IconButton label={`Editar ${p.name}`} onClick={() => navigate(`/admin/produtos/${p.id}`)}>
                    <Pencil size={20} aria-hidden="true" />
                  </IconButton>
                  <IconButton danger label={`Remover ${p.name}`} onClick={() => setToRemove(p)}>
                    <Trash2 size={20} aria-hidden="true" />
                  </IconButton>
                </>
              )}
            </div>
          </Rise>
        );
      })}</div> : <Empty>Nenhuma peça encontrada.</Empty>}

      {/* Confirmação antes de ação destrutiva. */}
      <Sheet open={!!toRemove} onClose={() => setToRemove(null)} title="Remover peça">
        <p className="t-muted mb-4">
          Remover "{toRemove?.name}" do bazar? Esta ação não pode ser desfeita.
        </p>
        <Button variant="danger" loading={removing} onClick={confirmRemove}>Remover</Button>
        <Button variant="ghost" onClick={() => setToRemove(null)}>Cancelar</Button>
      </Sheet>
    </Screen>
  );
}
