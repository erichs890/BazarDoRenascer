import { useEffect, useRef, useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { money } from '../lib/format';

/* --- entrada escalonada: um page-load orquestrado, via animation-delay ----- */
export const Rise = ({ i = 0, as: As = 'div', className = '', style, ...p }) => (
  <As className={`rise ${className}`} style={{ '--i': Math.min(i, 10), ...style }} {...p} />
);

/* --- botão ---------------------------------------------------------------- */
export function Button({ variant = 'primary', loading, disabled, icon, children, className = '', ...p }) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...p}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export const IconButton = ({ label, danger, className = '', children, ...p }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`icon-btn ${danger ? 'icon-btn--danger' : ''} ${className}`}
    {...p}
  >
    {children}
  </button>
);

/* --- campo de formulário --------------------------------------------------- */
/* Erro sempre abaixo do campo, com role="alert" para leitor de tela. */
export function Field({ label, error, hint, textarea, trailing, className = '', ...p }) {
  const id = useId();
  const Tag = textarea ? 'textarea' : 'input';
  return (
    <div className={`field ${className}`} data-invalid={!!error}>
      {label && <label htmlFor={id}>{label}</label>}
      <Tag
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        {...p}
      />
      {trailing}
      {error ? (
        <span className="error" id={`${id}-msg`} role="alert">{error}</span>
      ) : hint ? (
        <span className="hint" id={`${id}-msg`}>{hint}</span>
      ) : null}
    </div>
  );
}

/* --- chips de filtro ------------------------------------------------------- */
export function Chips({ options, value, onChange, allLabel, label }) {
  const opts = allLabel ? [null, ...options] : options;
  return (
    <div className="chips" role="group" aria-label={label}>
      {opts.map((o) => (
        <button
          key={String(o)}
          type="button"
          className="chip"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
        >
          {o ?? allLabel}
        </button>
      ))}
    </div>
  );
}

/* --- átomos ---------------------------------------------------------------- */
export const Badge = ({ tone = 'primary', children }) => (
  <span className={`badge badge--${tone}`}>{children}</span>
);

export const Price = ({ value, size, className = '' }) => (
  <span className={`t-price ${className}`} style={size ? { fontSize: size } : undefined}>{money(value)}</span>
);

export const KRow = ({ label, value, total }) => (
  <div className={`krow ${total ? 'krow--total' : ''}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export const Empty = ({ children }) => <p className="empty">{children}</p>;

/* --- cartão de produto ----------------------------------------------------- */
export function ProductCard({ product: p, to, priority = false, first = false }) {
  return (
    <Link
      className="pcard"
      to={to}
      viewTransition
      aria-label={`${p.name}, tamanho ${p.size}, ${money(p.price)}`}
    >
      {/* A primeira dobra carrega adiantada; o resto é preguiçoso.
          `fetchPriority="high"` vai só na PRIMEIRA imagem: marcar várias como
          alta prioridade faz elas competirem entre si e atrasa justamente o
          elemento que define o LCP. */}
      <img
        src={p.image}
        alt=""
        width="400"
        height="400"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={first ? 'high' : 'auto'}
        decoding="async"
      />
      <span className="pcard__badge">
        <Badge tone={p.condition === 'Novo' ? 'success' : 'primary'}>{p.condition}</Badge>
      </span>
      <div className="pcard__body">
        <span className="item__title">{p.name}</span>
        <span className="t-muted t-sm">Tam. {p.size}</span>
        <div><Price value={p.price} /></div>
      </div>
    </Link>
  );
}

/* --- bottom sheet: <dialog> nativo dá backdrop, ESC e foco preso ---------- */
export function Sheet({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog className="sheet" ref={ref} onClose={onClose} onCancel={onClose} aria-label={title}>
      <div className="sheet__grip" aria-hidden="true" />
      {title && <h2 className="t-subtitle">{title}</h2>}
      {children}
    </dialog>
  );
}

/* --- toast ---------------------------------------------------------------- */
/* Evento no window em vez de mais um provider: o app só precisa avisar "pronto". */
export const toast = (message) =>
  window.dispatchEvent(new CustomEvent('app:toast', { detail: message }));

export function Toaster() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let timer;
    const on = (e) => {
      setMsg(e.detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 3500);
    };
    window.addEventListener('app:toast', on);
    return () => { window.removeEventListener('app:toast', on); clearTimeout(timer); };
  }, []);
  return (
    // aria-live: anuncia sem roubar o foco
    <div aria-live="polite" aria-atomic="true">
      {msg && <div className="toast"><Check size={18} aria-hidden="true" />{msg}</div>}
    </div>
  );
}
