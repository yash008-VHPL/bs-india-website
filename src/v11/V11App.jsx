import { Routes, Route, Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './V11App.css';

// V1.1 pages — identical to V1, forked only so their (recoloured) CSS is
// self-contained. Same route set as the live V1 site.
const Home          = lazy(() => import('./pages/Home'));
const Company       = lazy(() => import('./pages/Company'));
const Products      = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Species       = lazy(() => import('./pages/Species'));
const News          = lazy(() => import('./pages/News'));
const Contact       = lazy(() => import('./pages/Contact'));
const Webstore      = lazy(() => import('./pages/Webstore'));

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <h1 style={{ fontSize: '3.5rem', fontWeight: 700, color: 'var(--green)' }}>404</h1>
      <p style={{ color: 'var(--text-mid)', marginBottom: '20px' }}>Page not found.</p>
      <Link to="/v1-1" style={{ color: 'var(--green)', fontWeight: 600 }}>Return to Home</Link>
    </div>
  );
}

const PageLoader = () => <div style={{ minHeight: '60vh' }} />;

/* Slim strip identifying this as the recoloured build, linking back to V1. */
function VersionBar() {
  return (
    <div className="v11-bar">
      <div className="v11-bar-inner">
        <span className="v11-bar-tag">V1.1</span>
        <span className="v11-bar-text">Colour palette matched to the Berg + Schmidt Brand Codes — layout and content unchanged from the current site.</span>
        <a href="/" className="v11-bar-link">View current live site →</a>
      </div>
    </div>
  );
}

export default function V11App() {
  return (
    <div className="app-layout v11-root">
      <VersionBar />
      <Navbar />
      <div className="app-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"             element={<Home />} />
            <Route path="company"       element={<Company />} />
            <Route path="products"      element={<Products />} />
            <Route path="products/:id"  element={<ProductDetail />} />
            <Route path="species"       element={<Species />} />
            <Route path="news"          element={<News />} />
            <Route path="contact"       element={<Contact />} />
            <Route path="shop"          element={<Webstore />} />
            <Route path="*"             element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
