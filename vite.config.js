import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build'

  return {
    plugins: [
      react(),
      ...(isBuild
        ? [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
              manifest: {
                name: 'StudyBuddy',
                short_name: 'StudyBuddy',
                description: 'Smart student planner for class and study timetables',
                theme_color: '#2563eb',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                scope: '/',
                lang: 'en',
                categories: ['education', 'productivity'],
                icons: [
                  {
                    src: 'pwa-192x192.svg',
                    sizes: '192x192',
                    type: 'image/svg+xml',
                    purpose: 'any maskable'
                  },
                  {
                    src: 'pwa-512x512.svg',
                    sizes: '512x512',
                    type: 'image/svg+xml',
                    purpose: 'any maskable'
                  }
                ]
              },
              workbox: {
                navigateFallback: '/',
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                  {
                    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'google-fonts-cache',
                      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                      cacheableResponse: { statuses: [0, 200] }
                    }
                  },
                  {
                    urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'gstatic-fonts-cache',
                      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                      cacheableResponse: { statuses: [0, 200] }
                    }
                  },
                  {
                    urlPattern: /^https:\/\/www\.gstatic\.com\/firebasejs\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'firebase-cache',
                      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
                      cacheableResponse: { statuses: [0, 200] }
                    }
                  }
                ]
              },
              devOptions: { enabled: false, navigateFallback: '/' },
              injectRegister: null
            })
          ]
        : [])
    ],
    // Fix for recharts loading issue
    optimizeDeps: {
      include: ['recharts'],
      esbuildOptions: {
        // Ensure Node modules are handled correctly
        define: {
          global: 'globalThis'
        }
      }
    },
    server: {
      port: 5173,
      host: true,
      hmr: { overlay: true }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'firebase-auth': ['firebase/auth'],
            'firebase-firestore': ['firebase/firestore'],
            'firebase-analytics': ['firebase/analytics'],
            'firebase-messaging': ['firebase/messaging'],
            'recharts': ['recharts']
          }
        }
      },
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    }
  }
})

