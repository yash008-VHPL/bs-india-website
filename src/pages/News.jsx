import { Link } from 'react-router-dom';
import Accent from '../components/Accent';
import './News.css';
export default function News() {
  return (
    <main className="news-page">
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1><Accent/>News & Updates</h1>
        <p>The latest from Berg + Schmidt India and the global Animal Nutrition division.</p>
      </div></div>
      <section className="news-body">
        <div className="news-inner">
          <div className="news-icon">📰</div>
          <h2><Accent/>Coming Soon</h2>
          <p>We are just getting started in India. Our news section will be updated with product launches, technical articles, industry events, and field results.</p>
          <p>In the meantime, visit the Berg + Schmidt Animal Nutrition global site for the latest news and webinars from our international team.</p>
          <div className="news-ctas">
            <a href="https://an.berg-schmidt.com/news/" target="_blank" rel="noreferrer" className="btn-primary">Global News →</a>
            <Link to="/contact" className="btn-outline">Register for Updates</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
