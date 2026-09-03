import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BetaBanner from './BetaBanner';
import './index.css';
import './App.css';
import usePageMeta from './usePageMeta';

// Lazy load all pages - only downloaded when the user navigates to them
const Home          = lazy(() => import('./pages/Home'));
const Company       = lazy(() => import('./pages/Company'));
const Products      = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Species       = lazy(() => import('./pages/Species'));
const News          = lazy(() => import('./pages/News'));
const Contact       = lazy(() => import('./pages/Contact'));
const Webstore      = lazy(() => import('./pages/Webstore'));
const Legal         = lazy(() => import('./pages/Legal'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function NotFound() {
  usePageMeta('Page Not Found', 'That address does not exist on berg-schmidt.co.in.');
  return (
    <main className="notfound-page">
      <div className="pg-hero">
        <div className="pg-hero-inner">
          <h1 className="bs-mark">Page Not Found</h1>
          <p>That address does not exist on this site.</p>
        </div>
      </div>
      <div className="notfound-inner">
        <p>The page may have moved, or the link may be out of date. Our products,
           species pages and contact details are all a click away.</p>
        <div className="notfound-cta">
          <Link to="/" className="btn-primary">Home</Link>
          <Link to="/products" className="btn-outline">Our Products</Link>
          <Link to="/contact" className="btn-outline">Contact Us</Link>
        </div>
      </div>
    </main>
  );
}

// The router must know it is mounted under /beta on the review build,
// otherwise every Link would point back at the production root.
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

// Minimal loading state - just a blank screen, no spinner overhead
const PageLoader = () => <div style={{ minHeight: '60vh' }} />;

function Layout() {
  return (
    <div className="app-layout">
      <BetaBanner />
      <Navbar />
      <div className="app-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/company"     element={<Company />} />
            <Route path="/products"    element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/species"     element={<Species />} />
            <Route path="/news"        element={<News />} />
            <Route path="/contact"     element={<Contact />} />
            <Route path="/shop"        element={<Webstore />} />
            <Route path="/imprint"     element={<Legal page="imprint" />} />
            <Route path="/privacy"     element={<Legal page="privacy" />} />
            <Route path="*"            element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <ScrollToTop />
      <Layout />
    </BrowserRouter>
  );
}
