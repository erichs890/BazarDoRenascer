# Bazar do Renascer

App mobile (React Native + Expo) de um bazar beneficente: venda de roupas doadas e doações financeiras diretas. **Somente front-end** — todos os dados são mockados em memória.

## Rodando

```bash
npm install
npx expo start
```

Abra no Expo Go (Android/iOS) ou pressione `w` para web.

## Contas demo

| Perfil  | E-mail            | Senha    |
|---------|-------------------|----------|
| Admin   | admin@bazar.com   | admin123 |
| Usuário | maria@email.com   | maria123 |

## Estrutura

```
App.js
src/
  navigation.js        # stack + tabs (admin / usuário)
  theme/               # cores, espaçamentos, helpers de moeda/data
  mocks/data.js        # usuários, produtos, vendas, doações
  context/AppContext   # estado global (login, carrinho, checkout, doações, CRUD de produtos)
  components/ui.js     # Button, Input, Card, Chips, ProductCard...
  screens/
    LoginScreen.js
    admin/             # Dashboard, Produtos, Form, Vendas, Doações
    user/              # Vitrine, Detalhe, Carrinho, Endereço, Checkout, Doar, Pagamento, Sucesso, Perfil
```
