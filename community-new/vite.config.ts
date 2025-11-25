import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/community/', // Netlify /community/ 경로 배포
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
  },
  // Netlify 배포 최적화
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@heroicons/react', 'clsx', 'tailwind-merge'],
          query: ['@tanstack/react-query', 'axios'],
        },
      },
    },
  }
})