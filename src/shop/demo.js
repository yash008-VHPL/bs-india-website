import { PRODUCTS } from '../data/products';

/*
 * Demo storefront switch. Set VITE_SHOP_DEMO=1 at build time (pull-request
 * staging builds only). Production keeps the "Coming Soon" page at /shop and
 * none of the store routes exist there.
 */
export const SHOP_DEMO = import.meta.env.VITE_SHOP_DEMO === '1';

/*
 * Launch range sold online. Pack sizes as given by Yash (2026-10-29).
 * Prices are DUMMY figures for the demo; replace before launch.
 * Every other product shows a link to find a regional distributor.
 */
export const RETAIL = {
  'bergafat-t300': { pack: '1 kg pouch',  price: 150 },
  'bergafat-dln2': { pack: '200 kg drum', price: 23000 },
};
export const DISTRIBUTOR_LINK = '/contact#contact-form';

// Every product listed under a species on the product page; launch range first.
const listed = PRODUCTS.filter(p => p.species.length);
export const SHOP_PRODUCTS = [...listed.filter(p => RETAIL[p.id]), ...listed.filter(p => !RETAIL[p.id])];
export const shopProduct = id => SHOP_PRODUCTS.find(p => p.id === id);
export const retail = id => RETAIL[id] || null;

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const formatINR = n => inr.format(n);
