import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SPECIES } from '../data/products';
import { SPECIES_DETAIL } from '../data/species';
import './Species.css';

export default function Species() {
  const loc = useLocation();
  // Honour /v2/species#poultry style deep links from the home page
  useEffect(() => {
    if (!loc.hash) return;
    const el = document.getElementById(loc.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [loc]);

  return (
    <main className="sp-page">
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">Species</h1>
        <p>Tailored nutritional solutions for India's poultry and dairy producers.</p>
      </div></div>

      {SPECIES.map(({ id }, i) => {
        const d = SPECIES_DETAIL[id];
        return (
          <section key={id} id={id} className={`sp-sec${i % 2 ? ' sp-sec-alt' : ''}`}>
            <div className="sp-inner">
              <Link to={`/v2/species/${id}`} className="sp-img" aria-label={`${d.label} — view products`}>
                <img src={d.img} alt={d.label} loading="lazy" />
              </Link>
              <div className="sp-content">
                <span className="sp-eyebrow">{d.label}</span>
                <h2 className="bs-mark">{d.headline}</h2>
                <p className="sp-intro">{d.intro}</p>
                <h3>Key Challenges We Address</h3>
                <ul className="ch-list">
                  {d.ch.map((c, n) => <li key={n}><span className="ch-dot" />{c}</li>)}
                </ul>
                <Link to={`/v2/species/${id}`} className="sp-cta">
                  View {d.label} products <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>
        );
      })}
    </main>
  );
}
