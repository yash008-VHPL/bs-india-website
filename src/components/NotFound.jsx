import { Link } from 'react-router-dom';
import usePageMeta from '../usePageMeta';

export default function NotFound() {
  usePageMeta('Page Not Found', 'That address does not exist on berg-schmidt.co.in.', { noindex: true });
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
