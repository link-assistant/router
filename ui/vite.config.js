import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Stable output names keep the embedded bundle reviewable in git: a rebuild
// changes the contents of `assets/app.js`, not the set of files.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/app.[ext]',
        codeSplitting: {
          groups: [
            { name: 'react', test: /\/node_modules\/(react(?:-dom)?|scheduler)\//, priority: 2 },
            { name: 'ui-vendor', test: /\/node_modules\/(@chakra-ui|@emotion|next-themes)\//, priority: 1 },
          ],
        },
      },
    },
  },
  server: {
    // `npm run dev` proxies the API to a locally running admin port.
    proxy: { '/api': 'http://127.0.0.1:8081' },
  },
})
