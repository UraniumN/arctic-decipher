import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        investigation: fileURLToPath(new URL('./index.html', import.meta.url)),
        erp: fileURLToPath(new URL('./erp.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
