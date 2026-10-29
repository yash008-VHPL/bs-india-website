import { PRODUCTS } from '../data/products';

/*
 * Demo storefront switch. Set VITE_SHOP_DEMO=1 at build time (pull-request
 * staging builds only). Production keeps the "Coming Soon" page at /shop and
 * none of the store routes exist there.
 */
export const SHOP_DEMO = import.meta.env.VITE_SHOP_DEMO === '1';

/*
 * PLACEHOLDERS. The retail range, pack sizes and prices have not been
 * supplied. One flat demo price is used on purpose so nobody mistakes it for
 * a real price list. Replace with the confirmed retail data before launch.
 */
export const DEMO_PRICE = 1000;           // INR per pack, placeholder
export const PACK_LABEL = 'Retail pack, size to be confirmed';

// Every product that is listed under a species on the product page.
export const SHOP_PRODUCTS = PRODUCTS.filter(p => p.species.length);
export const shopProduct = id => SHOP_PRODUCTS.find(p => p.id === id);

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const formatINR = n => inr.format(n);
