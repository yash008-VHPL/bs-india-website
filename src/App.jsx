import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './index.css';
import './App.css';

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
  return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <h1 style={{ color: 'var(--green-dark)' }}>404</h1>
      <p style={{ color: 'var(--text-mid)', marginBottom: '20px' }}>Page not found.</p>
      <a href="/" className="btn-primary">Return to Home</a>
    </div>
  );
}

// Minimal loading state - just a blank screen, no spinner overhead
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
    <BrowserRouter>
      <ScrollToTop />
      <Layout />
    </BrowserRouter>
  );
}
