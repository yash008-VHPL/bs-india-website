import { Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import './Webstore.css';
export default function Webstore() {
  return (
    <main className="ws-page">
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">Shop Online</h1>
        <p>Direct purchase of Berg + Schmidt India products — coming soon.</p>
      </div></div>
      <section className="ws-body">
        <div className="ws-inner">
          <div className="ws-card">
            <div className="ws-badge">Coming Soon</div>
            <div className="ws-chips"><div className="ws-chip">🐓 Poultry</div><div className="ws-chip">🐄🦬 Dairy</div></div>
            <h2 className="bs-mark">Our Online Store is Being Built</h2>
            <p>We are setting up a direct online purchasing channel for Indian poultry and dairy producers. Once live, you will be able to browse our full product range, place orders, and arrange delivery directly from Berg + Schmidt India.</p>
            <div className="ws-prod-preview">
              <h3>Products That Will Be Available</h3>
              <div className="ws-cols">
                <div><div className="ws-col-head">Poultry</div>
                  <ul>{PRODUCTS.filter(p=>p.species.includes('poultry')).map(p=><li key={p.id}>{p.name}</li>)}</ul>
                </div>
                <div><div className="ws-col-head">Dairy</div>
                  <ul>{PRODUCTS.filter(p=>p.species.includes('dairy')).map(p=><li key={p.id}>{p.name}</li>)}</ul>
                </div>
              </div>
            </div>
            <div className="ws-notify">
              <h3>Get Notified at Launch</h3>
              <p>Leave your email and we will let you know the moment the store goes live.</p>
              <div className="ws-notify-form">
                <input type="email" placeholder="your@email.com" className="ws-email-input"/>
                <button className="ws-notify-btn" onClick={()=>{const i=document.querySelector('.ws-email-input');if(i?.value)window.location.href=`mailto:info@berg-schmidt.co.in?subject=Store%20Launch%20Notification&body=Please%20notify%20me%20when%20the%20store%20launches.%0AEmail%3A%20${encodeURIComponent(i.value)}`;}}>Notify Me →</button>
              </div>
            </div>
            <div className="ws-ctas">
              <Link to="/products" className="btn-outline">Browse Products</Link>
              <Link to="/contact" className="btn-primary">Enquire to Order Now</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
