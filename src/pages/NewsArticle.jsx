import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import posts, { SPECIES_TAGS } from 'virtual:blog';
import './News.css';
import usePageMeta from '../usePageMeta';
import { asset } from '../asset';

const SITE = 'https://www.berg-schmidt.co.in';

/** BlogPosting structured data, so search engines can read author and date. */
function useArticleSchema(p) {
  useEffect(() => {
    if (!p) return undefined;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.dataset.blog = p.slug;
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      dateModified: p.updated || p.date,
      author: { '@type': 'Person', name: p.author, ...(p.author_role ? { jobTitle: p.author_role } : {}) },
      publisher: { '@type': 'Organization', name: 'Berg+Schmidt India Pvt. Ltd.', url: SITE },
      mainEntityOfPage: `${SITE}/news/${p.slug}`,
      ...(p.image ? { image: SITE + p.image } : {}),
    });
    document.head.appendChild(el);
    return () => el.remove();
  }, [p]);
}

export default function NewsArticle() {
  const { slug } = useParams();
  const p = posts.find(x => x.slug === slug);
  usePageMeta(p ? p.title : 'Article Not Found', p ? p.description : 'That article does not exist on berg-schmidt.co.in.');
  useArticleSchema(p);

  if (!p) {
    return (
      <main className="news-page">
        <div className="pg-hero"><div className="pg-hero-inner">
          <h1 className="bs-mark">Article Not Found</h1>
          <p>That article does not exist, or is not published yet.</p>
        </div></div>
        <div className="article-inner">
          <Link to="/news" className="btn-outline">All articles</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="news-page">
      <article>
        <div className="pg-hero"><div className="pg-hero-inner article-head">
          <p className="blog-meta"><Link to="/news">News</Link> · <time dateTime={p.date}>{p.date}</time> · {p.minutes} min read</p>
          <h1 className="bs-mark">{p.title}</h1>
          <p className="blog-byline">By {p.author}{p.author_role ? `, ${p.author_role}` : ''}</p>
          <ul className="blog-tags">
            {p.species.map(t => (
              <li key={t}><Link className="blog-tag" to={`/news?species=${t}`}>{SPECIES_TAGS[t]}</Link></li>
            ))}
          </ul>
        </div></div>
        <div className="article-inner">
          {p.image && <img src={asset(p.image)} alt={p.image_alt} className="article-img"/>}
          <div className="article-body" dangerouslySetInnerHTML={{ __html: p.html }}/>
          {p.updated && <p className="blog-meta">Updated <time dateTime={p.updated}>{p.updated}</time></p>}
          <div className="article-cta">
            <Link to="/contact" className="btn-primary">Ask our nutritionists</Link>
            <Link to="/news" className="btn-outline">All articles</Link>
          </div>
        </div>
      </article>
    </main>
  );
}
