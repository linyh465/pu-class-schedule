import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 本地開發時把 /api 轉發到後端 (npm start in ../server)
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
