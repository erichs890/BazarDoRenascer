import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/base.css';

// autoUpdate: o Workbox troca o service worker sozinho na próxima navegação.
registerSW({ immediate: true });

const root = createRoot(document.getElementById('root'));

// App é importado dinamicamente: se a configuração faltar (sem .env, por
// exemplo), o erro aparece na tela em vez de uma página em branco.
import('./App')
  .then(({ default: App }) => root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  ))
  .catch((err) => {
    console.error(err);
    root.render(
      <div role="alert" style={{ maxWidth: 560, margin: '15vh auto', padding: 24, fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>O app não conseguiu iniciar</h1>
        <p>{err?.message || String(err)}</p>
      </div>,
    );
  });
