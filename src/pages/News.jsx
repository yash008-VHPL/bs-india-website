import { Link, useSearchParams } from 'react-router-dom';
import CapIcon from '../components/CapIcon';
import posts, { SPECIES_TAGS } from 'virtual:blog';
import './News.css';
import usePageMeta from '../usePageMeta';
import { asset } from '../asset';

function ComingSoon() {
  return (
    <section className="news-body">
      <div className="news-inner">
        <div className="news-icon"><CapIcon name="news" size={40}/></div>
        <h2 className="bs-mark bs-mark--center">Coming Soon</h2>
        <p>We are just getting started in India. Our news section will be updated with product launches, technical articles, industry events, and field results.</p>
        <p>In the meantime, visit the Berg+Schmidt Animal Nutrition global site for the latest news and webinars from our international team.</p>
        <div className="news-ctas">
          <a href="https://an.berg-schmidt.com/news/" target="_blank" rel="noreferrer" className="btn-primary">Global News</a>
          <Link to="/contact" className="btn-outline">Register for Updates</Link>
        </div>
      </div>
    </section>
  );
}

export default function News() {
  usePageMeta('News', "Technical articles, field results and updates from the Berg+Schmidt India nutrition team.");
  const [params, setParams] = useSearchParams();
  const active = SPECIES_TAGS[params.get('species')] ? params.get('species') : null;
  const used = Object.keys(SPECIES_TAGS).filter(t => posts.some(p => p.species.includes(t)));
  const list = active ? posts.filter(p => p.species.includes(active)) : posts;

  return (
    <main className="news-page">
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">News & Updates</h1>
        <p>Technical articles and field results from the Berg+Schmidt India nutrition team.</p>
      </div></div>

      {posts.length === 0 ? <ComingSoon/> : (
        <section className="blog-list">
          {used.length > 1 && (
            <nav className="blog-filter" aria-label="Filter by species">
              <button type="button" className={`blog-tag${active ? '' : ' is-on'}`}
                      aria-pressed={!active} onClick={() => setParams({})}>All</button>
              {used.map(t => (
                <button type="button" key={t} className={`blog-tag${active === t ? ' is-on' : ''}`}
                        aria-pressed={active === t} onClick={() => setParams({ species: t })}>
                  {SPECIES_TAGS[t]}
                </button>
              ))}
            </nav>
          )}
          <ul className="blog-cards">
            {list.map(p => (
              <li key={p.slug} className="blog-card">
                <Link to={`/news/${p.slug}`} className="blog-card-link">
                  {p.image && <img src={asset(p.image)} alt={p.image_alt} loading="lazy" className="blog-card-img"/>}
                  <div className="blog-card-body">
                    <p className="blog-meta">
                      <time dateTime={p.date}>{p.date}</time> · {p.minutes} min read
                    </p>
                    <h3>{p.title}</h3>
                    <p className="blog-card-desc">{p.description}</p>
                    <p className="blog-byline">{p.author}</p>
                    <ul className="blog-tags">
                      {p.species.map(t => <li key={t} className="blog-tag">{SPECIES_TAGS[t]}</li>)}
                    </ul>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
