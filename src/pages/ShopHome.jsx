import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GROUPS } from '../data/products';
import Icon from '../components/Icon';
import usePageMeta from '../usePageMeta';
import { useCart } from '../shop/cart';
import { SHOP_PRODUCTS, DEMO_PRICE, PACK_LABEL, formatINR } from '../shop/demo';
import { DemoNote, ProductName, CartBar } from '../shop/parts';
import './Shop.css';

export default function ShopHome() {
  usePageMeta('Shop', 'Demo storefront for Berg+Schmidt India retail packs.', { path: '/shop', noindex: true });
  const [group, setGroup] = useState('all');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const list = SHOP_PRODUCTS.filter(p =>
    (group === 'all' || p.species.includes(group)) &&
    (!q || [p.name, p.subtitle, p.type].some(s => (s || '').toLowerCase().includes(q))));

  return (
    <main className="shop-page">
      <DemoNote />
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">Shop Online</h1>
        <p>Order Berg+Schmidt India products in retail packs, delivered to your farm.</p>
      </div></div>

      <nav className="vert-tabs" aria-label="Species">
        <button className={`vert-tab${group === 'all' ? ' vert-tab--active' : ''}`} onClick={() => setGroup('all')}>All Products</button>
        {GROUPS.map(g => (
          <button key={g.id} className={`vert-tab${group === g.id ? ' vert-tab--active' : ''}`} onClick={() => setGroup(g.id)}>
            <Icon name={g.icon} size={18} /> {g.label}
          </button>
        ))}
      </nav>

      <section className="shop-body">
        <div className="shop-inner">
          <div className="shop-toolbar">
            <input className="shop-search" type="search" placeholder="Search products" value={search}
              onChange={e => setSearch(e.target.value)} aria-label="Search products" />
            <span className="shop-count">Showing <strong>{list.length}</strong> of {SHOP_PRODUCTS.length} products</span>
          </div>
          <div className="shop-grid">
            {list.map(p => <ShopCard key={p.id} p={p} />)}
          </div>
          {!list.length && <p className="shop-empty">No products match your search.</p>}
        </div>
      </section>
      <CartBar />
    </main>
  );
}

function ShopCard({ p }) {
  const { add, items } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = items[p.id] || 0;
  return (
    <article className="shop-card">
      <Link to={`/shop/${p.id}`} className="shop-card-top">
        <div className="shop-card-brand"><ProductName p={p} /></div>
        <span className="shop-type">{p.type}</span>
        <h3 className="shop-card-sub">{p.subtitle}</h3>
        <p className="shop-card-desc">{p.tagline}</p>
      </Link>
      <div className="shop-card-tags">
        {p.species.map(s => <span key={s} className="shop-stag"><Icon name={s} size={14} /> {s === 'poultry' ? 'Poultry' : 'Dairy'}</span>)}
      </div>
      <div className="shop-card-foot">
        <div>
          <div className="shop-price">{formatINR(DEMO_PRICE)}</div>
          <div className="shop-pack">{PACK_LABEL}</div>
        </div>
        <button type="button" className="btn-primary shop-add"
          onClick={() => { add(p.id); setAdded(true); setTimeout(() => setAdded(false), 1400); }}>
          {added ? 'Added' : inCart ? `Add another (${inCart})` : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
