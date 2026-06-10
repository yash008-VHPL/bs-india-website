import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS, VERTICALS, SPECIES } from '../data/products';
import './Products.css';

export default function Products() {
  const [activeVertical, setActiveVertical] = useState('all');
  const [activeSp, setActiveSp] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = PRODUCTS.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
    const matchVertical = activeVertical === 'all' || (p.verticals || [p.vertical]).includes(activeVertical);
    const matchSp = activeSp === 'all' || p.species.includes(activeSp);
    return matchSearch && matchVertical && matchSp;
  });

  return (
    <main className="products-page">
      {/* Page header */}
      <div className="pg-hero">
        <div className="pg-hero-inner">
          <h1 className="bs-mark">Our Products</h1>
          <p>Advanced nutritional solutions across three business verticals.</p>
        </div>
      </div>

      {/* Vertical tabs */}
      <nav className="vert-tabs">
        <button
          className={`vert-tab${activeVertical === 'all' ? ' vert-tab--active' : ''}`}
          onClick={() => setActiveVertical('all')}
        >
          All Divisions
        </button>
        {VERTICALS.map(v => (
          <button
            key={v.id}
            className={`vert-tab${activeVertical === v.id ? ' vert-tab--active' : ''}`}
            onClick={() => setActiveVertical(v.id)}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </nav>

      <div className="prod-layout">
        {/* Sidebar filters */}
        <aside className="prod-sidebar">
          <input
            className="sb-search"
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="sb-section">
            <div className="sb-section-label">Species</div>
            {[{id:'all',label:'All Species'}, ...SPECIES].map(s => (
              <label key={s.id} className="sb-opt">
                <input type="radio" name="species" checked={activeSp === s.id} onChange={() => setActiveSp(s.id)} />
                {s.label}
              </label>
            ))}
          </div>

          <button className="sb-reset" onClick={() => { setSearch(''); setActiveSp('all'); setActiveVertical('all'); }}>
            Reset Filters
          </button>
        </aside>

        {/* Product list */}
        <section className="prod-list">
          <div className="prod-count">
            Showing <strong>{filtered.length}</strong> of {PRODUCTS.length} products
          </div>

          {/* Group by vertical if showing all */}
          {activeVertical === 'all'
            ? VERTICALS.map(v => {
                const vProds = filtered.filter(p => (p.verticals || [p.vertical]).includes(v.id));
                if (!vProds.length) return null;
                return (
                  <div key={v.id} className="prod-group">
                    <div className="prod-group-header">
                      <span>{v.icon}</span>
                      <div>
                        <div className="prod-group-title">{v.label}</div>
                        <div className="prod-group-desc">{v.desc}</div>
                      </div>
                    </div>
                    {vProds.map(p => <ProductRow key={p.id} p={p} />)}
                  </div>
                );
              })
            : filtered.map(p => <ProductRow key={p.id} p={p} />)
          }

          {filtered.length === 0 && (
            <div style={{padding:'48px 24px',textAlign:'center',color:'var(--text-light)'}}>
              No products match your filters.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ProductRow({ p }) {
  const VERT = { commodity:'Commodity', 'poultry-supplement':'Feed Supplement', 'dairy-supplement':'Feed Supplement' };
  return (
    <Link to={`/products/${p.id}`} className="prod-row">
      <div className="prod-row-hdr">
        {p.logo
          ? <img src={p.logo} alt={p.name} className="prod-row-logo" />
          : <h3><span className="sol-plus">+</span> {p.name}</h3>
        }
        <div className="prod-row-badges">
          <span className="prod-row-type">{p.type}</span>
          <span className="prod-row-vert">{VERT[p.vertical]}</span>
        </div>
      </div>
      <p className="prod-row-sub">{p.subtitle}</p>
      <p className="prod-row-desc">{p.tagline}</p>
      <div className="prod-row-tags">
        {p.species.map(s => <span key={s} className="stag">{s === 'poultry' ? '🐓 Poultry' : '🐄 Dairy'}</span>)}
      </div>
    </Link>
  );
}
