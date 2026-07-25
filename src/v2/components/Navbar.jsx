import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './Navbar.css';

const NAV = [
  { label:'Company', href:'/v2/company' },
  { label:'Group', href:'/v2/stern-wywiol-gruppe' },
  { label:'Products', href:'/v2/products' },
  { label:'Species', href:'/v2/species' },
  { label:'News', href:'/v2/news' },
  { label:'Shop', href:'/v2/shop', badge:'Soon' },
  { label:'Contact', href:'/v2/contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  // Web-team feedback: header carries the full lockup with the claim, and
  // collapses to the logo alone once the page is scrolled.
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="site-header">
      {/* Top utility bar */}
      <div className="topbar">
        <div className="topbar-inner">
          <span className="topbar-entity">Berg + Schmidt India Pvt. Ltd.</span>
          <div className="topbar-links">
            <a href="https://an.berg-schmidt.com" target="_blank" rel="noreferrer">Global Site</a>
            <span className="topbar-sep">|</span>
            <Link to="/v2/contact">Enquire</Link>
          </div>
        </div>
      </div>

      {/* Main nav — always solid white, always visible */}
      <nav className={`sticky-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="sticky-nav-logo">
          <Link to="/v2/"><Logo size="sm" claim={!scrolled} /></Link>
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
