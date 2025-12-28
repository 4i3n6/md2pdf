import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { resolve } from 'path'

const packageJson = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
)
const appVersion = typeof packageJson.version === 'string' ? packageJson.version : '0.0.0'

export default defineConfig({
  define: {
    __VITE_SW_SCOPE__: JSON.stringify('/'),
    __APP_VERSION__: JSON.stringify(appVersion)
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
        navigateFallbackDenylist: [/^\/manual/, /^\/pt\/manual/, /^\/$/]
      },
      manifest: {
        name: 'MD2PDF',
        short_name: 'MD2PDF',
        description: 'Transforme respostas de IA em PDF - Offline First',
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
    port: 3000,
    open: '/app',
    headers: {
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache'
    },
    middlewareMode: false,
    hmr: {
      host: 'localhost',
      port: 3000
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
        // EN-US (default) - 14 manual pages
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        manual: resolve(__dirname, 'manual/index.html'),
        'manual-getting-started': resolve(__dirname, 'manual/getting-started/index.html'),
        'manual-what-is-markdown': resolve(__dirname, 'manual/what-is-markdown/index.html'),
        'manual-markdown-syntax': resolve(__dirname, 'manual/markdown-syntax/index.html'),
        'manual-markdown-tables': resolve(__dirname, 'manual/markdown-tables/index.html'),
        'manual-markdown-code-blocks': resolve(__dirname, 'manual/markdown-code-blocks/index.html'),
        'manual-input-stream': resolve(__dirname, 'manual/input-stream/index.html'),
        'manual-render-output': resolve(__dirname, 'manual/render-output/index.html'),
        'manual-import-export': resolve(__dirname, 'manual/import-export/index.html'),
        'manual-keyboard-shortcuts': resolve(__dirname, 'manual/keyboard-shortcuts/index.html'),
        'manual-print-export': resolve(__dirname, 'manual/print-export/index.html'),
        'manual-privacy-storage': resolve(__dirname, 'manual/privacy-storage/index.html'),
        'manual-offline-pwa': resolve(__dirname, 'manual/offline-pwa/index.html'),
        'manual-troubleshooting': resolve(__dirname, 'manual/troubleshooting/index.html'),
        // PT-BR - 14 manual pages
        'pt-index': resolve(__dirname, 'pt/index.html'),
        'pt-app': resolve(__dirname, 'pt/app.html'),
        'pt-manual': resolve(__dirname, 'pt/manual/index.html'),
        'pt-manual-primeiros-passos': resolve(__dirname, 'pt/manual/primeiros-passos/index.html'),
        'pt-manual-o-que-e-markdown': resolve(__dirname, 'pt/manual/o-que-e-markdown/index.html'),
        'pt-manual-sintaxe-markdown': resolve(__dirname, 'pt/manual/sintaxe-markdown/index.html'),
        'pt-manual-tabelas-markdown': resolve(__dirname, 'pt/manual/tabelas-markdown/index.html'),
        'pt-manual-blocos-codigo': resolve(__dirname, 'pt/manual/blocos-codigo/index.html'),
        'pt-manual-area-edicao': resolve(__dirname, 'pt/manual/area-edicao/index.html'),
        'pt-manual-preview-saida': resolve(__dirname, 'pt/manual/preview-saida/index.html'),
        'pt-manual-importar-exportar': resolve(__dirname, 'pt/manual/importar-exportar/index.html'),
        'pt-manual-atalhos-teclado': resolve(__dirname, 'pt/manual/atalhos-teclado/index.html'),
        'pt-manual-exportar-pdf': resolve(__dirname, 'pt/manual/exportar-pdf/index.html'),
        'pt-manual-privacidade': resolve(__dirname, 'pt/manual/privacidade/index.html'),
        'pt-manual-uso-offline': resolve(__dirname, 'pt/manual/uso-offline/index.html'),
        'pt-manual-solucao-problemas': resolve(__dirname, 'pt/manual/solucao-problemas/index.html'),
      },
      output: {
        manualChunks: {
          codemirror: ['codemirror', '@codemirror/lang-markdown'],
          marked: ['marked'],
          mermaid: ['mermaid'],
          highlight: ['highlight.js'],
          dompurify: ['dompurify'],
          yaml: ['js-yaml']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
