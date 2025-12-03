import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { resolve } from 'path'

export default defineConfig({
  define: {
    __VITE_SW_SCOPE__: JSON.stringify('/')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@processors': path.resolve(__dirname, './src/processors'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  },
  plugins: [
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      // Desabilitar injeção automática - nosso pwaRegister.ts cuida disso
      injectRegister: false,
      // Desabilitar SW em desenvolvimento para evitar erros
      devOptions: {
        enabled: false
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Incluir páginas do manual no cache
        navigateFallback: '/app.html',
        navigateFallbackDenylist: [/^\/manual/, /^\/$/]
      },
      manifest: {
        name: 'MD2PDF',
        short_name: 'MD2PDF',
        description: 'Conversor Markdown para PDF - Offline First',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/app',
        lang: 'pt-BR',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 3010,
    open: '/app',
    headers: {
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache'
    },
    middlewareMode: false,
    hmr: {
      host: 'localhost',
      port: 3010
    }
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        manual: resolve(__dirname, 'manual/index.html'),
        'manual-getting-started': resolve(__dirname, 'manual/getting-started.html'),
        'manual-input-stream': resolve(__dirname, 'manual/input-stream.html'),
        'manual-render-output': resolve(__dirname, 'manual/render-output.html'),
        'manual-keyboard-shortcuts': resolve(__dirname, 'manual/keyboard-shortcuts.html'),
        'manual-print-export': resolve(__dirname, 'manual/print-export.html'),
        'manual-privacy-storage': resolve(__dirname, 'manual/privacy-storage.html'),
        'manual-offline-pwa': resolve(__dirname, 'manual/offline-pwa.html'),
      },
      output: {
        manualChunks: {
          codemirror: ['codemirror', '@codemirror/lang-markdown'],
          marked: ['marked']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
