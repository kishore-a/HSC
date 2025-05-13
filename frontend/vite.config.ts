import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Proxy API requests to the backend to avoid CORS issues
  server: {
    proxy: {
      // Proxy API endpoints to FastAPI backend
      '/get-hsc': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/upload-excel': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ask': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
