import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ── Dev Server ──────────────────────────────────────────────────────────────
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // ── Dependency Pre-bundling ─────────────────────────────────────────────────
  // Vite pre-bundles these on first run so they're served as single ESM files,
  // eliminating hundreds of individual HTTP requests for node_modules.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'axios',
      'lucide-react',
      'react-hot-toast',
    ],
  },

  // ── Production Build ────────────────────────────────────────────────────────
  build: {
    // Target modern browsers — smaller output, faster parsing
    target: 'esnext',
    // Warn if any chunk exceeds 400 kB (helpful for keeping bundles lean)
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        // Manual chunk splitting — Firebase, React, and lucide each get their
        // own cached chunk. When you update app code, users re-download only
        // the app chunk, not the large vendor libs.
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-ui':       ['lucide-react', 'react-hot-toast', 'axios'],
        },
      },
    },
  },
});