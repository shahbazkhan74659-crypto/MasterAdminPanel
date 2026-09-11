import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Phase 23: AppShell's staging-layer fetch calls hit the real backend
    // directly by relative path (no auth cookie involved yet, so a proxy is
    // simpler than adding backend CORS headers for a route that isn't gated).
    // Phase 24a: /auth-api added so the session cookie is set same-origin too --
    // no CORS package needed.
    proxy: {
      '/data-api': 'http://localhost:3001',
      '/auth-api': 'http://localhost:3001',
    },
    // Allows Vite's dev-server host check to accept requests arriving through an
    // ngrok tunnel (used for occasional remote testing) -- not a production setting.
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io'],
  },
})
