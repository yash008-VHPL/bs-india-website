import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotFound from './components/NotFound';
import BetaBanner from './BetaBanner';
import { Fragment } from 'react';
import { CartProvider } from './shop/cart';

/* Demo storefront: staging builds only (VITE_SHOP_DEMO=1). Written inline so
   production builds drop the shop code entirely. Production keeps the
   Coming Soon page at /shop. */
const SHOP_DEMO = import.meta.env.VITE_SHOP_DEMO === '1';
import './index.css';
import './App.css';

/*
 * Lazy pages. After a deploy, an open tab still holds the old chunk names,
 * which no longer exist; the import fails and the page would go blank. One
 * hard reload fetches the new build. The sessionStorage flag stops a loop.
 */
const load = (fn) => lazy(() => fn().catch((err) => {
  try {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('bs-chunk-reload')) {
      sessionStorage.setItem('bs-chunk-reload', '1');
      window.location.reload();
      return new Promise(() => {});
    }
  } catch { /* storage blocked: fall through */ }
  throw err;
}));

const PAGES = {
  Home:          load(() => import('./pages/Home')),
  Company:       load(() => import('./pages/Company')),
  Products:      load(() => import('./pages/Products')),
  ProductDetail: load(() => import('./pages/ProductDetail')),
  Species:       load(() => import('./pages/Species')),
  News:          load(() => import('./pages/News')),
  NewsPost:      load(() => import('./pages/NewsPost')),
  NewsAuthor:    load(() => import('./pages/NewsAuthor')),
  Contact:       load(() => import('./pages/Contact')),
  Webstore:      load(() => import('./pages/Webstore')),
  ...(SHOP_DEMO ? {
    ShopHome:     load(() => import('./pages/ShopHome')),
    ShopProduct:  load(() => import('./pages/ShopProduct')),
    ShopCart:     load(() => import('./pages/ShopCart')),
    ShopCheckout: load(() => import('./pages/ShopCheckout')),
  } : {}),
  Legal:         load(() => import('./pages/Legal')),
};
const P = PAGES;

// Scroll to top on navigation, but not on the first paint: with prerendered
// HTML the reader may already be scrolling, or arrived on a #hash anchor.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!hash) { window.scrollTo(0, 0); return; }
    // A link to /page#id: the lazy page may not be mounted yet, so look for
    // the target for up to a second before falling back to the top.
    let tries = 0, raf;
    const seek = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) el.scrollIntoView({ block: 'start' });
      else if (++tries < 60) raf = requestAnimationFrame(seek);
      else window.scrollTo(0, 0);
    };
    seek();
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);
  return null;
}

const PageLoader = () => <div style={{ minHeight: '60vh' }} />;

const CartWrap = SHOP_DEMO ? CartProvider : Fragment;

export function Layout() {
  return (
    <CartWrap>
    <div className="app-layout">
      <ScrollToTop />
      <BetaBanner />
      <Navbar />
      <div className="app-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                  element={<P.Home />} />
            <Route path="/company"           element={<P.Company />} />
            <Route path="/products"          element={<P.Products />} />
            <Route path="/products/:id"      element={<P.ProductDetail />} />
            <Route path="/species"           element={<P.Species />} />
            <Route path="/news"              element={<P.News />} />
            <Route path="/news/poultry"      element={<P.News species="poultry" />} />
            <Route path="/news/dairy"        element={<P.News species="dairy" />} />
            <Route path="/news/authors/:id"  element={<P.NewsAuthor />} />
            <Route path="/news/:slug"        element={<P.NewsPost />} />
            <Route path="/contact"           element={<P.Contact />} />
            {SHOP_DEMO ? <>
              <Route path="/shop"              element={<P.ShopHome />} />
              <Route path="/shop/cart"         element={<P.ShopCart />} />
              <Route path="/shop/checkout"     element={<P.ShopCheckout />} />
              <Route path="/shop/:id"          element={<P.ShopProduct />} />
            </> : <Route path="/shop"          element={<P.Webstore />} />}
            <Route path="/imprint"           element={<P.Legal page="imprint" />} />
            <Route path="/privacy"           element={<P.Legal page="privacy" />} />
            <Route path="*"                  element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
    </CartWrap>
  );
}

// The router must know it is mounted under /beta on the review build,
// otherwise every Link would point back at the production root.
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <Layout />
    </BrowserRouter>
  );
}
