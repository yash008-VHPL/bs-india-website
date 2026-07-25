import { Link, Navigate, useParams } from 'react-router-dom';
import { PRODUCTS, VERTICALS } from '../data/products';
import { SPECIES_DETAIL } from '../data/species';
import './Species.css';

export default function SpeciesDetail() {
  const { id } = useParams();
  const d = SPECIES_DETAIL[id];
  if (!d) return <Navigate to="/v2/species" replace />;

  const prods = PRODUCTS.filter(p => p.species.includes(id));
  const groups = VERTICALS
    .map(v => ({ ...v, items: prods.filter(p => p.vertical === v.id) }))
    .filter(g => g.items.length);

  return (
    <main className="spd-page">
      <div className="spd-hero">
        <img src={d.img} alt={d.label} />
        <div className="spd-hero-overlay">
          <div className="spd-hero-inner">
            <nav className="spd-crumb">
              <Link to="/v2">Home</Link><span>›</span>
              <Link to="/v2/species">Species</Link><span>›</span>
              <span>{d.label}</span>
            </nav>
            <h1>{d.headline}</h1>
          </div>
        </div>
      </div>

      <section className="spd-body">
        <div className="spd-inner">
          <p className="spd-intro">{d.intro}</p>
          <h2 className="bs-mark">Key Challenges We Address</h2>
          <ul className="ch-list spd-ch">
            {d.ch.map((c, n) => <li key={n}><span className="ch-dot" />{c}</li>)}
          </ul>
        </div>
      </section>

      <section className="spd-prods">
        <div className="spd-inner">
          <h2 className="bs-mark">Our Products for {d.label}</h2>
          {groups.map(g => (
            <div key={g.id} className="spd-group">
              <h3>{g.label}</h3>
              <div className="spd-grid">
                {g.items.map(p => (
                  <Link to={`/v2/products/${p.id}`} key={p.id} className="spd-card">
                    {p.logo
                      ? <div className="spd-card-logo"><img src={p.logo} alt={p.name} loading="lazy" /></div>
                      : <div className="spd-card-logo spd-card-logo-text">{p.name}</div>}
                    <span className="spd-card-name">{p.name}</span>
                    <span className="spd-card-sub">{p.subtitle}</span>
                    <span className="spd-card-more">View product →</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="spd-foot">
            <Link to="/v2/species" className="btn-outline">← All species</Link>
            <Link to="/v2/contact" className="btn-primary">Enquire About These Products</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
