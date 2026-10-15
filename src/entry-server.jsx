import { StrictMode } from 'react';
import { prerender } from 'react-dom/static';
import { StaticRouter } from 'react-router';
import { Layout } from './App.jsx';
import { takeSsrHead } from './ssrHead';

/**
 * Render one route to complete static HTML. progressiveChunkSize is set to
 * the maximum so React never splits a Suspense boundary into a hidden
 * placeholder plus an inline script: crawlers that do not run JavaScript
 * must see the whole page in plain markup.
 */
export async function render(url) {
  takeSsrHead();
  const { prelude } = await prerender(
    <StrictMode><StaticRouter location={url}><Layout /></StaticRouter></StrictMode>,
    { progressiveChunkSize: Number.MAX_SAFE_INTEGER },
  );
  const dec = new TextDecoder();
  let html = '';
  for await (const c of prelude) html += typeof c === 'string' ? c : dec.decode(c, { stream: true });
  html += dec.decode();
  return { html, head: takeSsrHead() };
}

// Re-exported for the prerender script, so it uses exactly what the pages use.
export { SITE, ORG, WEBSITE, abs } from './seo';
export { formatTitle } from './usePageMeta';
export { PRODUCTS } from './data/products';
