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
| (logística de entrega) | `rpc('order_shipping', { p_order_id })` — só admin |
