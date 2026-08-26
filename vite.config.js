import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Estratégias de cache por tipo de recurso:
//   shell (html/js/css/fontes) -> precache (Workbox), versionado por hash
//   fotos do bucket            -> CacheFirst 30d (nome é uuid, conteúdo não muda)
//   REST do Supabase           -> NetworkFirst (preço/estoque precisam ser frescos)
//   auth do Supabase           -> NetworkOnly (token nunca vem do cache)
export default defineConfig(({ mode }) => {
  // O Vite nao joga o .env em process.env — precisa carregar explicitamente.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
  plugins: [
    react(),
    {
      // O primeiro dado da vitrine vem do Supabase: abrir a conexão junto com o
      // HTML economiza DNS + TLS no caminho crítico. No JS chegaria tarde.
      name: 'preconnect-supabase',
      transformIndexHtml(html) {
        const url = env.VITE_SUPABASE_URL;
        if (!url) return html;
        return html.replace('</head>',
          `  <link rel="preconnect" href="${url}" crossorigin />
`
          + `    <link rel="dns-prefetch" href="${url}" />
  </head>`);
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        id: '/',
        name: 'Bazar do Renascer',
        short_name: 'Renascer',
        description: 'Bazar beneficente: roupas com história, ajuda que transforma.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        background_color: '#013857',
        theme_color: '#013857',
        categories: ['shopping', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Vitrine', short_name: 'Vitrine', url: '/loja', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Quero doar', short_name: 'Doar', url: '/doar', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // pt-BR só precisa de latin: não precachear cirílico/grego/vietnamita
        globIgnores: ['**/*-{cyrillic,greek,vietnamese}-*.woff2'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Fotos do bucket: o nome do arquivo é um uuid, então o conteúdo
            // nunca muda. Cache primeiro, rede só se faltar.
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fotos-produtos',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Catálogo e histórico: preço e disponibilidade precisam ser frescos.
            // Rede primeiro, cache como rede de segurança quando ela falha.
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-supabase',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Auth NUNCA entra em cache: token velho servido do cache é falha
            // de segurança, não otimização.
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/auth\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  };
});
