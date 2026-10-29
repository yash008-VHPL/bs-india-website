import { useEffect, useState, useCallback } from 'react';
import { retail, shopProduct } from './demo';
import { CartCtx } from './context';

/*
 * Cart state for the demo store. Kept in localStorage so it survives a page
 * load; every storage call is guarded because storage can be blocked. The
 * first render is always an empty cart, on the server and in the browser, so
 * hydration matches; the saved cart is read after mount.
 */
const KEY = 'bsi-demo-cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState({});   // { productId: qty }
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      // Keep only launch-range ids with a whole quantity of 1-99.
      const clean = {};
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        for (const [id, q] of Object.entries(saved)) {
          if (retail(id) && Number.isInteger(q) && q >= 1) clean[id] = Math.min(99, q);
        }
      }
      // Read after mount on purpose, so the hydrated markup matches the prerender.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(clean);
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
  // Only the launch range can be bought online.
  const add = useCallback((id, qty = 1) => retail(id) && setItems(prev => ({ ...prev, [id]: Math.min(99, (prev[id] || 0) + qty) })), []);
  const clear = useCallback(() => setItems({}), []);

  const lines = Object.entries(items)
    .map(([id, qty]) => ({ product: shopProduct(id), qty }))
    .filter(l => l.product && retail(l.product.id))
    .map(l => ({ ...l, pack: retail(l.product.id).pack, unit: retail(l.product.id).price, total: retail(l.product.id).price * l.qty }));
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.total, 0);

  return (
    <CartCtx.Provider value={{ items, lines, count, subtotal, add, setQty, clear, ready }}>
      {children}
    </CartCtx.Provider>
  );
}
