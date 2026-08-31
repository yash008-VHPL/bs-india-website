import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS, GROUPS, SPECIES } from '../data/products';
import Icon from '../components/Icon';
import './Products.css';

/*
 * Products are grouped by SPECIES, not by internal business division.
 * Mr Wywiol: the division names are internal and must not appear publicly.
 */
export default function Products() {
  const [activeGroup, setActiveGroup] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = PRODUCTS.filter(p => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || p.name.toLowerCase().includes(q)
      || p.subtitle.toLowerCase().includes(q)
      || p.type.toLowerCase().includes(q);
    const matchGroup = activeGroup === 'all' || p.species.includes(activeGroup);
    return matchSearch && matchGroup;
  });

  // Products with no species tag (e.g. general-purpose feed fats) would
  // otherwise disappear from a species-grouped list.
  const ungrouped = filtered.filter(p => !p.species.length);

  return (
    <main className="products-page">
      <div className="pg-hero">
        <div className="pg-hero-inner">
          <h1 className="bs-mark">Our Products</h1>
          <p>Nutritional solutions for India&rsquo;s poultry and dairy producers.</p>
        </div>
      </div>

      {/* Species tabs */}
      <nav className="vert-tabs">
        <button
          className={`vert-tab${activeGroup === 'all' ? ' vert-tab--active' : ''}`}
          onClick={() => setActiveGroup('all')}
        >
          All Products
        </button>
        {GROUPS.map(g => (
          <button
            key={g.id}
            className={`vert-tab${activeGroup === g.id ? ' vert-tab--active' : ''}`}
            onClick={() => setActiveGroup(g.id)}
          >
            <Icon name={g.icon} size={18} /> {g.label}
          </button>
        ))}
      </nav>

      <div className="prod-layout">
        <aside className="prod-sidebar">
          <input
            className="sb-search"
            type="text"
            placeholder="Search products"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="sb-section">
            <div className="sb-section-label">Species</div>
            {[{ id: 'all', label: 'All Species' }, ...SPECIES].map(s => (
              <label key={s.id} className="sb-opt">
                <input
                  type="radio"
                  name="species"
                  checked={activeGroup === s.id}
                  onChange={() => setActiveGroup(s.id)}
                />
                {s.label}
              </label>
            ))}
          </div>

          <button className="sb-reset" onClick={() => { setSearch(''); setActiveGroup('all'); }}>
            Reset Filters
          </button>
        </aside>

        <section className="prod-list">
          <div className="prod-count">
            Showing <strong>{filtered.length}</strong> of {PRODUCTS.length} products
          </div>

          {activeGroup === 'all'
            ? (
              <>
                {GROUPS.map(g => {
                  const gProds = filtered.filter(p => p.species.includes(g.id));
                  if (!gProds.length) return null;
                  return (
                    <div key={g.id} className="prod-group">
                      <div className="prod-group-header">
                        <Icon name={g.icon} size={34} />
                        <div>
                          <div className="prod-group-title">{g.label}</div>
                          <div className="prod-group-desc">{g.desc}</div>
                        </div>
                      </div>
                      {gProds.map(p => <ProductRow key={p.id} p={p} />)}
                    </div>
                  );
                })}
                {ungrouped.length > 0 && (
                  <div className="prod-group">
                    <div className="prod-group-header">
                      <div>
                        <div className="prod-group-title">Other Products</div>
                        <div className="prod-group-desc">Feed fats and ingredients supplied across livestock species.</div>
                      </div>
                    </div>
                    {ungrouped.map(p => <ProductRow key={p.id} p={p} />)}
                  </div>
                )}
              </>
            )
            : filtered.map(p => <ProductRow key={p.id} p={p} />)
          }

          {filtered.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-light)' }}>
              No products match your filters.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ProductRow({ p }) {
  return (
    <Link to={`/products/${p.id}`} className="prod-row">
      <div className="prod-row-hdr">
        {/* Product names are real text, never images - search engines need to
            read them (chairman's note on the product page write-up). */}
        <h3><span className="sol-plus" aria-hidden="true" />{p.name}</h3>
        <div className="prod-row-badges">
          <span className="prod-row-type">{p.type}</span>
        </div>
      </div>
      <p className="prod-row-sub">{p.subtitle}</p>
      <p className="prod-row-desc">{p.tagline}</p>
      <div className="prod-row-tags">
        {p.species.map(s => (
          <span key={s} className="stag">
            <Icon name={s} size={14} /> {s === 'poultry' ? 'Poultry' : 'Dairy'}
          </span>
        ))}
      </div>
    </Link>
  );
}
