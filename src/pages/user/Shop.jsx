import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, SlidersHorizontal, LogOut } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { CATEGORIES, SIZES } from '../../data/enums';
import { Screen, OfflineBar, InstallPrompt } from '../../components/AppShell';
import { ProductCard, Field, Chips, Empty, Rise, Sheet, Button, IconButton } from '../../components/ui';

const PRICES = [
  { l: 'Até R$ 30', min: 0, max: 30 },
  { l: 'R$ 30–60', min: 30, max: 60 },
  { l: 'Acima de R$ 60', min: 60, max: Infinity },
];

export default function Shop() {
  const { user, products, logout, loadingProducts } = useApp();
  const [q, setQ] = useState('');
  const [f, setF] = useState({ cat: null, size: null, price: null });
  const [sheet, setSheet] = useState(false);

  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const active = [f.cat, f.size, f.price].filter(Boolean).length;

  const list = useMemo(() => {
    const range = PRICES.find((p) => p.l === f.price);
    const term = q.trim().toLowerCase();
    return products.filter((p) =>
      p.status === 'available'
      && p.name.toLowerCase().includes(term)
      && (!f.cat || p.category === f.cat)
      && (!f.size || p.size === f.size)
      && (!range || (p.price >= range.min && p.price < range.max)));
  }, [products, q, f]);

  return (
    <Screen
      title="Bazar do Renascer"
      wide
      divider
      atmosphere="primary"
      action={user && (
        <IconButton label="Sair da conta" onClick={logout}>
          <LogOut size={22} aria-hidden="true" />
        </IconButton>
      )}
    >
      <OfflineBar />
      <InstallPrompt />

      <Rise i={0}>
        <Link className="cta-banner" to="/doar" viewTransition>
          <span className="cta-banner__icon">
            <Heart size={24} fill="currentColor" aria-hidden="true" />
          </span>
          <span className="grow">
            <strong>
              {user ? `Quer apenas doar, ${user.name.split(' ')[0]}?` : 'Quer apenas doar?'}
            </strong>
            <span className="t-sm">Sem compra, sem endereço. Vai direto pra quem precisa.</span>
          </span>
          <ArrowRight size={22} aria-hidden="true" />
        </Link>
      </Rise>

      <Rise i={1}>
        <div className="cluster" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', maxWidth: 720 }}>
          <div className="grow">
            <Field
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar roupas..."
              aria-label="Buscar roupas"
            />
          </div>
          <Button
            className="btn--auto"
            variant={active ? 'primary' : 'outline'}
            onClick={() => setSheet(true)}
            aria-label={`Filtros${active ? `, ${active} ativo(s)` : ''}`}
            style={{ width: 50, minHeight: 50, paddingInline: 0 }}
          >
            <SlidersHorizontal size={22} aria-hidden="true" />
          </Button>
        </div>
        <p className="t-muted t-sm mb-4" role="status">
          {list.length} peça(s) disponível(is){active ? ` · ${active} filtro(s)` : ''}
        </p>
      </Rise>

      {list.length ? (
        <div className="grid">
          {list.map((p, i) => (
            <Rise key={p.id} i={i}>
              <ProductCard product={p} to={`/produto/${p.id}`} priority={i < 4} first={i === 0} />
            </Rise>
          ))}
        </div>
      ) : loadingProducts ? (
        <Empty>Carregando peças…</Empty>
      ) : (
        <Empty>Nenhuma peça encontrada com esses filtros.</Empty>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filtrar peças">
        <p className="t-label">Categoria</p>
        <Chips label="Categoria" options={CATEGORIES} value={f.cat} onChange={set('cat')} allLabel="Todas" />
        <p className="t-label">Tamanho</p>
        <Chips label="Tamanho" options={SIZES} value={f.size} onChange={set('size')} allLabel="Todos" />
        <p className="t-label">Preço</p>
        <Chips label="Preço" options={PRICES.map((p) => p.l)} value={f.price} onChange={set('price')} allLabel="Qualquer" />
        <Button className="mt-4" onClick={() => setSheet(false)}>
          Ver {list.length} peça(s)
        </Button>
        <Button
          variant="ghost"
          onClick={() => setF({ cat: null, size: null, price: null })}
          disabled={!active}
        >
          Limpar filtros
        </Button>
      </Sheet>
    </Screen>
  );
}
