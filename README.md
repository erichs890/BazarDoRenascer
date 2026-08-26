# Bazar do Renascer — PWA

Bazar beneficente: venda de roupas doadas e doações financeiras diretas.
Progressive Web App instalável e offline-first, com **backend Supabase**
(Postgres + Auth + Storage, tudo protegido por Row Level Security).

A vitrine é **pública** — dá para compartilhar o link de uma peça sem exigir
cadastro. Comprar, doar e administrar exigem login.

O app React Native/Expo original está preservado em [legacy-rn/](legacy-rn/) como
referência de paridade. Nada nele é executado pelo build atual.

## Rodando

```bash
npm install
cp .env.example .env   # preencha com as chaves do seu projeto Supabase
npm run dev            # http://localhost:5173
npm run build          # gera dist/ com manifest + service worker
npm run preview        # serve dist/ — é aqui que o service worker roda
npm test               # checks de formatação de moeda/data
```

**Primeira vez?** Siga [database/tutorial.md](database/tutorial.md): schema,
chaves, desligar confirmação de e-mail e promover o primeiro admin. ~15 min.

> O service worker só é gerado no build (`devOptions.enabled: false`). Para
> testar instalação e offline, use `npm run build && npm run preview`.

## Contas

Não há conta pronta: crie a sua em `/cadastro`. Todo cadastro nasce como
`user` — a promoção a admin é manual, por SQL (passo 6 do tutorial). É de
propósito: ninguém vira administrador do bazar sozinho.

---

## Por que Vite + React (e não Next.js)

| Critério | Decisão |
|---|---|
| **Renderização** | Quase tudo é interativo e autenticado, e o Postgres já responde direto ao navegador. SSR/RSC só somaria um servidor Node para manter. (Se a indexação da vitrine virar prioridade, é aqui que Next/Astro passa a valer.) |
| **Deploy** | Saída 100% estática: Netlify, Vercel, GitHub Pages, qualquer bucket. Sem runtime. |
| **Migração** | O `AppContext` e a lógica de negócio vieram do RN quase sem alteração. Next exigiria repensar `'use client'` em tudo. |
| **PWA** | `vite-plugin-pwa` gera manifest + Workbox em ~30 linhas de config. Nada de service worker escrito à mão. |
| **Peso** | 148 KB gzip de JS (99 KB são o `supabase-js`), sem Tailwind, sem lib de estado, sem lib de animação. O painel admin sai em chunk separado. |

**Roteamento:** `react-router-dom` v7 — URLs reais (`/produto/p3`, `/carrinho`),
deep link funcionando, botão voltar do sistema é o histórico do navegador.
`<Link viewTransition>` usa a View Transitions API nativa onde existe.

**Estado:** `AppContext` + `useState`, herdado do app RN. A sessão fica com o
`supabase-js`; o carrinho e um snapshot do catálogo ficam no `localStorage` —
é isso que faz a vitrine abrir offline com o carrinho intacto. Nenhuma lib de
estado adicionada.

**Backend:** Supabase — Postgres com RLS, Auth e Storage. Sem servidor próprio
para manter: o navegador fala direto com o Postgres, e quem decide o que cada
um pode ver são as *policies*, não o código do front. Ver
[a seção de backend](#backend-supabase) abaixo.

---

## Estrutura

```
index.html                  meta tags de PWA, theme-color por esquema de cor
vite.config.js              manifest + estratégias de cache do Workbox
scripts/gen-icons.py        gera os PNGs do manifest a partir da marca
public/icons/               192, 512, maskable 512, apple-touch, favicon.svg
public/robots.txt
.env.example                modelo das chaves do Supabase (o .env real não é commitado)
database/
  schema.sql                tabelas, RPCs, views, RLS, grants, bucket
  seed.sql                  10 peças de exemplo
  tutorial.md               do projeto vazio ao app rodando
src/
  main.jsx                  monta o app e registra o service worker
  App.jsx                   rotas, guardas de papel, layouts com tab bar
  store/AppContext.jsx      sessão, catálogo, carrinho, chamadas ao Supabase
  data/enums.js             categorias/tamanhos/condições — espelham os ENUMs do banco
  lib/supabase.js           cliente, tradução de erro, adaptadores snake↔camel
  lib/format.js             money / dateBR / parseAmount (Intl)
  lib/format.test.js        `npm test`
  components/
    AppShell.jsx            Screen (appbar + main), TabBar, OfflineBar, InstallPrompt
    ui.jsx                  Button, Field, Chips, Badge, KRow, Price, ProductCard, Sheet, Toaster
    PaymentPicker.jsx       compartilhado por Checkout e Doar
  pages/
    Login.jsx  Signup.jsx
    user/                   Shop, ProductDetail, Cart, Address, Checkout, Payment, Donate, Success, Profile
    admin/                  Dashboard, Products, ProductForm, Sales, Donations, HistoryPage
  styles/
    tokens.css              cor, tipografia fluida, espaço, raio, elevação, movimento
    base.css                reset, shell, appbar, tab bar, atmosfera, animações
    components.css          todos os componentes — nenhum hex fora de tokens.css
```

---

## De React Native para web: o que virou o quê

Todas as 15 telas foram portadas. Nenhuma foi cortada.

| React Native | PWA | Como foi traduzido |
|---|---|---|
| `LoginScreen` | `/login` | `<form>` real: Enter envia, gerenciador de senha reconhece |
| `ShopScreen` | `/loja` | `FlatList numColumns={2}` → `grid-template-columns: repeat(auto-fill, minmax(150px,1fr))`: 2/3/4 colunas sem media query |
| filtros inline | bottom sheet | `<dialog>` nativo — backdrop, ESC e foco preso de graça |
| `ProductDetailScreen` | `/produto/:id` | URL compartilhável (era só um param de navegação) |
| `CartScreen` | `/carrinho` | idem |
| `Alert.alert` (endereço) | bottom sheet | `<dialog>` em vez de alerta do SO |
| `AddressScreen` | `/endereco` | `autocomplete` de endereço do navegador; foco no primeiro campo inválido |
| `CheckoutScreen` | `/checkout` | `<Navigate>` se o carrinho esvaziou |
| `PaymentScreen` | `/pagamento` | dados via `location.state`; recarregar cai fora em vez de quebrar. Copiar Pix/boleto usa `navigator.clipboard` |
| `SuccessScreen` | `/sucesso` | `navigate(replace)` — voltar não retorna ao pagamento concluído |
| `DonateScreen` | `/doar` | `role="radiogroup"` nos valores |
| `ProfileScreen` | `/perfil` | igual |
| `DashboardScreen` | `/admin` | barras viram `<div role="progressbar">` com `aria-valuenow` |
| `ProductsScreen` | `/admin/produtos` | `Alert.alert` destrutivo → sheet de confirmação |
| `ProductFormScreen` | `/admin/produtos/:id` | `<form>` com validação no submit |
| `SalesScreen` + `DonationsScreen` | `/admin/vendas`, `/admin/doacoes` | eram duas cópias da mesma tela — viraram um `HistoryPage` parametrizado |
| `@react-navigation` stack + tabs | `react-router` + layouts | tab bar fixa embaixo; fluxos de compra sem tab bar (são etapas, não destinos) |
| `Ionicons` | `lucide-react` | uma família só, SVG, tree-shaken |
| `StyleSheet.create` | CSS + custom properties | tokens em `:root`, nenhum hex nos componentes |
| `Animated` (JS) | CSS `@keyframes` | `animation-delay` escalonado, roda no compositor |
| `SafeAreaView` | `env(safe-area-inset-*)` | + `viewport-fit=cover` |
| estado em memória | Supabase + `localStorage` | dados reais no Postgres; carrinho e snapshot do catálogo no navegador para abrir offline |
| mock `USERS` com senha em texto | Supabase Auth | senha nunca passa perto do nosso banco |
| — | `/cadastro` | tela nova: o app RN só tinha contas fixas |

---

## PWA: checklist verificado

Medições reais, `npm run build && npm run preview`, Chromium headless.

### Instalabilidade
- [x] `manifest.webmanifest` com `name`, `short_name`, `id`, `start_url`, `scope`, `description`, `lang: pt-BR`
- [x] `display: standalone` (+ `display_override`), `orientation: portrait`
- [x] Ícones 192 e 512 `purpose: any` + 512 `maskable` (zona segura respeitada)
- [x] `apple-touch-icon` 180 e `apple-mobile-web-app-*` para iOS
- [x] `theme_color` / `background_color`; `<meta name="theme-color">` separado para claro e escuro
- [x] Service worker ativo controlando a página, com handler de fetch
- [x] Atalhos de app (`shortcuts`): Vitrine e Quero doar
- [x] `InstallPrompt` usa `beforeinstallprompt` no Chrome/Android e instrui manualmente no iOS

### Offline
- [x] Shell precacheado: **25 arquivos, 700 KB** (HTML, JS, CSS, fontes latinas, ícones)
- [x] Rota profunda offline resolve via `navigateFallback`
- [x] Aviso de offline aparece no evento `offline` e some no `online`
- [x] Boot não depende da rede: se o Supabase não responder, o app abre com o
      último catálogo em cache em vez de travar em tela branca
- [ ] **Reverificar com o banco ligado**: o teste de rede cortada (vitrine
      renderizando, carrinho preservado, fotos do cache) foi feito na versão
      com dados mockados. A estratégia de cache mudou para o Supabase e ainda
      não foi medida contra o banco real.

**Estratégias por tipo de recurso**

| Recurso | Estratégia | Porquê |
|---|---|---|
| HTML, JS, CSS, fontes, ícones | **Precache** (Workbox, versionado por hash) | é o shell; tem que abrir sem rede, sempre |
| Fotos do bucket | **CacheFirst**, 200 itens / 30 dias | o nome do arquivo é um uuid — o conteúdo nunca muda |
| REST do Supabase (`/rest/v1/`) | **NetworkFirst**, timeout 5 s, cache 24 h | preço e disponibilidade precisam ser frescos; ficar velho é pior que ficar lento |
| Auth do Supabase (`/auth/v1/`) | **NetworkOnly** | token servido do cache é falha de segurança, não otimização |

Fontes cirílicas/gregas/vietnamitas ficam fora do precache (`globIgnores`) — pt-BR
só usa latin, e isso corta ~43 KB da instalação.

### Lighthouse

Medido contra o banco real, mobile, 4G lento + CPU 4×:

| Rota | Performance | Acessibilidade | Boas práticas | SEO |
|---|---|---|---|---|
| `/login` | **93** | **100** | **100** | **100** |
| `/loja` (vitrine) | **73** | **100** | **100** | **100** |

Os 20 pontos de diferença **não são do app** — são das fotos de exemplo. O
`seed.sql` aponta para `picsum.photos`, e cada foto custa dois saltos:

| Host | Requisições | Bytes | Pior caso |
|---|---|---|---|
| `picsum.photos` (só o redirect) | 8 | 8 KB | 1.144 ms |
| `fastly.picsum.photos` (a foto) | 8 | 319 KB | 2.370 ms |
| Supabase (a query) | 2 | 2 KB | 851 ms |
| O app (JS + CSS + fontes) | 9 | 254 KB | **19 ms** |

Com peças cadastradas de verdade isso se resolve sozinho: as fotos passam a
vir do Supabase Storage — mesmo host, já com `preconnect`, sem redirect, e
convertidas para WebP de 1200px no upload. **Refaça a medição depois de
cadastrar peças reais**; o número com `picsum` mede o picsum.

Contraste de cor: **0 problemas** nos dois temas (auditoria do Lighthouse mais
a verificação dos 16 pares em `tokens.css`).

---

## Backend (Supabase)

Postgres + Auth + Storage, sem servidor próprio no meio. O navegador fala
direto com o banco; **quem decide o que cada um enxerga são as policies de RLS,
não o código do front**. Um `curl` com a chave pública esbarra nas mesmas
regras que o app.

### Modelo

```
auth.users 1──1 profiles 1──1 addresses
profiles   1──* sales *──1 products     (product_id UNIQUE: peça vende uma vez)
profiles   1──* donations               (donor_id NULL = doação anônima)
```

Views `sales_detail` e `donations_detail` entregam os nomes já resolvidos —
o front não faz join. Ambas com `security_invoker = true`, ou seja: respeitam
o RLS de **quem consulta**, não o do dono.

### Quem pode o quê

| | `anon` (visitante) | `user` (logado) | `admin` |
|---|---|---|---|
| Catálogo (`products`) | **lê** | lê | lê e escreve |
| `profiles` | — | o próprio | todos |
| `addresses` | — | o próprio | **nenhum** (ver abaixo) |
| `sales` / `donations` | — | o próprio histórico | todos |
| Fotos do bucket | lê | lê | lê e escreve |

Três decisões que valem explicação:

- **Vitrine pública.** `anon` recebe `GRANT SELECT` só em `products`. É o que
  permite mandar o link de uma peça no WhatsApp. Todo o resto — pessoas,
  endereços, dinheiro — exige login.
- **Nem o admin lê a lista de endereços.** Para despachar um pedido existe a
  RPC `order_shipping(order_id)`, que devolve **um** endereço, o daquele
  pedido. Vazamento de base de endereços não acontece porque a base não é
  legível.
- **Escrita de venda/doação não existe pelo cliente.** `sales` e `donations`
  não têm policy de INSERT — de propósito. O único caminho é a RPC
  `checkout()` / `donate()`, que valida no servidor.

### O que o servidor garante (e o front não precisa)

| Regra | Onde vive |
|---|---|
| Peça não vende duas vezes | `sales.product_id UNIQUE` + `FOR UPDATE SKIP LOCKED` no `checkout()` |
| Compra sem endereço não passa | `checkout()` levanta exceção |
| Peça vendida não é editada nem apagada | trigger `protect_sold_product` |
| Ninguém se promove a admin | `GRANT UPDATE (name, phone)` — `role` fora da lista — **mais** o trigger `protect_role` |
| Preço, CEP, UF, tamanho de texto | `CHECK` nas colunas |
| Categoria/tamanho/condição inventados | tipos `ENUM` |
| Foto acima de 3 MB ou tipo errado | limites do bucket (o cliente também valida, por conveniência) |

Duas barreiras para a promoção a admin não é exagero: o grant de coluna
impede pela API, o trigger impede mesmo que alguém erre um grant depois.

**Armadilha que custou caro:** nunca levante `RAISE EXCEPTION` com `ERRCODE
40001` (serialization_failure) ou `40P01` (deadlock) numa RPC. O PostgREST
trata esses códigos como falha transitória e **retenta a requisição sozinho**.
Se a condição for permanente — "esta peça já foi vendida" — ele retenta para
sempre: a conexão pendura e vira um DoS de uma linha. Erros de regra de negócio
usam `P0001`.

### `FORCE ROW LEVEL SECURITY`: por que está desligado

`FORCE` submete também o **dono** da tabela às policies — e é o dono que
executa as funções `SECURITY DEFINER`. Com `FORCE` ligado, `handle_new_user()`
não criaria o profile, `checkout()` não gravaria a venda, `donate()` não
gravaria a doação e `order_shipping()` não leria o endereço. O dono aqui é o
papel `postgres`, alcançável só pelo SQL Editor e pela `service_role` — não
pela API pública. `anon` e `authenticated`, que é o que a internet enxerga,
seguem 100% sujeitos às policies.

### Chaves

Só a `anon key` vai para o front, e ela é pública por design: sozinha, não faz
nada que o RLS não permita. A `service_role key` **nunca** entra no
repositório nem no bundle — ela ignora todo o RLS e só existe para código de
servidor.

---

## Design

A paleta vem do **logo do bazar** (`logo.png`), amostrada direto do arquivo:
navy `#013857`, azul `#05A5E6`, amarelo `#FECD0D`, laranja `#F97F09`. As
tipografias Fraunces + Manrope foram mantidas do app RN.

As cores cruas do logo servem como **fundo**, não como texto — o azul dá 2,8:1
sobre branco e o amarelo, 1,5:1. Por isso cada matiz tem três papéis:
`-bright` (a cor do logo, decorativa), a base (fundo de ação) e `-ink`
(texto/ícone sobre superfície clara), cada um calibrado contra o pior fundo em
que aparece. O que mais mudou:

- **Tokens semânticos** em `:root`. Nenhum componente conhece um hex.
- **Modo escuro** (não existia no RN): variantes tonais dessaturadas, não
  inversão. `--primary-ink` clareia no escuro para manter 4,5:1.
- **Tokens para superfícies que invertem.** `--primary-deep` é navy no claro e
  azul-claro no escuro; um `color: #fff` fixo por cima virava 1,85:1 no escuro.
  Daí `--on-deep` e `--on-danger`, que alternam junto.
- **Ícone do PWA gerado do logo** por `scripts/gen-icons.py`: descarta o texto
  (ilegível em 192px), remove o fundo branco por flood fill preservando o
  branco entre as alças, e assenta o símbolo sobre o navy da marca.
- **Tipografia fluida**: escala em `clamp()`, de 375 px a 1440 px sem quebra.
- **Alvos de toque ≥ 44 px** em tudo: botões 52 px, campos 50 px, chips e
  ícones 44 px.
- **Campos com 16 px** de fonte — abaixo disso o iOS dá zoom sozinho ao focar.
- **Elevação em 3 níveis** (`--e-1/2/3`), nada de sombra ad hoc.
- **Movimento**: uma entrada de página orquestrada (`animation-delay` de 45 ms
  por item) em vez de micro-animações espalhadas. Tudo em `transform`/`opacity`.
  `prefers-reduced-motion` desliga.
- **Cor nunca sozinha**: seleção de pagamento tem borda + ícone; status de peça
  tem texto no badge.
- **Navegação adaptativa**: tab bar embaixo no celular; a partir de 1100 px vira
  navegação lateral e o conteúdo fica numa coluna de app centralizada.

Referências usadas: guia de estética de frontend do `claude-cookbooks`
(evitar fontes genéricas, comprometer-se com uma paleta, atmosfera em vez de
cor chapada) e a skill `ui-ux-pro-max` (checklist de acessibilidade, toque,
contraste em ambos os temas — estilo "Accessible & Ethical"). A paleta verde
sugerida pela skill foi descartada em favor da marca existente.

---

## O que ficou de fora, e quando fazer

| Item | Por quê | Quando adicionar |
|---|---|---|
| **Pagamento real** | Pix e boleto são simulados: a RPC grava a venda direto, sem cobrança. | Integrar gateway (Mercado Pago/Stripe), adicionar `payment_status` + `gateway_ref` em `sales`, e confirmar por webhook numa Edge Function com `service_role`. |
| **Pull-to-refresh** | O catálogo já recarrega a cada visita à vitrine. | Se a lista passar a mudar durante a sessão — aí Realtime resolve melhor que o gesto. |
| **Recuperar senha** | Fora do escopo desta rodada. | `auth.resetPasswordForEmail()` + uma rota `/nova-senha`. Exige configurar SMTP no Supabase. |
| **Login social** | Idem. | Providers do Supabase Auth; o `handle_new_user` já cria o profile de qualquer origem. |
| **Carrinho entre dispositivos** | Vive no `localStorage`. | Tabela `cart_items` com RLS por dono. |
| **Fila de compra offline** | Comprar offline exige o servidor confirmar estoque. Enfileirar dá falsa sensação de compra feita. | Background Sync — só se houver uma regra clara de "reservado". |
| **`screenshots` no manifest** | Precisa de capturas do app publicado. | Enriquece o card de instalação no Android. |
| **Push** | Nenhum caso de uso hoje. | Se aparecer "avise quando entrar peça nova". |
| **Fonte itálica real** | `.t-soft` usa itálico sintético (mesma coisa que o RN fazia). | Importar `fraunces/wght-italic.css` se a diferença incomodar. |

Trechos com atalho deliberado estão marcados com comentário `ponytail:` no
código (estado em `localStorage`, gateway simulado, upload mockado).
