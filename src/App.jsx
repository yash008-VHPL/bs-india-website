import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './index.css';
import './App.css';

// Lazy load all pages — only downloaded when the user navigates to them
const Home          = lazy(() => import('./pages/Home'));
const Company       = lazy(() => import('./pages/Company'));
const Products      = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Species       = lazy(() => import('./pages/Species'));
const News          = lazy(() => import('./pages/News'));
const Contact       = lazy(() => import('./pages/Contact'));
const Webstore      = lazy(() => import('./pages/Webstore'));

// V1.1 — a byte-for-byte fork of V1 with ONLY the colour palette swapped to
// the Brand Codes values. Mounted at /v1-1 so V1 stays untouched for review.
const V11App        = lazy(() => import('./v11/V11App'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--green)' }}>404</h1>
      <p style={{ color: 'var(--text-mid)', marginBottom: '20px' }}>Page not found.</p>
      <a href="/" style={{ color: 'var(--green)', fontWeight: 600 }}>Return to Home</a>
    </div>
  );
}

// Minimal loading state — just a blank screen, no spinner overhead
const PageLoader = () => <div style={{ minHeight: '60vh' }} />;

function Layout() {
  return (
    <div className="app-layout">
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
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/v1-1/*" element={<V11App />} />
          <Route path="/*"      element={<Layout />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
