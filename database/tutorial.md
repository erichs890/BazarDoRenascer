# Tutorial — do zero ao banco do Bazar do Renascer no Supabase

Tempo estimado: 20 minutos. Não precisa instalar nada além do navegador.

---

## 1. Criar a conta no Supabase

1. Acesse **https://supabase.com** e clique em **Start your project**.
2. Entre com GitHub (recomendado) ou e-mail e senha.
3. Na primeira vez, o Supabase cria uma **Organization** para você. Aceite o nome sugerido ou coloque `Bazar do Renascer`. Plano **Free** é suficiente.

## 2. Criar o projeto (o banco de dados)

1. No painel, clique em **New project**.
2. Preencha:
   - **Name:** `bazar-do-renascer`
   - **Database Password:** clique em *Generate a password* e **guarde essa senha** num gerenciador de senhas. Ela é a senha do PostgreSQL e não aparece de novo.
   - **Region:** `South America (São Paulo)` — menor latência para usuários no Brasil.
3. Clique em **Create new project** e aguarde ~2 minutos até o status ficar verde.

## 3. Aplicar o schema

1. No menu lateral, abra **SQL Editor** → **New query**.
2. Abra o arquivo [`schema.sql`](schema.sql) deste repositório, copie **todo** o conteúdo e cole no editor.
3. Clique em **Run** (ou `Ctrl+Enter`). Deve terminar com `Success. No rows returned`.

> Se aparecer erro `type "user_role" already exists`, o schema já foi aplicado. Para recomeçar do zero: **Database → Backups → Restore** ou rode `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` e aplique novamente.

O que foi criado:

| Objeto | Função |
|--------|--------|
| `profiles`, `addresses`, `products`, `sales`, `donations` | Tabelas do app |
| `handle_new_user()` | Cria o `profile` automaticamente quando alguém se cadastra |
| `checkout()`, `donate()` | Únicas formas de registrar venda/doação (validação no servidor) |
| `monthly_summary()` | Dados do dashboard (só admin recebe linhas) |
| Policies RLS | Cada usuário só enxerga o que é dele; admin enxerga tudo |

## 4. Confirmar que a segurança está ativa

1. Menu **Database → Tables**. Cada tabela deve mostrar o selo **RLS enabled**.
2. Menu **Advisors → Security Advisor**. Deve aparecer **0 errors**. Se listar "RLS disabled" ou "function search_path mutable", o schema não foi aplicado por completo — repita o passo 3.

## 5. Criar os usuários de demonstração

O app não cadastra senhas no banco; quem faz isso é o **Supabase Auth**.

1. Menu **Authentication → Users → Add user → Create new user**.
2. Crie os dois:

   | E-mail | Senha | Auto Confirm User |
   |--------|-------|-------------------|
   | `admin@bazar.com` | `admin123` | ✅ marcado |
   | `maria@email.com` | `maria123` | ✅ marcado |

   *(Auto Confirm evita precisar clicar em link de confirmação por e-mail.)*
3. Confira em **Table Editor → profiles**: as duas linhas devem ter aparecido sozinhas (trigger `handle_new_user`), ambas com `role = user`.

> Senhas de demo são fracas de propósito. Em produção, ative **Authentication → Policies → Password strength** e desative *Auto Confirm*.

## 6. Carregar os dados de demonstração e promover o admin

1. **SQL Editor → New query**, cole o conteúdo de [`seed.sql`](seed.sql) e clique em **Run**.
2. Isso: promove `admin@bazar.com` para `role = admin`, cadastra 13 peças, 3 vendas e 4 doações.
3. Verifique em **Table Editor → products**: 10 `available` e 3 `sold`.

Para promover qualquer outro usuário a admin no futuro, **só por SQL** (o app não consegue, por design):

```sql
UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'pessoa@email.com');
```

## 7. Pegar as chaves para o app

1. Menu **Project Settings → API**.
2. Copie:
   - **Project URL** → ex.: `https://abcdefgh.supabase.co`
   - **anon public** key → começa com `eyJ...`
3. **Nunca** copie a `service_role` key para o app. Ela ignora todo o RLS. Ela fica só em back-end/servidor.

No repositório do app, crie o arquivo `.env` (já está no `.gitignore`):

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 8. Testar o banco antes de tocar no app

No **SQL Editor**, simule um usuário logado para conferir que o RLS funciona:

```sql
-- Vira a "Maria" (troque pelo id dela em auth.users)
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id FROM auth.users WHERE email='maria@email.com'), 'role','authenticated')::text, true);
SET LOCAL ROLE authenticated;

SELECT count(*) FROM public.products;          -- 13: catálogo é visível
SELECT count(*) FROM public.sales;             -- 3: só as compras dela
SELECT * FROM public.monthly_summary();        -- 0 linhas: não é admin
UPDATE public.profiles SET role = 'admin';     -- ERRO: permissão negada (esperado!)

RESET ROLE;
```

Teste também o fluxo de compra (com o mesmo `set_config` acima, mas Maria ainda não tem endereço):

```sql
SELECT public.checkout(ARRAY['00000000-0000-0000-0000-0000000000a1']::uuid[], 'Pix');
-- ERRO "Endereço de entrega obrigatório" — igual ao comportamento do app.
```

## 9. Conectar o app (para o time de front-end)

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

```js
// src/lib/supabase.js
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
```

Substituições no [`AppContext.js`](../src/context/AppContext.js):

| Hoje (mock) | Com Supabase |
|-------------|--------------|
| `login(email, password)` | `supabase.auth.signInWithPassword({ email, password })` + `from('profiles').select().single()` |
| `products` | `from('products').select().eq('status','available')` |
| `addProduct(p)` | `from('products').insert({ ...p, created_by: user.id })` |
| `updateUser({ address })` | `from('addresses').upsert({ user_id, ...address })` |
| `checkout(payment)` | `supabase.rpc('checkout', { product_ids: cart, payment })` |
| `donate(amount, payment)` | `supabase.rpc('donate', { amount, payment })` |
| Dashboard | `supabase.rpc('monthly_summary')` |
| `sales` / `donations` (admin ou próprio) | `from('sales').select()` — o RLS já filtra |

## 10. Checklist de segurança antes de publicar

- [ ] `service_role` key nunca no app nem no git.
- [ ] **Authentication → URL Configuration**: Site URL e Redirect URLs só com domínios seus.
- [ ] **Authentication → Rate limits**: manter os padrões (protege contra força bruta no login).
- [ ] **Security Advisor** com 0 erros.
- [ ] Backups diários ativos (**Database → Backups**, incluso no Free por 7 dias).
- [ ] Se for usar upload de fotos: criar bucket **privado** em Storage com policy `is_admin()` para `INSERT`.

---

### Problemas comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| `permission denied for table products` | Chamada sem sessão (anon) | Fazer login antes; anon não tem acesso a nada |
| `new row violates row-level security policy` | Usuário comum tentando cadastrar peça | Promover a admin via SQL (passo 6) |
| Profile não apareceu após criar usuário | Trigger `on_auth_user_created` ausente | Reaplicar `schema.sql` |
| `checkout` retorna "não estão mais disponíveis" | Outra pessoa comprou antes | Comportamento correto; recarregar a vitrine |
