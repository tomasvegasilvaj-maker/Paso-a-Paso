import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // En GitHub Pages la app vive en /Paso-a-Paso/ (lo activa el workflow de publicación).
  base: process.env.GITHUB_PAGES ? '/Paso-a-Paso/' : '/',
  plugins: [
    react(),
    VitePWA({
      // La PWA se actualiza sola al abrirla (doc 01).
      registerType: 'autoUpdate',
      includeAssets: ['icons/tito-icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Paso a Paso',
        short_name: 'Paso a Paso',
        description: 'Sumá puntos, cuidá tu fuego.',
        lang: 'es-AR',
        // start_url y scope salen de `base`, así sirve igual en localhost y en GitHub Pages.
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0b0c',
        theme_color: '#0b0b0c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // La cara llena el cuadrado y el borde es fondo amarillo, así que sirve como maskable.
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Recibe los avisos push y abre la app al tocarlos (public/push-sw.js).
        importScripts: ['push-sw.js'],
      },
      // Service worker también en `npm run dev`, para poder probar los avisos en la compu.
      devOptions: { enabled: true },
    }),
  ],
})
