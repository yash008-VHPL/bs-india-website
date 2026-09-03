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
  build: {
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
