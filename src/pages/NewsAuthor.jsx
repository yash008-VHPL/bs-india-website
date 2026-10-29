import { useParams } from 'react-router-dom';
import './Products.css';
import './ProductDetail.css';
import './News.css';
import usePageMeta from '../usePageMeta';
import NotFound from '../components/NotFound';
import { breadcrumbs, abs, SITE } from '../seo';
import NEWS from '../generated/news-index.json';
import { PostCard } from './News';

export default function NewsAuthor() {
  const { id } = useParams();
  const a = NEWS.authors[id];
  const posts = a ? NEWS.posts.filter(p => p.authors.includes(id)) : [];
  usePageMeta(a?.name ?? null, a ? (a.role ? `${a.name}, ${a.role}, Berg+Schmidt India.` : `${a.name}, Berg+Schmidt India.`) : null, a ? {
    path: `/news/authors/${id}`,
    noindex: posts.length === 0 || posts.every(p => p.fixture),
    ogType: 'profile',
    jsonLd: [
      breadcrumbs([['Home', '/'], ['News', '/news'], [a.name, `/news/authors/${id}`]]),
      { '@type': 'ProfilePage', mainEntity: {
        '@type': 'Person', name: a.name, url: abs(`/news/authors/${id}`),
        ...(a.role ? { jobTitle: a.role } : {}),
        ...(a.bio ? { description: a.bio } : {}),
        ...(a.sameAs?.length ? { sameAs: a.sameAs } : {}),
        worksFor: { '@id': `${SITE}/#org` },
      } },
    ],
  } : {});
  if (!a) return <NotFound />;

  return (
    <main className="news-page">
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">{a.name}</h1>
        {a.role && <p>{a.role}</p>}
      </div></div>
      {a.bio && <section className="nw-author-intro"><p>{a.bio}</p></section>}
      <section className="nw-list"><div className="nw-grid">
        {posts.map(p => <PostCard key={p.slug} post={p} />)}
      </div></section>
    </main>
  );
}
