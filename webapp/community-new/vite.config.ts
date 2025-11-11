import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path using relative path for safer deployment
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // 와일드카드로 모든 서브도메인 허용
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.sandbox.novita.ai',
      '.e2b.dev',
    ],
    // HMR 설정
    hmr: {
      overlay: false
    }
  },
  // 프리뷰 서버 설정
  preview: {
    host: '0.0.0.0',
    port: 5173,
    // 와일드카드로 모든 서브도메인 허용
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.sandbox.novita.ai',
      '.e2b.dev',
    ],
  }
})