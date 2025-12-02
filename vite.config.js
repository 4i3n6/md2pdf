import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
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
          'codemirror': ['codemirror', '@codemirror/lang-markdown'],
          'marked': ['marked']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['codemirror', '@codemirror/lang-markdown', 'marked']
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon.svg'],
      manifest: {
        name: 'MD2PDF - Markdown to PDF Converter',
        short_name: 'MD2PDF',
        description: 'Conversor profissional de Markdown para PDF. 100% gratuito e sem limites.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
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
          },
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    }),
    {
      name: 'copy-cloudflare-files',
      closeBundle() {
        // Copiar arquivos de configuração do Cloudflare para dist
        try {
          copyFileSync(resolve(__dirname, '_headers'), resolve(__dirname, 'dist/_headers'));
          copyFileSync(resolve(__dirname, '_redirects'), resolve(__dirname, 'dist/_redirects'));
          console.log('✓ Arquivos Cloudflare copiados');
        } catch (e) {
          console.warn('⚠ Erro ao copiar arquivos Cloudflare:', e.message);
        }
      }
    }
  ]
});
