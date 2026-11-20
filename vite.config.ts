import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Served from https://hemosoo.com/, the apex, so assets live at the root.
// public/CNAME is what tells Pages the domain; the two have to agree or every
// asset 404s under a path prefix that is no longer there.
//
// Several pages, one build: the site at /, three design alternatives at /v1/,
// /v2/ and /v3/, and /compare/ to look at them side by side. Each is its own
// HTML entry, so GitHub Pages serves them as plain directories with no
// router, and none of them loads another's code.
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
        v1: page('./v1/index.html'),
        v2: page('./v2/index.html'),
        v3: page('./v3/index.html'),
        compare: page('./compare/index.html'),
      },
    },
  },
})
