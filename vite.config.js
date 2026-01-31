import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // When deployed to GitHub Pages, this app is served from a subpath:
  // https://owleggsbot.github.io/tic-tac-toe/
  base: '/tic-tac-toe/',
  plugins: [react()],
})
