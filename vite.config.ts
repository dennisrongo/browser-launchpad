import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { rmSync } from 'fs'

// Assets that live in public/ for the README and store listing, but must not
// ship inside the packaged extension.
const NON_SHIPPING_DIST_ASSETS = ['screenshots', 'icon.svg', 'icon.png']

function stripNonShippingAssets() {
  return {
    name: 'strip-non-shipping-assets',
    closeBundle() {
      for (const asset of NON_SHIPPING_DIST_ASSETS) {
        rmSync(resolve(__dirname, 'dist', asset), { recursive: true, force: true })
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), stripNonShippingAssets()],
  build: {
    outDir: 'dist',
    // Optimize chunk size for faster loading
    chunkSizeWarningLimit: 600,
    // Use esbuild for fast minification (built-in to Vite)
    minify: 'esbuild',
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, 'newtab.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        // Manual chunk splitting for better caching
        manualChunks: undefined,
      }
    },
    // Generate source maps for production debugging
    sourcemap: false,
  },
  server: {
    host: 'localhost',
    port: 8080,
    strictPort: false
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
