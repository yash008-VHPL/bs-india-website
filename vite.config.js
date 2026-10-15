import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * BASE_PATH lets the same source build twice:
 *   production   ->  base '/'        (default)
 *   beta review  ->  base '/beta/'   (BASE_PATH=/beta/ npm run build)
 * Everything that references a file in /public resolves through
 * import.meta.env.BASE_URL, so the beta build loads ITS OWN assets.
 */
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
  // Footer copyright year, fixed at build time so the prerendered HTML and
  // the hydrated page always agree.
  define: { __BUILD_YEAR__: JSON.stringify(String(new Date().getUTCFullYear())) },
  build: {
    // The prerender reads the manifest to give each static page the CSS and
    // JS chunks of its own route, so it paints styled before any JS runs.
    manifest: true,
    outDir: process.env.OUT_DIR || 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Function form required by rolldown
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
        }
      }
    }
  }
})
