import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/base.css';
import App from './App';

// autoUpdate: o Workbox troca o service worker sozinho na próxima navegação.
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
