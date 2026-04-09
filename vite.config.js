import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/lab-inventory/',   // matches your GitHub Pages URL
  build: {
    outDir: 'docs',          // GitHub Pages can serve from /docs
  },
})
