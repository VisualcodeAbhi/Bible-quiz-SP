import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // basicSsl(),
    react(),
    /* VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Telugu Bible Quiz',
        short_name: 'Bible Quiz',
        description: 'A dedicated Telugu Bible Quiz Application',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/images/Logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/images/Logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    }) */
  ],
  server: {
    host: true
  }
})
