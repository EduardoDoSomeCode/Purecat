import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command }) => ({
  root: 'src/renderer',
  // relative base so assets load from file:// inside the packaged app.asar
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
    },
  },
  build: {
    outDir: '../../renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://localhost:5173 https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; style-src 'self' 'unsafe-inline' http://localhost:5173 https://fonts.googleapis.com; img-src 'self' data: http://localhost:5173; media-src 'self' media: file: blob: data:; connect-src 'self' http://localhost:5173; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com;",
    },
  },
}))