import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// Allow overriding backend URL via env. Default to the backend port used by this workspace.
const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:5001'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow network access for phone scanning
    port: 3002,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/uploads': {
        target: backendUrl,
        changeOrigin: true,
        secure: false
      }
    }
  }
})
