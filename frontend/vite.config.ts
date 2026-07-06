import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: '/', // 루트 경로에서 SPA 서빙
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
    // API 프록시 → 백엔드 서버
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3005',
        ws: true,
      },
    },
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
    outDir: '../community',  // Express에서 서빙하는 디렉터리로 빌드
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react'
            if (id.includes('@heroicons') || id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('@radix-ui') || id.includes('cmdk')) return 'vendor-ui'
            if (id.includes('@tanstack') || id.includes('axios')) return 'vendor-query'
            if (id.includes('html2canvas')) return 'vendor-html2canvas'
            if (id.includes('jspdf')) return 'vendor-jspdf'
            return 'vendor-misc'
          }
          if (id.includes('/src/pages/RecordsPage') || id.includes('/src/components/record-insights') || id.includes('/src/components/records')) return 'page-records'
          if (id.includes('/src/pages/CompetitionsPage') || id.includes('/src/components/competitions') || id.includes('/src/api/competitions')) return 'page-competitions'
          if (id.includes('/src/pages/CommunityPage') || id.includes('/src/components/community') || id.includes('/src/components/post')) return 'page-community'
          if (id.includes('/src/pages/admin')) return 'page-admin'
          if (id.includes('/src/pages/PaceCalculatorPage') || id.includes('/src/pages/TrainingCalculatorPage') || id.includes('/src/pages/PaceRisePage') || id.includes('/src/pages/ChatPage')) return 'page-tools'
          if (id.includes('/src/pages/Marketplace')) return 'page-marketplace'
        },
      },
    },
  }
})
