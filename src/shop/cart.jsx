import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DEMO_PRICE, shopProduct } from './demo';

/*
 * Cart state for the demo store. Kept in localStorage so it survives a page
 * load; every storage call is guarded because storage can be blocked. The
 * first render is always an empty cart, on the server and in the browser, so
 * hydration matches; the saved cart is read after mount.
 */
const KEY = 'bsi-demo-cart';
const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState({});   // { productId: qty }
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      // Read after mount on purpose, so the hydrated markup matches the prerender.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && typeof saved === 'object') setItems(saved);
    } catch { /* storage blocked or corrupt: start empty */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items, ready]);

  const setQty = useCallback((id, qty) => setItems(prev => {
    const next = { ...prev };
    const q = Math.max(0, Math.min(99, Math.floor(Number(qty) || 0)));
    if (q === 0) delete next[id]; else next[id] = q;
    return next;
  }), []);
  const add = useCallback((id, qty = 1) => setItems(prev => ({ ...prev, [id]: Math.min(99, (prev[id] || 0) + qty) })), []);
  const clear = useCallback(() => setItems({}), []);

  const lines = Object.entries(items)
    .map(([id, qty]) => ({ product: shopProduct(id), qty }))
    .filter(l => l.product)
    .map(l => ({ ...l, unit: DEMO_PRICE, total: DEMO_PRICE * l.qty }));
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.total, 0);

  return (
    <CartCtx.Provider value={{ items, lines, count, subtotal, add, setQty, clear, ready }}>
      {children}
    </CartCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartCtx);
