import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/cbt/',
  build: {
    // Naikkan batas warning agar tidak spam di terminal
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Pisahkan vendor besar ke chunk terpisah
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-xlsx': ['xlsx'],
          'vendor-sweetalert': ['sweetalert2'],
        }
      }
    }
  }
})