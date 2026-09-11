import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Phase 23: AppShell's staging-layer fetch calls hit the real backend
    // directly by relative path (no auth cookie involved yet, so a proxy is
    // simpler than adding backend CORS headers for a route that isn't gated).
    proxy: {
      '/data-api': 'http://localhost:3001',
    },
  },
})
