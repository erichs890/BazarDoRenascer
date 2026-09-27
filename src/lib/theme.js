import { useCallback, useEffect, useState } from 'react';

/*
 * Tema claro/escuro. Padrão: o do sistema (celular ou notebook), acompanhando
 * se ele mudar. O botão salva uma escolha; escolher de novo o tema do sistema
 * apaga a escolha, e o app volta a seguir o sistema.
 * O primeiro data-theme é aplicado por um script inline no index.html.
 */
const KEY = 'bazar:theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
// Cor da barra do navegador/sistema em cada tema (mesmas do index.html).
const BAR = { light: '#013857', dark: '#08202C' };

const saved = () => {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch { return null; }
};
const system = () => (media.matches ? 'dark' : 'light');

function apply(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // As metas theme-color vêm com media query; com escolha manual, as duas
  // passam a mostrar a cor do tema escolhido.
  const manual = saved();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    const own = m.media.includes('dark') ? 'dark' : 'light';
    m.content = BAR[manual || own];
  });
}

export function useTheme() {
  const [theme, setTheme] = useState(() => saved() || system());

  // Sem escolha salva, acompanha o sistema em tempo real.
  useEffect(() => {
    const on = () => { if (!saved()) setTheme(system()); };
    media.addEventListener('change', on);
    return () => media.removeEventListener('change', on);
  }, []);

  useEffect(() => apply(theme), [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try {
        if (next === system()) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, next);
      } catch { /* sem storage: vale só nesta sessão */ }
      return next;
    });
  }, []);

  return { theme, toggle };
}
