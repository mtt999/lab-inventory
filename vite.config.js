import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Ilab/',   // matches GitHub Pages URL: mtt999.github.io/Ilab
  build: {
    outDir: 'docs',
  },
})
