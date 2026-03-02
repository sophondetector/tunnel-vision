import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        app: "pages/index.html",
        pdfReader: "pages/pdf-reader.html"
      }
    }
  },
  plugins: [crx({ manifest })]
})
