import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

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
      injectRegister: 'script-defer',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      manifest: {
        name: 'MD2PDF',
        short_name: 'MD2PDF',
        description: 'Conversor Markdown para PDF - Offline First',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
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
    open: true,
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
