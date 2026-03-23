import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
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
  plugins: [
    tailwindcss(),
    crx({ manifest })
  ]
})
