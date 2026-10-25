/**
 * Search and answer-engine metadata shared by the browser and the prerender.
 *
 * Only facts already published on this site go in here. Address, phone, CIN
 * and social profiles are left out until the company supplies them (Imprint
 * is still pending).
 */
export const SITE = 'https://www.berg-schmidt.co.in';
export const SITE_NAME = 'Berg+Schmidt India';

export const ORG = {
  '@type': 'Organization',
  '@id': `${SITE}/#org`,
  name: 'Berg+Schmidt India Pvt. Ltd.',
  alternateName: 'Berg+Schmidt India',
  url: `${SITE}/`,
  logo: `${SITE}/favicon.png`,
  email: 'info@berg-schmidt.co.in',
  foundingDate: '2002',
  address: { '@type': 'PostalAddress', addressLocality: 'Pune', addressRegion: 'Maharashtra', addressCountry: 'IN' },
  areaServed: { '@type': 'Country', name: 'India' },
  parentOrganization: {
    '@type': 'Organization',
    name: 'Berg+Schmidt Animal Nutrition',
    url: 'https://an.berg-schmidt.com/',
    parentOrganization: { '@type': 'Organization', name: 'Stern-Wywiol Gruppe' },
  },
};

export const WEBSITE = {
  '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`,
  name: SITE_NAME, inLanguage: 'en-IN', publisher: { '@id': `${SITE}/#org` },
};

export const abs = p => SITE + (p === '/' ? '/' : p.replace(/\/$/, ''));

export function breadcrumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
      '@type': 'ListItem', position: i + 1, name, item: abs(path),
    })),
  };
}

export function articleLd(post, authors) {
  return {
    '@type': 'BlogPosting',
    '@id': `${abs('/news/' + post.slug)}#article`,
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    inLanguage: 'en-IN',
    mainEntityOfPage: abs('/news/' + post.slug),
    ...(post.image ? { image: SITE + post.image } : {}),
    author: post.authors.map(id => ({
      '@type': 'Person', name: authors[id].name,
      ...(authors[id].role ? { jobTitle: authors[id].role } : {}),
      url: abs('/news/authors/' + id),
      worksFor: { '@id': `${SITE}/#org` },
    })),
    publisher: { '@id': `${SITE}/#org` },
    about: post.species.map(s => ({ '@type': 'Thing', name: s === 'poultry' ? 'Poultry nutrition' : 'Dairy cattle nutrition' })),
  };
}

export function faqLd(faq) {
  return faq.length ? {
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  } : null;
}
