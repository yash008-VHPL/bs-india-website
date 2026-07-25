import { Routes, Route, Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './V2App.css';

// Lazy load all V2 pages — only downloaded when the user navigates to them
const Home          = lazy(() => import('./pages/Home'));
const Company       = lazy(() => import('./pages/Company'));
const Group         = lazy(() => import('./pages/Group'));
const Products      = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Species       = lazy(() => import('./pages/Species'));
const SpeciesDetail = lazy(() => import('./pages/SpeciesDetail'));
const News          = lazy(() => import('./pages/News'));
const Contact       = lazy(() => import('./pages/Contact'));
const Webstore      = lazy(() => import('./pages/Webstore'));

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--green)' }}>404</h1>
      <p style={{ color: 'var(--text-mid)', marginBottom: '20px' }}>Page not found.</p>
      <Link to="/v2" style={{ color: 'var(--green)', fontWeight: 600 }}>Return to Home</Link>
    </div>
  );
}

const PageLoader = () => <div style={{ minHeight: '60vh' }} />;

/* Slim strip identifying this as the revised build, with a link back to the live site */
function VersionBar() {
  return (
    <div className="v2-bar">
      <div className="v2-bar-inner">
        <span className="v2-bar-tag">V2</span>
        <span className="v2-bar-text">Revised build — incorporating feedback from the Berg + Schmidt web team.</span>
        <a href="/" className="v2-bar-link">View current live site →</a>
      </div>
    </div>
  );
}

export default function V2App() {
  return (
    <div className="app-layout v2-root">
      <VersionBar />
      <Navbar />
      <div className="app-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"             element={<Home />} />
            <Route path="company"       element={<Company />} />
            <Route path="stern-wywiol-gruppe" element={<Group />} />
            <Route path="products"      element={<Products />} />
            <Route path="products/:id"  element={<ProductDetail />} />
            <Route path="species"       element={<Species />} />
            <Route path="species/:id"   element={<SpeciesDetail />} />
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
