import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Served from https://hemosoo.com/, the apex, so assets live at the root.
// public/CNAME is what tells Pages the domain; the two have to agree or every
// asset 404s under a path prefix that is no longer there.
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
