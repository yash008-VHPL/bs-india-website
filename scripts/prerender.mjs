/**
 * Build-time prerender. Runs after the client build (dist/) and the SSR build
 * (dist-ssr/). For every public route it writes dist/<route>/index.html with
 * the fully rendered page, its own head, and its own CSS - then writes the
 * 404 page, sitemap.xml, the news RSS feed and llms.txt.
 *
 * Every value written to the head or to the feeds comes from the page's own
 * usePageMeta call or from an explicit field list - never from spreading a
 * product object, which carries internal keys.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const { render, SITE, ORG, WEBSITE, abs, formatTitle, PRODUCTS, SHOP_PRODUCTS } =
  await import(pathToFileURL(path.join(ROOT, 'dist-ssr/entry-server.js')).href);
const NEWS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/news.json'), 'utf8'));

const NOINDEX_BUILD = String(process.env.VITE_ROBOTS || '').startsWith('noindex');
const manifest = JSON.parse(fs.readFileSync(path.join(DIST, '.vite/manifest.json'), 'utf8'));
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

// ---------------------------------------------------------------- routes --
const PAGE = {
  '/': 'Home', '/company': 'Company', '/products': 'Products', '/species': 'Species',
  '/news': 'News', '/news/poultry': 'News', '/news/dairy': 'News',
  '/contact': 'Contact', '/shop': 'Webstore', '/imprint': 'Legal', '/privacy': 'Legal',
};
const routes = Object.keys(PAGE).map(r => [r, PAGE[r]]);
PRODUCTS.forEach(p => routes.push([`/products/${p.id}`, 'ProductDetail']));
NEWS.posts.forEach(p => routes.push([`/news/${p.slug}`, 'NewsPost']));
Object.keys(NEWS.authors).forEach(id => routes.push([`/news/authors/${id}`, 'NewsAuthor']));
// Demo storefront: staging builds only (VITE_SHOP_DEMO=1). Production keeps
// the Coming Soon page at /shop and has no store routes.
if (process.env.VITE_SHOP_DEMO === '1') {
  routes.find(r => r[0] === '/shop')[1] = 'ShopHome';
  routes.push(['/shop/cart', 'ShopCart'], ['/shop/checkout', 'ShopCheckout']);
  SHOP_PRODUCTS.forEach(p => routes.push([`/shop/${p.id}`, 'ShopProduct']));
}

// ---------------------------------------------------- per-route assets --
// Walk the manifest from a page's source file: its CSS, and every static JS
// import it pulls in (for modulepreload), excluding what index.html loads.
const entry = Object.values(manifest).find(c => c.isEntry);
const entryCss = new Set(entry.css || []);
const entryJs = new Set([entry.file, ...(entry.imports || []).map(i => manifest[i].file)]);
function assetsFor(page) {
  const key = `src/pages/${page}.jsx`;
  if (!manifest[key]) throw new Error(`No manifest entry for ${key}`);
  const css = new Set(), js = new Set(), seen = new Set();
  (function walk(k) {
    if (seen.has(k)) return; seen.add(k);
    const c = manifest[k];
    if (!c.isEntry && !entryJs.has(c.file)) js.add(c.file);
    (c.css || []).forEach(f => !entryCss.has(f) && css.add(f));
    (c.imports || []).forEach(i => manifest[i].isEntry || walk(i));
  })(key);
  return { css: [...css], js: [...js] };
}

// ------------------------------------------------------------------ head --
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ld = obj => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

function buildHead(route, head, assets) {
  const url = abs(head.path || route);
  const robots = NOINDEX_BUILD ? 'noindex,nofollow' : (head.noindex ? 'noindex,follow' : 'index,follow');
  const graph = [ORG, WEBSITE, ...(head.jsonLd || [])];
  return [
    `<title>${esc(formatTitle(head.title))}</title>`,
    head.description && `<meta name="description" content="${esc(head.description)}"/>`,
    `<meta name="robots" content="${robots}"/>`,
    `<link rel="canonical" href="${url}"/>`,
    `<meta property="og:site_name" content="Berg+Schmidt India"/>`,
    `<meta property="og:type" content="${head.ogType || 'website'}"/>`,
    `<meta property="og:title" content="${esc(head.title || 'Berg+Schmidt India')}"/>`,
    head.description && `<meta property="og:description" content="${esc(head.description)}"/>`,
    `<meta property="og:url" content="${url}"/>`,
    `<meta property="og:locale" content="en_IN"/>`,
    head.image && `<meta property="og:image" content="${SITE}${head.image}"/>`,
    `<meta name="twitter:card" content="${head.image ? 'summary_large_image' : 'summary'}"/>`,
    `<link rel="alternate" type="application/rss+xml" title="Berg+Schmidt India News" href="${SITE}/news/feed.xml"/>`,
    ...assets.css.map(f => `<link rel="stylesheet" href="/${f}"/>`),
    ...assets.js.map(f => `<link rel="modulepreload" href="/${f}"/>`),
    `<script type="application/ld+json">${ld({ '@context': 'https://schema.org', '@graph': graph })}</script>`,
  ].filter(Boolean).join('\n    ');
}

// The template's own title, description, robots and og tags are replaced,
// not duplicated.
const stripped = template
  .replace(/\s*<title>[\s\S]*?<\/title>/, '')
  .replace(/\s*<meta name="(description|robots)"[^>]*>/g, '')
  .replace(/\s*<meta property="og:[^"]+"[^>]*>/g, '');
if (!stripped.includes('<div id="root"></div>')) throw new Error('template has no empty #root');

function page(html, headTags) {
  return stripped
    .replace('</head>', `    ${headTags}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
}

function write(rel, content) {
  const f = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

// ---------------------------------------------------------------- render --
const indexable = [];
for (const [route, pageName] of routes) {
  const { html, head } = await render(route);
  if (!head) throw new Error(`${route}: page did not call usePageMeta`);
  if (/<template id="B:|hidden id="S:|\$RC/.test(html)) throw new Error(`${route}: Suspense boundary was not fully rendered`);
  if (head.title === 'Page Not Found') throw new Error(`${route}: rendered the 404 page`);
  write(route === '/' ? 'index.html' : `${route.slice(1)}/index.html`, page(html, buildHead(route, head, assetsFor(pageName))));
  if (!head.noindex) indexable.push(route);
}
{
  const { html, head } = await render('/__not-found__');
  write('404.html', page(html, buildHead('/404', { ...head, path: null }, { css: [], js: [] }))
    .replace(/\s*<link rel="canonical"[^>]*>/, '')
    .replace(/\s*<meta property="og:url"[^>]*>/, ''));
}
console.log(`prerender: ${routes.length} routes, ${indexable.length} indexable, + 404.html`);

// --------------------------------------------------------------- sitemap --
// lastmod only where a real edit date exists (posts); a build timestamp on
// every URL teaches Google to ignore lastmod altogether.
const postDate = Object.fromEntries(NEWS.posts.map(p => [`/news/${p.slug}`, p.updated || p.date]));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map(r => `  <url><loc>${abs(r)}</loc>${postDate[r] ? `<lastmod>${postDate[r]}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);

// ------------------------------------------------------------------- RSS --
const live = NEWS.posts.filter(p => !p.fixture);
const rfc822 = d => new Date(d + 'T00:00:00Z').toUTCString();
write('news/feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Berg+Schmidt India News</title>
  <link>${SITE}/news</link>
  <atom:link href="${SITE}/news/feed.xml" rel="self" type="application/rss+xml"/>
  <description>News and updates from Berg+Schmidt India and the global Berg+Schmidt Animal Nutrition team.</description>
  <language>en-IN</language>
${live.map(p => `  <item>
    <title>${esc(p.title)}</title>
    <link>${abs('/news/' + p.slug)}</link>
    <guid isPermaLink="true">${abs('/news/' + p.slug)}</guid>
    <pubDate>${rfc822(p.date)}</pubDate>
    <description>${esc(p.summary)}</description>
  </item>`).join('\n')}
</channel>
</rss>
`);

// -------------------------------------------------------------- llms.txt --
// Plain index for answer engines. Explicit fields only.
const listed = PRODUCTS.filter(p => indexable.includes(`/products/${p.id}`));
const bySpecies = s => listed.filter(p => p.species.includes(s))
  .map(p => `- [${p.name}](${abs('/products/' + p.id)}): ${p.subtitle}`).join('\n');
write('llms.txt', `# Berg+Schmidt India

> ${ORG.name}, Pune - animal nutrition for India's poultry and dairy producers. A subsidiary of Berg+Schmidt Animal Nutrition, part of the Stern-Wywiol Gruppe. In India since 2002.

## Company
- [About Us](${abs('/company')})
- [Species](${abs('/species')})
- [Contact](${abs('/contact')})

## Poultry products
${bySpecies('poultry')}

## Dairy products
${bySpecies('dairy')}
${live.length ? `
## Technical articles
${live.map(p => `- [${p.title}](${abs('/news/' + p.slug)}): ${p.summary}`).join('\n')}
` : ''}`);

// The manifest was only needed here; do not publish it.
fs.rmSync(path.join(DIST, '.vite'), { recursive: true, force: true });
