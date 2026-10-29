import { createContext, useContext } from 'react';

// Kept free of product data so the navbar can read the cart count without
// pulling the catalogue into the main bundle.
export const CartCtx = createContext(null);
const EMPTY = { items: {}, lines: [], count: 0, subtotal: 0, ready: false, add() {}, setQty() {}, clear() {} };
export const useCart = () => useContext(CartCtx) || EMPTY;
