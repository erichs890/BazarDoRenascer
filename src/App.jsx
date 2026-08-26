import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  Store, ShoppingCart, Heart, User, LogIn, BarChart3, Shirt, Receipt,
} from 'lucide-react';
import { AppProvider, useApp } from './store/AppContext';
import { TabBar } from './components/AppShell';
import { Toaster } from './components/ui';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Shop from './pages/user/Shop';
import ProductDetail from './pages/user/ProductDetail';
import Cart from './pages/user/Cart';
import Address from './pages/user/Address';
import Checkout from './pages/user/Checkout';
import Payment from './pages/user/Payment';
import Donate from './pages/user/Donate';
import Success from './pages/user/Success';
import Profile from './pages/user/Profile';
// O painel só interessa a quem administra o bazar — o comprador não baixa isso.
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Products = lazy(() => import('./pages/admin/Products'));
const ProductForm = lazy(() => import('./pages/admin/ProductForm'));
const Sales = lazy(() => import('./pages/admin/Sales'));
const Donations = lazy(() => import('./pages/admin/Donations'));

/** Um guarda só, por onde todas as rotas privadas passam. */
function Guard({ role }) {
  const { user, booting } = useApp();
  const location = useLocation();
  if (booting) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/loja'} replace />;
  }
  return <Outlet />;
}

/** Vitrine e carrinho são públicos; a última aba muda conforme o login. */
function ShopLayout() {
  const { cart, user } = useApp();
  return (
    <>
      <Outlet />
      <TabBar
        items={[
          { to: '/loja', label: 'Loja', icon: Store },
          { to: '/carrinho', label: 'Carrinho', icon: ShoppingCart, badge: cart.length },
          { to: '/doar', label: 'Doar', icon: Heart },
          user
            ? { to: '/perfil', label: 'Perfil', icon: User }
            : { to: '/login', label: 'Entrar', icon: LogIn },
        ]}
      />
    </>
  );
}

/** Guarda de admin + fronteira do chunk carregado sob demanda. */
function AdminChunk() {
  return (
    <Suspense fallback={null}>
      <Guard role="admin" />
    </Suspense>
  );
}

function AdminLayout() {
  return (
    <>
      <Outlet />
      <TabBar
        items={[
          { to: '/admin', label: 'Painel', icon: BarChart3, end: true },
          { to: '/admin/produtos', label: 'Peças', icon: Shirt },
          { to: '/admin/vendas', label: 'Vendas', icon: Receipt },
          { to: '/admin/doacoes', label: 'Doações', icon: Heart },
        ]}
      />
    </>
  );
}

/** Raiz: admin vai ao painel, todo o resto (inclusive visitante) vai à vitrine. */
function Home() {
  const { user, booting } = useApp();
  if (booting) return null;
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/loja'} replace />;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <a href="#conteudo" className="sr-only">Pular para o conteúdo</a>
        <div className="shell">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Signup />} />

            {/* Público: vitrine compartilhável e carrinho (que vive no navegador) */}
            <Route path="/produto/:id" element={<ProductDetail />} />
            <Route element={<ShopLayout />}>
              <Route path="/loja" element={<Shop />} />
              <Route path="/carrinho" element={<Cart />} />
            </Route>

            {/* Exige login: mexe com dinheiro, endereço ou dados pessoais */}
            <Route element={<Guard role="user" />}>
              <Route path="/endereco" element={<Address />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/pagamento" element={<Payment />} />
              <Route path="/sucesso" element={<Success />} />
              <Route element={<ShopLayout />}>
                <Route path="/doar" element={<Donate />} />
                <Route path="/perfil" element={<Profile />} />
              </Route>
            </Route>

            <Route element={<AdminChunk />}>
              <Route path="/admin/produtos/novo" element={<ProductForm />} />
              <Route path="/admin/produtos/:id" element={<ProductForm />} />
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/produtos" element={<Products />} />
                <Route path="/admin/vendas" element={<Sales />} />
                <Route path="/admin/doacoes" element={<Donations />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Toaster />
      </BrowserRouter>
    </AppProvider>
  );
}
