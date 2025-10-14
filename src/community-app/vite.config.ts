import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '4173-ilair62djyh3cmtl13rke-b9b802c4.sandbox.novita.ai',
      '4173-iyqwm3hj0cgb3tlwwo7v5-6532622b.e2b.dev'
    ]
  },
  preview: {
    host: true,
    allowedHosts: [
      'localhost', 
      '127.0.0.1',
      '4173-ilair62djyh3cmtl13rke-b9b802c4.sandbox.novita.ai',
      '4173-iyqwm3hj0cgb3tlwwo7v5-6532622b.e2b.dev'
    ]
  }
})