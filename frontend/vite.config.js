import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Tiny Vite plugin that stamps a build timestamp into public/sw.js
 * so the service worker cache name auto-bumps on every production build.
 * No more manual version bumps.
 */
function swVersionStamp() {
  return {
    name: 'sw-version-stamp',
    writeBundle({ dir }) {
      const outDir = dir || 'dist'
      const swPath = path.resolve(outDir, 'sw.js')
      if (!fs.existsSync(swPath)) return
      const contents = fs.readFileSync(swPath, 'utf-8')
      const stamped = contents.replace('__BUILD_TS__', Date.now().toString(36))
      fs.writeFileSync(swPath, stamped)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swVersionStamp()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8122',
      '/ws': { target: 'ws://localhost:8122', ws: true },
    },
  },
})
