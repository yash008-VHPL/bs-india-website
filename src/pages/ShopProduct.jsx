import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import NotFound from '../components/NotFound';
import usePageMeta from '../usePageMeta';
import { useCart } from '../shop/cart';
import { shopProduct, DEMO_PRICE, PACK_LABEL, formatINR } from '../shop/demo';
import { DemoNote, ProductName, QtyStepper, CartBar } from '../shop/parts';
import './Shop.css';

export default function ShopProduct() {
  const { id } = useParams();
  const p = shopProduct(id);
  usePageMeta(p ? `${p.name} - Shop` : null, p ? p.subtitle : null, { path: `/shop/${id}`, noindex: true });
  const { add } = useCart();
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  if (!p) return <NotFound />;
  const clamp = n => Math.max(1, Math.min(99, Math.floor(Number(n) || 1)));

  return (
    <main className="shop-page">
      <DemoNote />
      <div className="shop-crumbs"><div className="shop-inner">
        <Link to="/shop">Shop</Link><span aria-hidden="true">/</span><span>{p.name}</span>
      </div></div>
      <section className="shop-body shop-body--white">
        <div className="shop-inner shop-pd">
          <div className="shop-pd-visual">
            <ProductName p={p} className="shop-pd-mark" />
            <div className="shop-card-tags">
              {p.species.map(s => <span key={s} className="shop-stag"><Icon name={s} size={14} /> {s === 'poultry' ? 'Poultry' : 'Dairy'}</span>)}
            </div>
          </div>
          <div className="shop-pd-main">
            <span className="shop-type">{p.type}</span>
            <h1 className="shop-pd-title">{p.name}</h1>
            <p className="shop-pd-sub">{p.subtitle}</p>
            <p className="shop-pd-desc">{p.tagline}</p>

            <div className="shop-buybox">
              <div className="shop-buybox-row">
                <div>
                  <div className="shop-price">{formatINR(DEMO_PRICE)}</div>
                  <div className="shop-pack">{PACK_LABEL}</div>
                </div>
                <QtyStepper value={qty} onChange={n => setQty(clamp(n))} />
              </div>
              <div className="shop-buybox-btns">
                <button type="button" className="btn-outline" onClick={() => { add(p.id, qty); setAdded(true); }}>
                  {added ? 'Added to Cart' : 'Add to Cart'}
                </button>
                <button type="button" className="btn-primary" onClick={() => { add(p.id, qty); nav('/shop/checkout'); }}>Buy Now</button>
              </div>
              {added && <p className="shop-added">Added. <Link to="/shop/cart">View cart</Link></p>}
            </div>

            {p.benefits?.length > 0 && (
              <div className="shop-benefits">
                <h2 className="shop-h">Key Benefits</h2>
                <ul>{p.benefits.map(b => <li key={b}>{b}</li>)}</ul>
              </div>
            )}
            <Link to={`/products/${p.id}`} className="shop-more">Full technical details and dosage →</Link>
          </div>
        </div>
      </section>
      <CartBar />
    </main>
  );
}
