import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Served from https://hemosoo.github.io/hemosite/, so assets need that prefix.
// When a custom domain is attached, change this to '/'.
export default defineConfig({
  base: '/hemosite/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
