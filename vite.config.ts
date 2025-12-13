// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: 'src/renderer',
  base: './',
  assetsInclude: ['**/*.mp4', '**/*.webm', '**/*.mkv', '**/*.mp3', '**/*.wav', '**/*.ogg'],
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },

  server: {
    port: 5173,
  },
  plugins: [
    react(),
    {
      name: 'single-page-app',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/log-viewer')) {
            req.url = '/index.html'
          }
          next()
        })
      }
    }
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
  
})