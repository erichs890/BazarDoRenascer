import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, ArrowRight, MapPin } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Screen } from '../../components/AppShell';
import { Button, KRow, Price, Rise, Sheet, Empty } from '../../components/ui';

export default function Cart() {
  const navigate = useNavigate();
  const { user, products, cart, toggleCart } = useApp();
  const [askAddress, setAskAddress] = useState(false);

  const items = products.filter((p) => cart.includes(p.id) && p.status === 'available');
  const total = items.reduce((a, p) => a + p.price, 0);

  // Carrinho é público (vive no navegador); comprar não é.
  const proceed = () => {
    if (!user) return navigate('/login', { state: { from: '/carrinho' } });
    return user.address ? navigate('/checkout') : setAskAddress(true);
  };

  if (!items.length) {
    return (
      // `wide` mantém o título no mesmo lugar da Loja; o aviso fica estreito.
      <Screen title="Carrinho" atmosphere="primary" center wide divider>
        <div className="t-center" style={{ maxWidth: 420, marginInline: 'auto', width: '100%' }}>
          <div className="orb"><ShoppingCart size={44} aria-hidden="true" /></div>
          <p className="t-muted mb-4">
            Seu carrinho está vazio.<br />Cada peça comprada vira ajuda para alguém.
          </p>
          <Button variant="outline" onClick={() => navigate('/loja')}>Ver vitrine</Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Carrinho" wide divider>
      <p className="t-label">{items.length} item(ns)</p>

      <div className="split">
        <div>
          {items.map((p, i) => (
            <Rise key={p.id} i={i}>
              <div className="card item">
                <img className="item__thumb" src={p.image} alt="" loading="lazy" width="64" height="64" />
                <div className="item__body">
                  <strong>{p.name}</strong>
                  <span className="t-muted t-sm">Tam. {p.size} · {p.condition}</span>
                  <div><Price value={p.price} /></div>
                </div>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => toggleCart(p.id)}
                  aria-label={`Remover ${p.name} do carrinho`}
                >
                  <Trash2 size={22} aria-hidden="true" />
                </button>
              </div>
            </Rise>
          ))}
        </div>

        <Rise i={items.length} className="split__aside">
          <div className="card">
            <KRow label="Subtotal" value={<Price value={total} />} />
            <KRow label="Entrega" value="Grátis" />
            <hr className="divider" />
            <KRow label="Total" value={<Price value={total} />} total />
            <Button onClick={proceed} icon={<ArrowRight size={20} aria-hidden="true" />}>
              Finalizar compra
            </Button>
          </div>
        </Rise>
      </div>

      <Sheet open={askAddress} onClose={() => setAskAddress(false)} title="Endereço necessário">
        <div className="orb orb--sm"><MapPin size={26} aria-hidden="true" /></div>
        <p className="t-muted mb-4">
          Para entregarmos suas peças, precisamos de um endereço de entrega.
        </p>
        <Button onClick={() => navigate('/endereco', { state: { next: '/checkout' } })}>
          Cadastrar endereço
        </Button>
        <Button variant="ghost" onClick={() => setAskAddress(false)}>Agora não</Button>
      </Sheet>
    </Screen>
  );
}
