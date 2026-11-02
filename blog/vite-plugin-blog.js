/*
 * Blog build step.
 *
 * Reads content/blog/*.md at BUILD time and exposes only the articles that are
 * (a) status: approved and (b) dated today or earlier, India time. Drafts and
 * future-dated articles are never bundled, so they cannot leak through the
 * shipped JavaScript. A scheduled daily rebuild (see the deploy workflow)
 * makes a future-dated approved article go live on its date.
 *
 * Any rule broken here FAILS the build: a red deploy is better than a live
 * article with a wrong brand spelling or a missing byline.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const VIRTUAL_ID = 'virtual:blog';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const SITE = 'https://www.berg-schmidt.co.in';

// Species tags, from the operating proposal's SEO plan (slide 11).
export const SPECIES_TAGS = {
  'broilers':   'Broilers',
  'layers':     'Layers',
  'dairy-cows': 'Dairy cows',
  'buffalo':    'Buffalo',
};

const REQUIRED = ['title', 'slug', 'date', 'author', 'description', 'species', 'status'];
const STATUSES = ['draft', 'approved'];

// Brand rules (chairman): Berg+Schmidt with no spaces; no em dashes.
const BRAND_RULES = [
  { re: /Berg\s*\+\s+Schmidt|Berg\s+\+\s*Schmidt|Berg\s*&\s*Schmidt|Berg\s+Schmidt|Berg-Schmidt(?![\w.-]*\.(?:co|com|in)\b)/gi,
    msg: 'write "Berg+Schmidt" with no spaces' },
  { re: /\u2014/g, msg: 'em dash found; use a normal dash' },
];
// Allow-list sanitising of the rendered HTML. Links: https, mailto, or
// site-relative only. No scripts, iframes, styles, forms or meta tags.
const SANITIZE = {
  allowedTags: ['h2', 'h3', 'h4', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i',
    'blockquote', 'code', 'pre', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub'],
  allowedAttributes: { a: ['href', 'title', 'rel', 'target'], img: ['src', 'alt', 'title', 'width', 'height'], th: ['align'], td: ['align'] },
  allowedSchemes: ['https', 'mailto'],
  allowedSchemesByTag: { img: ['https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tag, attribs) => (/^https:/i.test(attribs.href || '')
      ? { tagName: 'a', attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' } }
      : { tagName: 'a', attribs }),
  },
};

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

function splitFrontmatter(src, file) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
  if (!m) throw new Error(`${file}: missing front matter block (--- ... ---)`);
  return { data: parseYaml(m[1]) || {}, body: m[2] };
}

function checkText(text, file, where) {
  const errs = [];
  for (const { re, msg } of BRAND_RULES) {
    re.lastIndex = 0;
    if (re.test(text)) errs.push(`${file} (${where}): ${msg}`);
  }
  return errs;
}

export function loadPosts(dir, { today = todayIST(), includeAll = false } = {}) {
  if (!fs.existsSync(dir)) return { posts: [], errors: [] };
  const errors = [];
  const posts = [];
  const slugs = new Map();
  const marked = new Marked({ gfm: true });

  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.md') || name.startsWith('_')) continue;
    const file = path.join('content/blog', name);
    let data, body;
    try { ({ data, body } = splitFrontmatter(fs.readFileSync(path.join(dir, name), 'utf8'), file)); }
    catch (e) { errors.push(e.message); continue; }

    for (const k of REQUIRED) if (data[k] === undefined || data[k] === '' || data[k] === null)
      errors.push(`${file}: missing "${k}"`);
    if (data.status && !STATUSES.includes(data.status))
      errors.push(`${file}: status must be one of ${STATUSES.join(', ')}`);
    // YAML may parse an unquoted date into a Date object.
    const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`${file}: date must be YYYY-MM-DD`);
    if (data.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))
      errors.push(`${file}: slug must be lower-case words joined by hyphens`);
    if (data.slug) {
      if (slugs.has(data.slug)) errors.push(`${file}: slug "${data.slug}" also used by ${slugs.get(data.slug)}`);
      slugs.set(data.slug, file);
    }
    const species = Array.isArray(data.species) ? data.species : (data.species ? [data.species] : []);
    for (const s of species) if (!SPECIES_TAGS[s])
      errors.push(`${file}: unknown species "${s}" (allowed: ${Object.keys(SPECIES_TAGS).join(', ')})`);
    if (data.image && !/^\/[\w/.-]+\.(?:jpe?g|png|webp)$/.test(data.image))
      errors.push(`${file}: image must be a site path such as /blog-images/name.jpg`);
    if (data.image && !data.image_alt) errors.push(`${file}: image needs image_alt`);
    // Content rules fail the build for approved articles only. A draft that
    // breaks them is reported but cannot turn every deploy red.
    const content = [];
    for (const k of ['title', 'description', 'author', 'author_role', 'image_alt'])
      if (data[k]) content.push(...checkText(String(data[k]), file, k));
    content.push(...checkText(body, file, 'body'));
    if (data.status === 'approved') errors.push(...content);
    else for (const w of content) console.warn(`[blog] draft: ${w}`);

    const live = data.status === 'approved' && date <= today;
    if (!live && !includeAll) continue;

    const words = body.split(/\s+/).filter(Boolean).length;
    posts.push({
      slug: data.slug,
      title: String(data.title),
      date,
      updated: data.updated ? String(data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : data.updated) : null,
      author: String(data.author),
      author_role: data.author_role ? String(data.author_role) : null,
      description: String(data.description),
      species,
      image: data.image || null,
      image_alt: data.image_alt || null,
      minutes: Math.max(1, Math.round(words / 200)),
      html: sanitizeHtml(marked.parse(body), SANITIZE),
      status: data.status,
    });
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
  return { posts, errors };
}

/** Production sitemap: the static list, de-duplicated, plus every live article. */
function buildSitemap(staticXml, posts) {
  const locs = [...staticXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  const seen = new Set();
  const rows = [];
  for (const l of locs) if (!seen.has(l)) { seen.add(l); rows.push(`  <url><loc>${l}</loc></url>`); }
  for (const p of posts) {
    const l = `${SITE}/news/${p.slug}`;
    if (!seen.has(l)) { seen.add(l); rows.push(`  <url><loc>${l}</loc><lastmod>${p.updated || p.date}</lastmod></url>`); }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

export default function blogPlugin() {
  let root, outDir, base, posts = [];
  return {
    name: 'bsi-blog',
    configResolved(c) { root = c.root; outDir = path.resolve(c.root, c.build.outDir); base = c.base; },
    buildStart() {
      const dir = path.join(root, 'content/blog');
      const res = loadPosts(dir);
      if (res.errors.length) this.error('Blog content errors:\n  ' + res.errors.join('\n  '));
      posts = res.posts;
      if (fs.existsSync(dir)) this.addWatchFile(dir);
    },
    resolveId(id) { return id === VIRTUAL_ID ? RESOLVED_ID : null; },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const out = posts.map(({ status, ...p }) => p); // eslint-disable-line no-unused-vars
      return `export const SPECIES_TAGS = ${JSON.stringify(SPECIES_TAGS)};\nexport default ${JSON.stringify(out)};`;
    },
    writeBundle() {
      // Only the production build (base '/') publishes a sitemap for search.
      if (base !== '/') return;
      const src = path.join(root, 'public/sitemap.xml');
      if (!fs.existsSync(src)) return;
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), buildSitemap(fs.readFileSync(src, 'utf8'), posts));
    },
  };
}
