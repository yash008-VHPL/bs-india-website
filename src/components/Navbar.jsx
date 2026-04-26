import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './Navbar.css';

const NAV = [
  { label:'Company', href:'/company' },
  { label:'Products', href:'/products' },
  { label:'Species', href:'/species' },
  { label:'News', href:'/news' },
  { label:'Shop', href:'/shop', badge:'Soon' },
  { label:'Contact', href:'/contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* Top utility bar — light green, always present */}
      <div className="topbar">
        <div className="topbar-inner">
          <span className="topbar-entity">Berg + Schmidt India Pvt. Ltd.</span>
          <div className="topbar-links">
            <a href="https://an.berg-schmidt.com" target="_blank" rel="noreferrer">Global Site</a>
            <span className="topbar-sep">|</span>
            <Link to="/contact">Enquire</Link>
          </div>
        </div>
      </div>

      {/*
        Sticky nav — always at top:0, position:sticky (same as global site #sticky-nav)
        - Transparent background when at top of homepage
        - White background + border on all other pages or when scrolled
        - Logo on left (animated Lottie on home, static wordmark elsewhere)
        - Nav links on right
      */}
      <nav className={`sticky-nav${isHome && !scrolled ? ' sticky-nav--transparent' : ''}`}>
        <div className="sticky-nav-logo">
          <Link to="/">
            <Logo size="sm" animate={false} white={isHome && !scrolled} />
          </Link>
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
    </>
  );
}
