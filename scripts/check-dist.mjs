/**
 * Refuse to ship a broken static build. Run after prerender.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../dist');
const errors = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (e.name === 'beta' || e.name === '.vite' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const files = walk(DIST);
const text = files.filter(f => /\.(html|xml|txt|json)$/.test(f));

const BANNED = /Commodity|Division|Feed Supplement|poultry-supplement|dairy-supplement/i;
for (const f of text) {
  const s = fs.readFileSync(f, 'utf8');
  const rel = path.relative(DIST, f);
  if (BANNED.test(s)) errors.push(`${rel}: internal division name "${s.match(BANNED)[0]}"`);
  if (f.endsWith('.html')) {
    if (/<template id="B:|hidden id="S:/.test(s)) errors.push(`${rel}: unresolved Suspense boundary`);
    if (/<div id="root"><\/div>/.test(s)) errors.push(`${rel}: empty #root`);
    if ((s.match(/<title>/g) || []).length !== 1) errors.push(`${rel}: must have exactly one <title>`);
    if (s.includes('%VITE_')) errors.push(`${rel}: unreplaced env placeholder`);
  }
}
const src = fs.readFileSync(path.resolve(DIST, '../src/data/products.js'), 'utf8');
const nProducts = [...src.matchAll(/^\s*\{ id:'[a-z0-9-]+',.*name:/gm)].length;
const nPages = fs.readdirSync(path.join(DIST, 'products'), { withFileTypes: true }).filter(e => e.isDirectory()).length;
if (nProducts !== nPages) errors.push(`products: ${nProducts} in data, ${nPages} prerendered`);
for (const f of ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'llms.txt', 'news/feed.xml', 'staticwebapp.config.json'])
  if (!fs.existsSync(path.join(DIST, f))) errors.push(`missing ${f}`);
if (!/<main/.test(fs.readFileSync(path.join(DIST, 'index.html'), 'utf8'))) errors.push('index.html has no <main>');

if (errors.length) { console.error('\ncheck-dist FAILED:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log(`check-dist: OK (${text.length} text files, ${nPages} product pages)`);
