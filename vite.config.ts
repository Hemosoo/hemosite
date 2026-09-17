import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://hemosoo.github.io/hemosite/, so assets need that prefix.
// When a custom domain is attached, change this to '/'.
// Asset URLs in components read import.meta.env.BASE_URL, so this is the only
// place that needs to change.
export default defineConfig({
  base: '/hemosite/',
  plugins: [react()],
})
