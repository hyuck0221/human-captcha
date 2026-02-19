import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  build: {
    outDir: '../src/main/resources/static',
    emptyOutDir: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/ws-captcha': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
