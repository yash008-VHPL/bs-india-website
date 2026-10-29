import { useParams, Link } from 'react-router-dom';
import './Products.css';
import './ProductDetail.css';
import './News.css';
import usePageMeta from '../usePageMeta';
import NotFound from '../components/NotFound';
import { breadcrumbs, articleLd, faqLd } from '../seo';
import { PRODUCTS } from '../data/products';
import NEWS from '../generated/news.json';

export default function NewsPost() {
  const { slug } = useParams();
  const post = NEWS.posts.find(p => p.slug === slug);
  const A = NEWS.authors;
  usePageMeta(post?.title ?? null, post?.summary ?? null, post ? {
    path: `/news/${post.slug}`,
    noindex: post.fixture,
    ogType: 'article',
    image: post.image,
    jsonLd: [
      breadcrumbs([['Home', '/'], ['News', '/news'], [post.title, `/news/${post.slug}`]]),
      articleLd(post, A),
      faqLd(post.faq),
    ].filter(Boolean),
  } : {});
  if (!post) return <NotFound />;
  const products = post.products.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);

  return (
    <main className="nw-post">
      <div className="pd-bread"><div className="pd-bread-inner">
        <Link to="/">Home</Link><span>›</span><Link to="/news">News</Link><span>›</span><span>{post.title}</span>
      </div></div>

      <article className="nw-article">
        <header className="nw-head">
          <div className="nw-card-meta">
            {post.species.map(s => <Link key={s} to={`/news/${s}`} className="stag">{s === 'poultry' ? 'Poultry' : 'Dairy'}</Link>)}
          </div>
          <h1 className="bs-mark">{post.title}</h1>
          <p className="nw-sum">{post.summary}</p>
          <p className="nw-byline">
            {post.authors.map((id, i) => <span key={id}>{i > 0 && ', '}<Link to={`/news/authors/${id}`}>{A[id].name}</Link></span>)}
            {' '}&middot; <time dateTime={post.date}>{post.date}</time>
            {post.updated && <> &middot; Updated <time dateTime={post.updated}>{post.updated}</time></>}
            {' '}&middot; {post.readMins} min read
          </p>
        </header>

        {post.image && <img className="nw-cover" src={post.image} alt="" />}

        {post.takeaways.length > 0 && (
          <aside className="nw-takeaways" aria-label="Key takeaways">
            <h2>Key Takeaways</h2>
            <ul>{post.takeaways.map((t, i) => <li key={i}><span className="ben-dot" />{t}</li>)}</ul>
          </aside>
        )}

        <div className="nw-body" dangerouslySetInnerHTML={{ __html: post.html }} />

        {post.faq.length > 0 && (
          <section className="nw-faq">
            <h2>Frequently Asked Questions</h2>
            {post.faq.map((f, i) => (
              <div key={i} className="nw-faq-item"><h3>{f.q}</h3><p>{f.a}</p></div>
            ))}
          </section>
        )}

        {products.length > 0 && (
          <section className="nw-products">
            <h2>Products in This Article</h2>
            <div className="nw-prod-grid">
              {products.map(p => (
                <Link key={p.id} to={`/products/${p.id}`} className="nw-prod">
                  <span className="pd-sp-name">{p.name}</span>
                  <span className="pd-sp-sub">{p.subtitle}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <footer className="nw-authors">
          {post.authors.map(id => (
            <div key={id} className="nw-author">
              <p className="pd-sp-name"><Link to={`/news/authors/${id}`}>{A[id].name}</Link></p>
              {A[id].role && <p className="pd-sp-sub">{A[id].role}</p>}
              {A[id].bio && <p className="nw-author-bio">{A[id].bio}</p>}
            </div>
          ))}
          <div className="pd-cta">
            <Link to="/contact" className="btn-primary">Talk to Our Technical Team</Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
