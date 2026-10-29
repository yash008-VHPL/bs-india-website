import { PRODUCTS } from '../data/products';


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

// Every product on the product page; launch range first.
export const SHOP_PRODUCTS = [...PRODUCTS.filter(p => RETAIL[p.id]), ...PRODUCTS.filter(p => !RETAIL[p.id])];
export const shopProduct = id => SHOP_PRODUCTS.find(p => p.id === id);
export const retail = id => RETAIL[id] || null;

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const formatINR = n => inr.format(n);
