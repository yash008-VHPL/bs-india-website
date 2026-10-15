import { Link } from 'react-router-dom';
import CapIcon from '../components/CapIcon';
import './Products.css';
import './ProductDetail.css';
import './News.css';
import usePageMeta from '../usePageMeta';
import { breadcrumbs } from '../seo';
import NEWS from '../generated/news-index.json';

const LABEL = { poultry: 'Poultry', dairy: 'Dairy' };

export function PostCard({ post }) {
  return (
    <article className="nw-card">
      <div className="nw-card-meta">
        <time dateTime={post.date}>{post.date}</time>
        {post.species.map(s => <span key={s} className="stag">{LABEL[s]}</span>)}
      </div>
      <h2 className="nw-card-title"><Link to={`/news/${post.slug}`}>{post.title}</Link></h2>
      <p className="nw-card-sum">{post.summary}</p>
      <p className="nw-card-by">
        {post.authors.map(id => NEWS.authors[id].name).join(', ')} &middot; {post.readMins} min read
      </p>
    </article>
  );
}

export default function News({ species }) {
  const path = species ? `/news/${species}` : '/news';
  const posts = species ? NEWS.posts.filter(p => p.species.includes(species)) : NEWS.posts;
  const crumbs = [['Home', '/'], ['News', '/news'], ...(species ? [[LABEL[species], path]] : [])];
  usePageMeta(
    species ? `${LABEL[species]} News` : 'News',
    "News and updates from Berg+Schmidt India and the global Berg+Schmidt Animal Nutrition team.",
    { path, noindex: posts.length === 0, jsonLd: [breadcrumbs(crumbs)] },
  );
  const tabs = [['All', '/news'], ['Poultry', '/news/poultry'], ['Dairy', '/news/dairy']];

  return (
    <main className="news-page">
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">News & Updates</h1>
        <p>The latest from Berg+Schmidt India and the global Animal Nutrition team.</p>
      </div></div>

      {NEWS.posts.length > 0 && (
        <nav className="vert-tabs" aria-label="Filter by species">
          {tabs.map(([label, to]) => (
            <Link key={to} to={to} className={`vert-tab${to === path ? ' vert-tab--active' : ''}`}
                  aria-current={to === path ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>
      )}

      {posts.length > 0 ? (
        <section className="nw-list"><div className="nw-grid">
          {posts.map(p => <PostCard key={p.slug} post={p} />)}
        </div></section>
      ) : (
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
      )}
    </main>
  );
}
