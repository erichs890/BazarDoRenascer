import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, CloudOff, Download, Moon, Sun, X } from 'lucide-react';
import { IconButton, Button } from './ui';
import Logo from './Logo';
import { useTheme } from '../lib/theme';

/* --- appbar + main --------------------------------------------------------- */
/**
 * Envelopa cada página. `back` mostra a seta (histórico do navegador = gesto
 * de voltar do sistema, sem pilha própria). `flush` tira o padding lateral
 * para listas que sangram até a borda. `wide` libera a largura de desktop
 * para vitrines, listas e painéis; o padrão é uma coluna de leitura confortável.
 * `divider` dá ao título mais presença: maior, com linha de divisão e respiro
 * antes do conteúdo.
 */
export function Screen({ title, back, action, atmosphere, center, noNav, flush, wide, divider, children }) {
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

  // Mesma largura na appbar e no conteúdo, para o título alinhar com a página.
  const size = wide ? 'wide' : center ? 'narrow' : 'regular';

  return (
    <>
      {atmosphere && <div className="atmosphere" data-tone={atmosphere} aria-hidden="true" />}
      {(title || back || action) && (
        <header className="appbar" data-size={size} data-scrolled={scrolled} data-divider={!!divider}>
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
        data-size={size}
        className={`main ${center ? 'main--center' : ''} ${noNav ? 'main--no-nav' : ''} ${flush ? 'main--flush' : ''} ${divider ? 'main--spaced' : ''}`}
      >
        {children}
      </main>
    </>
  );
}

/* --- barra de navegação ---------------------------------------------------- */
export function TabBar({ items }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {/* Só aparece no desktop, quando a barra vira menu lateral. */}
      <span className="tabbar__brand" aria-hidden="true">
        <Logo size={40} />
        <span>Bazar do<br />Renascer</span>
      </span>
      {items.map(({ to, label, icon: Icon, badge, end }) => (
        <NavLink key={to} to={to} end={end} viewTransition>
          <span className="tabbar__icon">
            <Icon size={24} aria-hidden="true" strokeWidth={2} />
            {badge > 0 && <span className="badge-dot">{badge}</span>}
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
      {/* No menu lateral do desktop, o tema fica no pé, separado por uma linha. */}
      <div className="tabbar__foot">
        <button
          type="button"
          className="tabbar__theme"
          onClick={toggle}
          aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          title={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        >
          <span className="tabbar__icon">
            {dark ? <Sun size={24} aria-hidden="true" /> : <Moon size={24} aria-hidden="true" />}
          </span>
          <span>{dark ? 'Claro' : 'Escuro'}</span>
        </button>
      </div>
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
