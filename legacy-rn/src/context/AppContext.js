import React, { createContext, useContext, useMemo, useState } from 'react';
import { USERS, PRODUCTS, SALES, DONATIONS } from '../mocks/data';

const Ctx = createContext(null);
const uid = () => Math.random().toString(36).slice(2, 9);

// ponytail: estado só em memória; trocar por AsyncStorage se precisar persistir entre reinícios.
export function AppProvider({ children }) {
  const [users, setUsers] = useState(USERS);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState(PRODUCTS);
  const [sales, setSales] = useState(SALES);
  const [donations, setDonations] = useState(DONATIONS);
  const [cart, setCart] = useState([]);

  const login = (email, password) => {
    const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (u) setUser(u);
    return !!u;
  };
  const logout = () => { setUser(null); setCart([]); };

  const updateUser = (patch) => {
    const next = { ...user, ...patch };
    setUser(next);
    setUsers((list) => list.map((u) => (u.id === next.id ? next : u)));
  };

  const addProduct = (p) => setProducts((l) => [{ ...p, id: uid(), status: 'available', createdAt: new Date().toISOString() }, ...l]);
  const updateProduct = (id, patch) => setProducts((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removeProduct = (id) => { setProducts((l) => l.filter((p) => p.id !== id)); setCart((c) => c.filter((x) => x !== id)); };

  const toggleCart = (id) => setCart((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const checkout = (payment) => {
    const date = new Date().toISOString();
    const items = products.filter((p) => cart.includes(p.id) && p.status === 'available');
    const ids = items.map((p) => p.id);
    const newSales = items.map((p) => ({ id: uid(), productId: p.id, productName: p.name, buyerId: user.id, buyerName: user.name, amount: p.price, payment, date }));
    setSales((l) => [...newSales, ...l]);
    setProducts((l) => l.map((p) => (ids.includes(p.id) ? { ...p, status: 'sold' } : p)));
    setCart([]);
    return { items, total: items.reduce((s, p) => s + p.price, 0), payment, date };
  };

  const donate = (amount, payment) => {
    const d = { id: uid(), donorId: user.id, donorName: user.name, amount, payment, date: new Date().toISOString() };
    setDonations((l) => [d, ...l]);
    return d;
  };

  const value = useMemo(() => ({
    user, login, logout, updateUser,
    products, addProduct, updateProduct, removeProduct,
    sales, donations, cart, toggleCart, checkout, donate,
  }), [user, users, products, sales, donations, cart]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
