import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.jsx'

// Prerendered pages arrive with markup in #root and are hydrated. A build
// without the prerender step (e.g. the /beta copy) arrives empty and is
// client-rendered as before.
const el = document.getElementById('root');
const tree = <StrictMode><App/></StrictMode>;
if (el.hasChildNodes()) hydrateRoot(el, tree);
else createRoot(el).render(tree);
try { sessionStorage.removeItem('bs-chunk-reload'); } catch { /* ignore */ }
