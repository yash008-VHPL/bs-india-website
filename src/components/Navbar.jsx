import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './Navbar.css';

const NAV = [
  { label:'Company',  href:'/company'  },
  { label:'Products', href:'/products' },
  { label:'Species',  href:'/species'  },
  { label:'News',     href:'/news'     },
  { label:'Shop',     href:'/shop',    badge:'Soon' },
  { label:'Contact',  href:'/contact'  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <>
      {/* Topbar — light teal, NOT sticky, disappears on scroll */}
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

      {/* Navbar — white bar, sticky */}
      <div className="navbar-wrap">
        <nav className="navbar">
          <Link to="/" className="navbar-logo"><Logo size="sm" /></Link>
          <ul className={`navbar-links${open ? ' open' : ''}`}>
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
          <button
            className={`burger${open ? ' open' : ''}`}
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span/><span/><span/>
          </button>
        </nav>
      </div>
    </>
  );
}
