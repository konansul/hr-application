import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- импорт

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
  },
  envDir: '../',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})