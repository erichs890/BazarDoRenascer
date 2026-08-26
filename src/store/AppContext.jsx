import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  supabase, fromDbProduct, toDbProduct, fromDbSale, fromDbDonation,
} from '../lib/supabase';
import { prepararFoto } from '../lib/image';

const Ctx = createContext(null);
const CART_KEY = 'bazar:cart';
const SNAP_KEY = 'bazar:catalogo';

// O carrinho vive só no navegador (o banco não tem cart_items) — mas precisa
// sobreviver a um reload, senão o PWA parece que "perdeu" a compra.
const readLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
};
const writeLocal = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* cota/aba privada */ }
};

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [address, setAddress] = useState(null);
  // Snapshot do catálogo: é o que faz a vitrine abrir offline.
  const [products, setProducts] = useState(() => readLocal(SNAP_KEY, []));
  const [sales, setSales] = useState([]);
  const [donations, setDonations] = useState([]);
  const [cart, setCart] = useState(() => readLocal(CART_KEY, []));
  const [booting, setBooting] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => writeLocal(CART_KEY, cart), [cart]);

  /* ---------------------------------------------------------------- sessão */
  // `booting` espera SÓ a sessão (leitura local, rápida) — nunca a rede.
  // Amarrar o boot a uma requisição significa tela branca eterna quando o
  // servidor cai ou a rede pendura.
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setBooting(false); } };

    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => { /* sessão ilegível: segue como visitante */ })
      .finally(finish);

    // Rede pendurada (DNS lento, projeto pausado) não pode travar o app.
    const bail = setTimeout(finish, 5000);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); finish(); });

    return () => { clearTimeout(bail); sub.subscription.unsubscribe(); };
  }, []);

  /* --------------------------------------------------------------- catálogo */
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('products').select('*').order('created_at', { ascending: false });
    setLoadingProducts(false);
    if (error) return; // offline/servidor fora: fica com o snapshot em memória
    const list = data.map(fromDbProduct);
    setProducts(list);
    writeLocal(SNAP_KEY, list);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  /* ------------------------------------------- dados que dependem de login */
  const userId = session?.user?.id ?? null;

  const loadPrivate = useCallback(async () => {
    if (!userId) { setProfile(null); setAddress(null); setSales([]); setDonations([]); return; }
    // As policies já filtram: usuário comum recebe só o próprio histórico,
    // admin recebe tudo. O front não precisa repetir o filtro.
    const [p, a, s, d] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('addresses').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('sales_detail').select('*').order('date', { ascending: false }),
      supabase.from('donations_detail').select('*').order('date', { ascending: false }),
    ]);
    setProfile(p.data ? { ...p.data, email: session.user.email } : null);
    setAddress(a.data || null);
    setSales((s.data || []).map(fromDbSale));
    setDonations((d.data || []).map(fromDbDonation));
  }, [userId, session]);

  useEffect(() => { loadPrivate(); }, [loadPrivate]);

  /* ------------------------------------------------------------------ auth */
  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error;
  };

  const signUp = async (name, email, password) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },  // vira profiles.name no trigger
    });
    return error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCart([]);
  };

  /* ------------------------------------------------------------- perfil */
  const updateUser = async (patch) => {
    const { error } = await supabase.from('profiles')
      .update({ name: patch.name, phone: patch.phone }).eq('id', userId);
    if (!error) setProfile((p) => ({ ...p, ...patch }));
    return error;
  };

  const saveAddress = async (a) => {
    const row = { ...a, user_id: userId, cep: a.cep.replace(/\D/g, ''), state: a.state.toUpperCase() };
    const { data, error } = await supabase.from('addresses').upsert(row).select().maybeSingle();
    if (!error) setAddress(data);
    return error;
  };

  /* ------------------------------------------------------------ produtos */
  /** Redimensiona, converte e sobe a foto; devolve a URL pública. */
  const uploadPhoto = async (file) => {
    let blob = file;
    let ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    try {
      ({ blob, ext } = await prepararFoto(file));
    } catch {
      // Se o canvas falhar, sobe o original — o bucket ainda valida tipo e tamanho.
    }
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('product-photos')
      .upload(path, blob, { cacheControl: '31536000', upsert: false, contentType: blob.type });
    if (error) return { error };
    const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
    return { url: data.publicUrl };
  };

  const addProduct = async (p) => {
    const { error } = await supabase.from('products')
      .insert({ ...toDbProduct(p), created_by: userId });
    if (!error) await loadProducts();
    return error;
  };

  const updateProduct = async (id, p) => {
    const { error } = await supabase.from('products').update(toDbProduct(p)).eq('id', id);
    if (!error) await loadProducts();
    return error;
  };

  const removeProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) { setCart((c) => c.filter((x) => x !== id)); await loadProducts(); }
    return error;
  };

  /* -------------------------------------------------------------- compra */
  const toggleCart = (id) =>
    setCart((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  /** Escrita em sales só acontece dentro da RPC — o cliente não insere venda. */
  const checkout = async (payment) => {
    const items = products.filter((p) => cart.includes(p.id) && p.status === 'available');
    const { data: orderId, error } = await supabase.rpc('checkout', {
      product_ids: items.map((p) => p.id),
      payment,
    });
    if (error) return { error };
    setCart([]);
    await Promise.all([loadProducts(), loadPrivate()]);
    return {
      result: {
        orderId,
        items,
        total: items.reduce((a, p) => a + Number(p.price), 0),
        payment,
        date: new Date().toISOString(),
      },
    };
  };

  const donate = async (amount, payment, anonymous = false) => {
    const { error } = await supabase.rpc('donate', { amount, payment, anonymous });
    if (error) return { error };
    await loadPrivate();
    return { result: { amount, payment, date: new Date().toISOString() } };
  };

  const value = useMemo(() => ({
    booting, loadingProducts,
    user: profile ? { ...profile, address } : null,
    products, sales, donations, cart, address,
    signIn, signUp, signOut, logout: signOut,
    updateUser, saveAddress,
    uploadPhoto, addProduct, updateProduct, removeProduct,
    toggleCart, checkout, donate,
    refresh: () => Promise.all([loadProducts(), loadPrivate()]),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [booting, loadingProducts, profile, address, products, sales, donations, cart, userId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
