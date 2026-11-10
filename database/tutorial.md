# Ligando o app ao Supabase — passo a passo

Do projeto vazio ao app funcionando. ~15 minutos.

---

## 1. Pegar as chaves

No painel do Supabase, com o projeto aberto:

**Project Settings → API**. Copie dois valores:

| Campo no painel | Vai para |
|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | `VITE_SUPABASE_URL` |
| **anon / public key** | `VITE_SUPABASE_ANON_KEY` |

> **Nunca** copie a `service_role key` para o front. Ela ignora todo o RLS —
> quem tiver ela lê e apaga o banco inteiro. Ela só existe para código de
> servidor (Edge Function, webhook).

Na raiz do projeto:

```bash
cp .env.example .env
```

Preencha o `.env`. Ele já está no `.gitignore` — não commite.

---

## 2. Criar o schema

**SQL Editor → New query**. Cole o conteúdo de [`schema.sql`](schema.sql)
inteiro e rode (`Ctrl+Enter`).

Isso cria tabelas, triggers, RPCs, views, políticas de RLS, grants e o bucket
`product-photos`. É idempotente: pode rodar de novo sem quebrar.

Confira em **Table Editor** que apareceram: `profiles`, `addresses`,
`products`, `sales`, `donations`. Todas devem mostrar o cadeado de **RLS
enabled**.

---

## 3. Desligar a confirmação de e-mail

Você escolheu cadastro sem confirmação. Isso é **configuração do painel**, não
dá para fazer por SQL:

**Authentication → Sign In / Providers → Email** → desmarque
**"Confirm email"** → Save.

Com isso, quem se cadastra entra direto. (Se um dia quiser exigir confirmação,
é só remarcar — o app já mostra a mensagem certa.)

---

## 4. Popular o catálogo (opcional)

**SQL Editor → New query** com o conteúdo de [`seed.sql`](seed.sql). Cria 10
peças de exemplo para a vitrine não nascer vazia.

Pode pular se for cadastrar as peças reais pelo app.

---

## 5. Rodar o app

```bash
npm install
npm run dev
```

A vitrine (`/loja`) deve carregar **sem login** — ela é pública.

---

## 6. Criar o admin

Não existe "conta de admin" pronta: todo cadastro nasce como `user`. A
promoção é manual, por SQL — é de propósito, para ninguém virar admin sozinho.

> O trigger `protect_role` deixa o papel mudar quando `auth.uid()` é `NULL`,
> que é o caso do SQL Editor. Sem essa brecha o primeiro admin seria impossível
> de criar: só admin promove, mas não existe admin ainda. Pela API pública a
> promoção continua bloqueada por duas barreiras (grant de coluna e o próprio
> trigger).

1. No app, acesse `/cadastro` e crie sua conta normalmente.
2. No **SQL Editor**, rode (troque pelo seu e-mail):

```sql
UPDATE public.profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'seu@email.com');
```

3. **Saia e entre de novo** no app. Você cai no painel do bazar.

Para conferir quem é admin:

```sql
SELECT u.email, p.name, p.role
FROM public.profiles p JOIN auth.users u ON u.id = p.id
ORDER BY p.role, p.name;
```

---

## 6b. Receber Pix de verdade

O Pix do app é **estático**: o código já vem com o valor do pedido e o dinheiro
cai direto na conta dona da chave, sem intermediário e sem taxa. Em troca, o
banco não avisa o app — a confirmação é manual.

1. **SQL Editor** → rode [`migracao-pix.sql`](migracao-pix.sql) (bancos novos já
   recebem isso no `schema.sql`).
2. No `.env`, preencha:

```env
VITE_PIX_KEY=sua-chave
VITE_PIX_NAME=Nome do recebedor
VITE_PIX_CITY=Cidade
```

   Formatos da chave: e-mail em minúsculas, telefone como `+5511999999999`,
   CPF/CNPJ só com dígitos, ou a chave aleatória como o banco mostra.
3. Reinicie o `npm run dev` (o Vite só lê o `.env` no boot).

**Como fica o fluxo:** quem compra toca em "Gerar código Pix" — a peça é
reservada na hora e sai da vitrine — paga no app do banco e o pedido fica
**"Aguardando Pix"**. O admin vê o aviso no painel, confere no extrato o valor
e a referência do pedido, e toca em **Confirmar**. Se o Pix não chegou,
**Cancelar** devolve a peça à vitrine.

> A chave aparece por extenso dentro do código Pix — é pública para quem paga.
> Para a instituição, use a chave CNPJ.

---

## 6c. Pagamentos pelo Mercado Pago (confirmação automática)

Com o gateway, cada pedido ganha uma cobrança própria no Mercado Pago. Quando
o pagamento cai, o Mercado Pago avisa o webhook e o pedido vira **Pago**
sozinho — ninguém precisa conferir extrato. Pedido não pago é cancelado e a
peça volta para a vitrine.

Há dois modos — escolha um na variável `VITE_PAYMENT_GATEWAY`:

| | **Checkout Pro** (`mercadopago-pro`) — recomendado | **Transparente** (`mercadopago`) |
|---|---|---|
| Onde paga | na página do Mercado Pago; depois volta para o app | dentro do próprio app |
| Formas | Pix, cartão (até 3x) e **boleto de verdade** | Pix e cartão (até 3x) |
| Precisa de | só o Access Token | Access Token + Public Key |
| Recusa no cartão | tenta outro cartão ali mesmo | mensagem no app, tenta de novo |

No **Checkout Pro**, a página do Mercado Pago mostra só a forma escolhida no
app (Pix, cartão ou boleto) — o saldo da conta Mercado Pago sempre aparece,
é regra deles. Pedido sem pagamento em andamento é cancelado em 2 h; boleto
emitido segura a peça até o vencimento (3 dias) mais o prazo de compensação.

No **Transparente**, o cartão usa o formulário do Mercado Pago embutido: os
dados vão do navegador direto para eles e viram um token. Pix vence em 30 min.

Nos dois, **todo pedido nasce pendente** e só o Mercado Pago marca como pago.

O código já está todo pronto (`supabase/functions/` e
`migracao-mercadopago.sql`). O que falta é só ligar a sua conta. ~10 minutos.

### 1. Banco

**SQL Editor** → rode [`migracao-mercadopago.sql`](migracao-mercadopago.sql)
(depois do `migracao-pix.sql`, se o banco é antigo).

Se aparecer o aviso "pg_cron indisponível": **Database → Extensions** → ative
`pg_cron` e rode só o último bloco do arquivo de novo. Sem ele tudo funciona;
só perde a rede de segurança que cancela Pix vencido caso um aviso do Mercado
Pago se perca.

### 2. Credencial do Mercado Pago

1. Confira que a conta do Mercado Pago tem **chave Pix cadastrada** (app do
   Mercado Pago → Pix → Minhas chaves). Sem chave, a API recusa cobrança Pix.
2. Entre em <https://www.mercadopago.com.br/developers/panel/app> →
   **Criar aplicação** (tipo: pagamentos online; escolha Checkout Pro ou
   Checkout Transparente conforme o modo).
3. Na aplicação: **Credenciais de produção** → copie o **Access Token**
   (começa com `APP_USR-`). No modo transparente, copie também a **Public
   Key** (também `APP_USR-`, mais curta).

> O Access Token movimenta a conta. Ele vai **só** para os secrets do
> Supabase — nunca para o `.env`, o repositório ou o front. A Public Key é o
> contrário: é feita para ficar no navegador e só serve para gerar o token do
> cartão.

### 3. Publicar as Edge Functions

No terminal, na raiz do projeto (a CLI vem pelo `npx`, sem instalar nada):

```bash
npx supabase login
```

```bash
npx supabase link --project-ref SEU-PROJECT-REF
```

O project ref é o `xxxx` de `https://xxxx.supabase.co`.

```bash
npx supabase secrets set MP_ACCESS_TOKEN=APP_USR-cole-aqui
```

```bash
npm run deploy:pagamentos
```

Isso publica `mp-checkout` (Checkout Pro), `mp-pix` e `mp-card`
(transparente) e `mp-webhook` (recebe o aviso, sem exigir login — o Mercado
Pago não tem token do Supabase). Publicar todas não atrapalha: o app só chama
as do modo escolhido.

Para o Checkout Pro, quando o app estiver publicado, diga o endereço dele —
assim a função só manda as pessoas de volta para o seu site:

```bash
npx supabase secrets set SITE_URL=https://seu-app.vercel.app
```

> Sem terminal? Dá pelo painel: **Edge Functions → Deploy a new function →
> Via Editor**, uma para cada pasta (cole também os arquivos de `_shared/`), e
> desligue **Enforce JWT verification** na `mp-webhook`. O secret fica em
> **Edge Functions → Secrets**.

### 4. Ligar no app

No `.env` (e nas variáveis do host, se já publicou):

```env
# Checkout Pro
VITE_PAYMENT_GATEWAY=mercadopago-pro
```

ou

```env
# Transparente
VITE_PAYMENT_GATEWAY=mercadopago
VITE_MP_PUBLIC_KEY=APP_USR-cole-a-public-key
```

Reinicie o `npm run dev`. No transparente sem a Public Key, só o Pix fica
disponível.

> No Checkout Pro rodando em `http://localhost`, o Mercado Pago não volta
> sozinho para o app depois de aprovar (ele só faz isso para `https`): clique
> em **Voltar ao site** na página deles. Publicado em `https`, a volta é
> automática.

> Rode a migração e ligue a variável **juntos**: com a migração e sem o
> gateway, o cartão simulado ficaria pendente para sempre.

### 5. Assinatura do webhook (recomendado)

O webhook já é seguro sem isso — ele nunca confia no aviso, sempre reconsulta
o pagamento na API do Mercado Pago. A assinatura só recusa avisos forjados mais
cedo.

1. Na aplicação do Mercado Pago: **Webhooks → Configurar notificações** →
   URL de produção `https://SEU-PROJECT-REF.supabase.co/functions/v1/mp-webhook`,
   evento **Pagamentos** → Salvar.
2. Copie a **assinatura secreta** que aparece e rode:

```bash
npx supabase secrets set MP_WEBHOOK_SECRET=cole-aqui
```

### Testar

Faça uma compra de verdade de valor baixo (uma peça de R$ 1,00 cadastrada para
isso) e pague com o app do seu banco. Em poucos segundos a tela de pagamento
vira "Compra confirmada!". Depois, estorne pelo painel do Mercado Pago.

> As credenciais **de teste** geram o QR Code, mas não dá para pagar um Pix de
> teste com um banco real. Para o fluxo completo, use a de produção com valor
> baixo.

**Cartão:** dá para testar sem dinheiro de verdade. Use as **credenciais de
teste** (Access Token nos secrets e, no transparente, Public Key no `.env` — as
duas do mesmo par)
e um dos [cartões de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/integration-test/test-cards).
O nome impresso decide o resultado: `APRO` aprova, `OTHE` recusa. Depois volte
para as credenciais de produção.

O que acompanhar:

| Onde | O quê |
|---|---|
| **Edge Functions → mp-webhook → Logs** | cada aviso recebido; linhas `ATENÇÃO` pedem ação (ex.: Pix pago depois de o pedido ter sido cancelado → estornar no Mercado Pago) |
| **Edge Functions → mp-checkout / mp-pix / mp-card → Logs** | cobranças recusadas pelo Mercado Pago, com o motivo |
| Painel do bazar | o botão **Confirmar/Cancelar** continua valendo para resolver qualquer caso na mão |

---

## 7. Testar se a segurança está de pé

Vale gastar 2 minutos aqui. Rode no **SQL Editor**:

```sql
-- Visitante não logado: deve ver SÓ o catálogo.
SET ROLE anon;
SELECT count(*) FROM public.products;   -- funciona (vitrine é pública)
SELECT count(*) FROM public.profiles;   -- deve dar ERRO de permissão
SELECT count(*) FROM public.addresses;  -- deve dar ERRO de permissão
RESET ROLE;
```

Se `profiles` ou `addresses` responderem em vez de dar erro, **pare** e revise
os grants no fim do `schema.sql`.

No próprio app, teste também:
- Entrar como usuário comum e tentar ir em `/admin` → é redirecionado.
- Em **Vendas**, o usuário comum vê só as compras dele; o admin vê todas.

---

## 8. Publicar

O build é estático. Em Netlify/Vercel/Cloudflare Pages:

- Build command: `npm run build`
- Publish directory: `dist`
- Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

Depois, no Supabase: **Authentication → URL Configuration** → coloque a URL do
site em **Site URL**.

> Como é SPA, o host precisa devolver `index.html` para qualquer rota, senão
> `/produto/xxx` dá 404 ao recarregar. Netlify/Vercel fazem isso sozinhos para
> projetos Vite; em outro host, configure o fallback.

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Tela branca e erro "Supabase não configurado" | `.env` faltando ou sem as duas variáveis. Reinicie o `npm run dev` — Vite só lê o `.env` no boot. |
| Vitrine vazia mas sem erro | Não rodou o `seed.sql` e não cadastrou peça nenhuma. |
| "E-mail ou senha inválidos" logo após cadastrar | Confirmação de e-mail ainda ligada (passo 3). |
| Cadastro OK mas login não entra | Idem: usuário existe mas está sem confirmar. |
| Admin não vê o painel | Esqueceu de sair e entrar de novo depois do `UPDATE`. |
| Upload de foto dá erro de permissão | Sua conta não é admin, ou o passo 2 não criou o bucket. |
| `new row violates row-level security` ao cadastrar peça | Idem: só admin escreve em `products`. |

---

## Mapa: função do app → banco

| `AppContext` | Supabase |
|---|---|
| `signIn` | `auth.signInWithPassword()` |
| `signUp` | `auth.signUp()` → trigger `handle_new_user` cria o profile |
| `signOut` | `auth.signOut()` |
| `loadProducts` | `from('products').select()` — anon incluído |
| `loadPrivate` | `profiles`, `addresses`, views `sales_detail` e `donations_detail` |
| `updateUser` | `from('profiles').update({name, phone})` — `role` não é permitido |
| `saveAddress` | `from('addresses').upsert()` |
| `uploadPhoto` | `storage.from('product-photos').upload()` |
| `addProduct` / `updateProduct` / `removeProduct` | `from('products')` — RLS restringe a admin |
| `checkout` | `rpc('checkout', { product_ids, payment })` → `order_id` |
| `donate` | `rpc('donate', { amount, payment, anonymous })` |
| `pixCharge` | Edge Function `mp-pix` → `checkout`/`donate` + cobrança Pix no Mercado Pago |
| `proCharge` | Edge Function `mp-checkout` → `checkout`/`donate` + preferência do Checkout Pro (devolve o link) |
| `orderSummary` | `sales_detail` / `donations_detail` (volta do Checkout Pro) |
| `cardCharge` | Edge Function `mp-card` → `checkout`/`donate` + cobrança no cartão (token do formulário do Mercado Pago) |
| `paymentStatus` | `sales_detail` / `donations_detail` — a tela de Pix consulta até o webhook confirmar |
| (logística de entrega) | `rpc('order_shipping', { p_order_id })` — só admin |
