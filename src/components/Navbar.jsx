import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { useCart } from '../shop/context';

const SHOP_DEMO = import.meta.env.VITE_SHOP_DEMO === '1';
import './Navbar.css';

const NAV = [
  { label:'Company', href:'/company' },
  { label:'Products', href:'/products' },
  { label:'Species', href:'/species' },
  { label:'News', href:'/news' },
  { label:'Shop', href:'/shop', badge: SHOP_DEMO ? 'Demo' : 'Soon' },
  { label:'Contact', href:'/contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { count } = useCart();

  return (
    <header className="site-header">
      {/* Top utility bar */}
      <div className="topbar">
        <div className="topbar-inner">
          <span className="topbar-entity">Berg+Schmidt India Pvt. Ltd.</span>
          <div className="topbar-links">
            <a href="https://an.berg-schmidt.com" target="_blank" rel="noreferrer">Global Site</a>
            <span className="topbar-sep">|</span>
            <Link to="/contact">Enquire</Link>
            {SHOP_DEMO && <>
              <span className="topbar-sep">|</span>
              <Link to="/shop/cart" aria-label={`Cart, ${count} items`}>Cart ({count})</Link>
            </>}
          </div>
        </div>
      </div>

      {/* Main nav - always solid white, always visible */}
      <nav className="sticky-nav">
        <div className="sticky-nav-logo">
          <Link to="/"><Logo size="sm" /></Link>
        </div>
        <ul className={`sticky-nav-links${open ? ' open' : ''}`}>
          {NAV.map(({ label, href, badge }) => (
            <li key={href}>
              <Link
                to={href}
                className={pathname.startsWith(href) ? 'active' : ''}
                onClick={() => setOpen(false)}
              >
                {label}{badge && <span className="nav-badge">{badge}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <button className={`burger${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </nav>
    </header>
  );
}
