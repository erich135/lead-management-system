import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'Favicon.png',
        'Logo.png',
        'icon-192.png',
        'icon-512.png',
        'icon-192-maskable.png',
        'icon-512-maskable.png',
        'apple-touch-icon.png',
      ],
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/ICONS_README.md', '**/location-tracking-sw.js', '**/sw.mjs'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: {
        // Serves custom SW at /dev-sw.js?dev-sw during `vite` (injectManifest).
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    // Allow access via LAN IP (e.g. http://192.168.0.251:5173) as well as localhost.
    host: true,
    port: 5173,
    // Same-origin proxy so LAN devices never call localhost:5000 from the browser.
    // Cookies (SameSite=Lax) and JWT both work on localhost and 192.168.0.251.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    host: true,
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Enable source maps for production debugging (optional, can disable for smaller builds)
    sourcemap: false,

    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core libraries (loaded on every page)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Map libraries (lazy load these)
          'leaflet-vendor': ['leaflet', 'react-leaflet'],

          // PDF generation libraries (only needed for reports)
          'pdf-vendor': ['jspdf', 'jspdf-autotable'],

          // Excel library (only needed for imports/exports)
          'xlsx-vendor': ['xlsx'],

          // Socket.io for real-time features
          'socket-vendor': ['socket.io-client'],

          // Emoji picker
          'emoji-vendor': ['emoji-picker-react'],

          // Icons library
          'icons-vendor': ['lucide-react'],
        },

        // Generate meaningful filenames for chunks
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // Minification settings - use esbuild (faster than terser)
    minify: 'esbuild',
  },

  // CSS code splitting
  css: {
    devSourcemap: false,
  },
});
