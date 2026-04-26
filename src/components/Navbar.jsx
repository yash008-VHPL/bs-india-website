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

  // Logo floats in from top on scroll — matches global site behaviour
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* Top utility bar — light green, scrolls away */}
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

      {/* Main navbar — floats in sticky when scrolled, invisible logo when at top */}
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <Link to="/" className={`navbar-logo ${scrolled ? 'navbar-logo--visible' : ''}`}>
          <Logo size="sm" />
        </Link>

        <ul className={`navbar-links ${open ? 'open' : ''}`}>
          {NAV.map(({ label, href, badge }) => (
            <li key={href}>
              <Link
                to={href}
                className={pathname.startsWith(href) ? 'active' : ''}
              >
                {label}{badge && <span className="nav-badge">{badge}</span>}
              </Link>
            </li>
          ))}
        </ul>

        <button
          className={`burger ${open ? 'open' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span/><span/><span/>
        </button>
      </nav>
    </>
  );
}
