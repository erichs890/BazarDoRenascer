import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, CloudOff, Download, X } from 'lucide-react';
import { IconButton, Button } from './ui';

/* --- appbar + main --------------------------------------------------------- */
/**
 * Envelopa cada página. `back` mostra a seta (histórico do navegador = gesto
 * de voltar do sistema, sem pilha própria). `flush` tira o padding lateral
 * para listas que sangram até a borda.
 */
export function Screen({ title, back, action, atmosphere, center, noNav, flush, children }) {
  const navigate = useNavigate();
  const sentinel = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  // Sombra da appbar só depois que o conteúdo passa por baixo dela.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.title = title ? `${title} · Bazar do Renascer` : 'Bazar do Renascer';
  }, [title]);

  return (
    <>
      {atmosphere && <div className="atmosphere" data-tone={atmosphere} aria-hidden="true" />}
      {(title || back || action) && (
        <header className="appbar" data-scrolled={scrolled}>
          {back && (
            <IconButton label="Voltar" onClick={() => navigate(-1)}>
              <ArrowLeft size={24} aria-hidden="true" />
            </IconButton>
          )}
          <h1>{title}</h1>
          {action}
        </header>
      )}
      <div ref={sentinel} aria-hidden="true" />
      <main
        id="conteudo"
        tabIndex={-1}
        className={`main ${center ? 'main--center' : ''} ${noNav ? 'main--no-nav' : ''} ${flush ? 'main--flush' : ''}`}
      >
        {children}
      </main>
    </>
  );
}

/* --- barra de navegação ---------------------------------------------------- */
export function TabBar({ items }) {
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {items.map(({ to, label, icon: Icon, badge, end }) => (
        <NavLink key={to} to={to} end={end} viewTransition>
          <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
            <Icon size={24} aria-hidden="true" strokeWidth={2} />
            {badge > 0 && <span className="badge-dot">{badge}</span>}
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/* --- estado offline -------------------------------------------------------- */
export function OfflineBar() {
  const [off, setOff] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOff(!navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', on); };
  }, []);
  if (!off) return null;
  return (
    <div className="notice notice--offline" role="status">
      <CloudOff size={18} aria-hidden="true" />
      <span>Você está offline. Dá para navegar no que já foi visto; compras e doações esperam a conexão voltar.</span>
    </div>
  );
}

/* --- convite para instalar ------------------------------------------------- */
/** Chrome/Android: usa o beforeinstallprompt. iOS: só dá para instruir. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('bazar:install-off') === '1');

  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    const on = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);

  const close = () => { localStorage.setItem('bazar:install-off', '1'); setDismissed(true); };

  if (standalone || dismissed || (!deferred && !isIOS)) return null;

  return (
    <div className="install-bar" role="region" aria-label="Instalar aplicativo">
      <Download size={22} aria-hidden="true" style={{ color: 'var(--primary-ink)' }} />
      <div className="install-bar__body">
        <strong>Instale o Bazar</strong>
        {isIOS
          ? 'Toque em Compartilhar e depois "Adicionar à Tela de Início".'
          : 'Abre em tela cheia, direto da sua tela inicial.'}
      </div>
      {deferred && (
        <Button
          className="btn--auto"
          onClick={async () => { deferred.prompt(); await deferred.userChoice; setDeferred(null); }}
        >
          Instalar
        </Button>
      )}
      <IconButton label="Dispensar" onClick={close}><X size={20} aria-hidden="true" /></IconButton>
    </div>
  );
}
