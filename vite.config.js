import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ilab/',   // matches new GitHub Pages URL: mtt999.github.io/ilab
  build: {
    outDir: 'docs',          // GitHub Pages serves from /docs
  },
})
