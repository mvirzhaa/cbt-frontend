import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Pastikan ini di-import

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Pastikan ini dipanggil di sini
  ],
})