import { Link } from 'react-router-dom';
import Logo from './Logo';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">

        {/* Brand col */}
        <div className="footer-brand">
          <Logo size="sm" white />
          <div className="footer-entity">
            <p>Berg + Schmidt India Pvt. Ltd.</p>
            <p>A subsidiary of Berg + Schmidt</p>
            <p>International GmbH</p>
            <p>Pune, Maharashtra, India</p>
          </div>
        </div>

        {/* Poultry */}
        <div className="footer-col">
          <h4>Poultry</h4>
          <ul>
            <li><Link to="/products/bergafat-dln2">Bergafat DLN2</Link></li>
            <li><Link to="/products/bergafat-fg">Bergafat FG</Link></li>
            <li><Link to="/products/bergaapur">Bergaapur</Link></li>
            <li><Link to="/products/bergaboost">Bergaboost</Link></li>
            <li><Link to="/products" className="footer-more">More →</Link></li>
          </ul>
        </div>

        {/* Dairy */}
        <div className="footer-col">
          <h4>Dairy</h4>
          <ul>
            <li><Link to="/products/bergafat-t300">Bergafat T300</Link></li>
            <li><Link to="/products/fat-o-lip">Fat-O-Lip</Link></li>
            <li><Link to="/products/l-met-60">L-Met-60</Link></li>
            <li><Link to="/products/l-lys-40">L-Lys-40</Link></li>
            <li><Link to="/products" className="footer-more">More →</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><Link to="/company">About Us</Link></li>
            <li><Link to="/species">Species</Link></li>
            <li><Link to="/news">News</Link></li>
            <li><Link to="/shop">Shop</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><a href="https://an.berg-schmidt.com" target="_blank" rel="noreferrer">Global Website</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div className="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><Link to="/imprint">Imprint</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
          </ul>
          <div className="footer-social">
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Berg + Schmidt India Pvt. Ltd. All rights reserved.</p>
      </div>
    </footer>
  );
}
