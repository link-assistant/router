import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Stable output names keep the embedded bundle reviewable in git: a rebuild
// changes the contents of `assets/app.js`, not the set of files.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/app.[ext]',
        manualChunks(id) {
          if (id.includes('/node_modules/react') || id.includes('/node_modules/scheduler')) {
            return 'react'
          }
          if (
            id.includes('/node_modules/@chakra-ui') ||
            id.includes('/node_modules/@emotion') ||
            id.includes('/node_modules/next-themes')
          ) {
            return 'ui-vendor'
          }
        },
      },
    },
  },
  server: {
    // `npm run dev` proxies the API to a locally running admin port.
    proxy: { '/api': 'http://127.0.0.1:8081' },
  },
})
