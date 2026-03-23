import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- импорт

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- вызов плагина
  ],
})