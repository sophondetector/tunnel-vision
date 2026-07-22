import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  base: './',
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        options: "pages/options.html"
      }
    }
  },
  plugins: [
    tailwindcss(),
    crx({ manifest })
  ],
  server: {
    hmr: {
      host: 'localhost',
    },
    cors: true,
    fs: {
      strict: false,
    },
  },
});
