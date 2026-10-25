import { useEffect } from 'react';
import { SITE_NAME, abs } from './seo';
import { recordSsrHead } from './ssrHead';

/**
 * Per-page head: title, description, canonical, robots, JSON-LD.
 *
 * In the browser it updates the head on client-side navigation. During the
 * build-time prerender (import.meta.env.SSR) effects never run, so the values
 * are recorded via recordSsrHead instead and the prerender script writes them into
 * the static HTML. One call site per page, one source of truth.
 *
 * opts: { path, noindex, jsonLd: [], ogType, image }
 */

export function formatTitle(title) {
  return title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Animal Nutrition`;
}

function setTag(selector, create, attr, value) {
  let el = document.head.querySelector(selector);
  if (value == null) { el?.remove(); return; }
  if (!el) { el = create(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}

export default function usePageMeta(title, description, opts = {}) {
  if (import.meta.env.SSR) recordSsrHead({ title, description, ...opts });

  const { path, noindex } = opts;
  useEffect(() => {
    // A page that has nothing to say yet (e.g. a product page about to render
    // the 404) must not overwrite what its child set.
    if (title == null) return;
    const meta = (_attr, key) => () => Object.assign(document.createElement('meta'), { name: key });
    document.title = formatTitle(title);
    if (description) setTag('meta[name="description"]', meta('name', 'description'), 'content', description);
    setTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', path ? abs(path) : null);
    const og = (k, v) => setTag(`meta[property="og:${k}"]`, () => { const m = document.createElement('meta'); m.setAttribute('property', `og:${k}`); return m; }, 'content', v);
    og('title', title);
    og('description', description || null);
    og('url', path ? abs(path) : null);
    // A noindex build (/beta, PR staging) keeps its blanket noindex.
    if (!String(import.meta.env.VITE_ROBOTS || '').startsWith('noindex')) {
      setTag('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }), 'content', noindex ? 'noindex,follow' : 'index,follow');
    }
  }, [title, description, path, noindex]);
}
