# Database — Bazar do Renascer

Schema PostgreSQL para **Supabase**, projetado para substituir os dados mockados do app
([src/context/AppContext.js](../src/context/AppContext.js)). Hoje o front-end roda 100% em memória.

**Começando do zero?** Siga o [tutorial.md](tutorial.md) — da criação da conta até o banco testado.

## Arquivos

| Arquivo | Conteúdo |
|---------|----------|
| `tutorial.md` | Passo a passo: conta Supabase → projeto → schema → usuários demo → chaves → testes |
| `schema.sql` | Tipos, tabelas, triggers, RPCs, policies RLS e grants |
| `seed.sql` | Dados de demonstração (mesmos de [src/mocks/data.js](../src/mocks/data.js)) |

## Modelo

```
auth.users 1──1 profiles 1──1 addresses
profiles   1──* sales *──1 products      (product_id UNIQUE em sales: peça vende uma vez)
profiles   1──* donations                (donor_id NULL = anônimo)
```

| Tabela | Uso no app |
|--------|-----------|
| `profiles` | Nome, telefone e papel (`admin`/`user`). Senha fica no Supabase Auth, nunca aqui. |
| `addresses` | Obrigatório só para finalizar compra. Só o dono lê/escreve — nem admin. |
| `products` | Vitrine (`status = 'available'`), gestão do admin. Peça única, sem quantidade. |
| `sales` | Histórico do admin e "Minhas compras". Gravado **apenas** pela RPC `checkout()`. |
| `donations` | Histórico do admin e "Minhas doações". Gravado **apenas** pela RPC `donate()`. |

## Modelo de segurança

| Camada | O que garante |
|--------|---------------|
| **RLS + FORCE** em todas as tabelas | Sem policy = sem acesso, inclusive para o dono da tabela |
| **anon sem grants** | Não logado não lê nada (vitrine exige login) |
| **Grant de coluna** em `profiles` | `authenticated` só pode atualizar `name` e `phone`; `role` é inalterável pelo app |
| Trigger `protect_role` | Segunda barreira: só admin muda papel |
| Trigger `protect_sold_product` | Peça vendida não pode ser editada nem apagada |
| RPCs `SECURITY DEFINER` com `search_path` fixo | `checkout` e `donate` validam usuário, endereço, valor e disponibilidade no servidor; `FOR UPDATE SKIP LOCKED` evita venda dupla concorrente |
| `is_admin()` | Fonte única de verdade para permissões de admin |
| `CHECK`s | Preço/valor > 0 e ≤ 100.000, CEP 8 dígitos, UF maiúscula, tamanhos de texto, `image_url` só `https://` |
| Sem policy de INSERT/UPDATE/DELETE em `sales`/`donations` | Escrita só pelas RPCs |

Promover alguém a admin: **somente por SQL** (ver tutorial, passo 6).

## Mapeamento front → banco

| Front (`AppContext`) | Supabase |
|----------------------|----------|
| `login(email, password)` | `supabase.auth.signInWithPassword()` + `from('profiles').select().single()` |
| `updateUser({ address })` | `from('addresses').upsert({ user_id, ...address })` |
| `addProduct / updateProduct / removeProduct` | `from('products')` — RLS restringe a admin |
| `checkout(payment)` | `rpc('checkout', { product_ids, payment })` → retorna `order_id` |
| `donate(amount, payment)` | `rpc('donate', { amount, payment, anonymous })` |
| Dashboard | `rpc('monthly_summary')` — 0 linhas se não for admin |
| Filtro semana/mês | `.gte('sold_at', isoDate)` |

## Decisões em aberto

- Carrinho **não** é persistido (vive só no app). Criar `cart_items` se precisar entre dispositivos.
- Tamanhos de calçado (37, 39…) usam o enum de roupa; avaliar `text` ou enum separado.
- Upload de fotos: criar bucket **privado** no Storage com policy `is_admin()` para INSERT; gravar a URL em `image_url`.
- Pagamento é simulado; ao integrar gateway, adicionar `payment_status` + `gateway_ref` e confirmar via webhook (Edge Function com `service_role`).
- Admin não enxerga `addresses` por privacidade; para logística, criar RPC `order_shipping(order_id)` restrita a admin.
