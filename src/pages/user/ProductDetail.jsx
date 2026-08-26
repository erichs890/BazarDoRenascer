import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Screen } from '../../components/AppShell';
import { Button, Badge, KRow, Price, Rise, Empty } from '../../components/ui';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, cart, toggleCart } = useApp();
  const p = products.find((x) => x.id === id);

  if (!p) {
    return (
      <Screen title="Peça não encontrada" back noNav>
        <Empty>Essa peça saiu do bazar.</Empty>
        <Button variant="outline" onClick={() => navigate('/loja')}>Ver vitrine</Button>
      </Screen>
    );
  }

  const inCart = cart.includes(p.id);
  const sold = p.status === 'sold';

  return (
    <Screen title={p.name} back noNav flush>
      <Rise i={0}>
        <img
          src={p.image}
          alt={p.name}
          width="600"
          height="600"
          style={{ width: '100%', aspectRatio: 1, objectFit: 'cover', borderRadius: 'var(--r-xl)', background: 'var(--surface-2)' }}
        />
      </Rise>

      <Rise i={1} className="mt-4">
        <div className="cluster mb-4">
          <Badge>{p.category}</Badge>
          <Badge tone={p.condition === 'Novo' ? 'success' : 'primary'}>{p.condition}</Badge>
          {sold && <Badge tone="danger">Vendido</Badge>}
        </div>
        <h2 className="t-title">{p.name}</h2>
        <Price value={p.price} size="var(--step-3)" className="mb-4" />

        <div className="card card--flat">
          <KRow label="Tamanho" value={p.size} />
          <KRow label="Condição" value={p.condition} />
          <KRow label="Categoria" value={p.category} />
        </div>

        <div className="card card--flat">
          <p className="t-label">Descrição</p>
          <p className="t-body">{p.description || 'Sem descrição.'}</p>
        </div>

        {sold ? (
          <Button disabled>Peça já vendida</Button>
        ) : (
          <>
            <Button
              variant={inCart ? 'outline' : 'primary'}
              onClick={() => toggleCart(p.id)}
              icon={inCart
                ? <CheckCircle2 size={20} aria-hidden="true" />
                : <ShoppingCart size={20} aria-hidden="true" />}
            >
              {inCart ? 'Remover do carrinho' : 'Adicionar ao carrinho'}
            </Button>
            {inCart && (
              <Button variant="dark" onClick={() => navigate('/carrinho')}>
                Ir para o carrinho
              </Button>
            )}
          </>
        )}
      </Rise>
    </Screen>
  );
}
