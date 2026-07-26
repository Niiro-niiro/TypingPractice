import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // '/api'로 요청을 보내면 Vite가 대리해서 성경 사이트로 요청을 보냄
      '/api': {
        target: 'https://bible.bskorea.or.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
      }
    }
  }
})