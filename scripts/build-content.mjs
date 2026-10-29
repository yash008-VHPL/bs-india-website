/**
 * News content pipeline. Runs in Node before `vite build`.
 *
 * content/news/*.md  (frontmatter + Markdown)  ->  src/generated/news.json
 *
 * gray-matter and marked run here only, so neither ships to the browser.
 * Fails the build on anything that would publish a broken or unsafe page.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

const ROOT = path.resolve(import.meta.dirname, '..');
const NEWS = path.join(ROOT, 'content/news');
const OUT = path.join(ROOT, 'src/generated');
const withFixtures = process.env.INCLUDE_FIXTURES === '1';

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const authors = {
  ...readJson(path.join(ROOT, 'content/authors.json')),
  ...(withFixtures ? readJson(path.join(NEWS, '_fixtures/authors.json')) : {}),
};
const productsSrc = fs.readFileSync(path.join(ROOT, 'src/data/products.js'), 'utf8');
const productIds = new Set([...productsSrc.matchAll(/\bid:'([a-z0-9-]+)'/g)].map(m => m[1]));
const SPECIES = new Set(['poultry', 'dairy']);
const RESERVED = new Set(['poultry', 'dairy', 'authors', 'feed']);
const BANNED = /Commodity|Division|Feed Supplement|poultry-supplement|dairy-supplement/i;

const errors = [];
const fail = (f, msg) => errors.push(`${f}: ${msg}`);
const iso = v => v instanceof Date ? v.toISOString().slice(0, 10) : (v == null ? null : String(v));
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

// Headings get stable ids so FAQ answers and sections can be deep-linked.
const slugify = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const renderer = new marked.Renderer();
renderer.heading = function ({ tokens, depth }) {
  const text = this.parser.parseInline(tokens);
  return `<h${depth} id="${slugify(text)}">${text}</h${depth}>\n`;
};
renderer.image = ({ href, title, text }) =>
  `<figure><img src="${href}" alt="${text}" loading="lazy" decoding="async"/>` +
  (title ? `<figcaption>${title}</figcaption>` : '') + `</figure>`;
renderer.table = function (token) {
  return `<div class="nw-table">${marked.Renderer.prototype.table.call(this, token)}</div>`;
};
marked.use({ renderer, gfm: true });

const files = [];
const collect = dir => fs.existsSync(dir) && fs.readdirSync(dir)
  .filter(f => f.endsWith('.md') && f !== 'README.md').forEach(f => files.push(path.join(dir, f)));
collect(NEWS);
if (withFixtures) collect(path.join(NEWS, '_fixtures'));

const posts = [];
const seen = new Set();
for (const file of files) {
  const rel = path.relative(ROOT, file);
  const m = path.basename(file).match(/^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.md$/);
  if (!m) { fail(rel, 'filename must be YYYY-MM-DD-slug.md (lowercase, hyphens)'); continue; }
  const slug = m[2];
  const { data: d, content } = matter(fs.readFileSync(file, 'utf8'));
  if (d.draft === true) continue;

  const date = iso(d.date) || m[1];
  const updated = iso(d.updated);
  if (!ISO_RE.test(date)) fail(rel, `date "${date}" is not YYYY-MM-DD`);
  if (updated && !ISO_RE.test(updated)) fail(rel, `updated "${updated}" is not YYYY-MM-DD`);
  if (RESERVED.has(slug)) fail(rel, `slug "${slug}" is reserved`);
  if (seen.has(slug)) fail(rel, `duplicate slug "${slug}"`);
  seen.add(slug);
  if (!d.title) fail(rel, 'title is required');
  if (!d.summary) fail(rel, 'summary is required (used as meta description)');
  else if (d.summary.length > 170) fail(rel, `summary is ${d.summary.length} chars; keep to 160`);

  const a = d.authors || [];
  if (!a.length) fail(rel, 'at least one author id is required');
  a.forEach(id => { if (!authors[id]) fail(rel, `author "${id}" is not in content/authors.json`); });
  const species = d.species || [];
  species.forEach(s => { if (!SPECIES.has(s)) fail(rel, `species "${s}" must be poultry or dairy`); });
  const products = d.products || [];
  products.forEach(p => { if (!productIds.has(p)) fail(rel, `product "${p}" is not in src/data/products.js`); });
  const faq = (d.faq || []).map(x => ({ q: String(x.q), a: String(x.a) }));
  const takeaways = (d.takeaways || []).map(String);

  const html = marked.parse(content);
  const words = content.split(/\s+/).filter(Boolean).length;
  const all = [d.title, d.summary, html, ...faq.flatMap(x => [x.q, x.a]), ...takeaways].join(' ');
  if (BANNED.test(all)) fail(rel, `contains an internal division name (${all.match(BANNED)[0]})`);
  if (/—/.test(all)) fail(rel, 'contains an em dash; brand rule is normal dashes');

  posts.push({
    slug, title: d.title, summary: d.summary, date, updated,
    authors: a, species, products, faq, takeaways,
    image: d.image || null, readMins: Math.max(1, Math.round(words / 200)), html,
    fixture: file.includes('_fixtures'),
  });
}

if (errors.length) {
  console.error('\nNews content errors:\n  ' + errors.join('\n  ') + '\n');
  process.exit(1);
}
posts.sort((x, y) => (y.date.localeCompare(x.date)) || x.slug.localeCompare(y.slug));
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'news.json'), JSON.stringify({ posts, authors }, null, 1));
// Light index (no article bodies) for listing pages and product cross-links,
// so the full text only loads with the article page itself.
fs.writeFileSync(path.join(OUT, 'news-index.json'),
  JSON.stringify({ posts: posts.map(({ html, faq, ...p }) => p), authors }, null, 1));
console.log(`news: ${posts.length} post(s)${withFixtures ? ' (fixtures included)' : ''}`);
