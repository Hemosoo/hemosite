import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Served from https://hemosoo.com/, the apex, so assets live at the root.
// public/CNAME is what tells Pages the domain; the two have to agree or every
// asset 404s under a path prefix that is no longer there.
//
// The site is at /. Three redesign alternatives are built alongside it at
// /a/, /b/ and /c/, each its own HTML entry (plain directories on Pages, no
// router), so they can be compared without touching the site.
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: page('./index.html'),
        a: page('./a/index.html'),
        b: page('./b/index.html'),
        c: page('./c/index.html'),
      },
    },
  },
})
