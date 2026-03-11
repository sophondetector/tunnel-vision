import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        pdfReader: "pages/pdf-reader.html"
      }
    }
  },
  plugins: [crx({ manifest })]
})
