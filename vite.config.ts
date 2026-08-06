import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/bouwa-local': {
        target: 'http://127.0.0.1:4310',
        changeOrigin: false,
      },
    },
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
