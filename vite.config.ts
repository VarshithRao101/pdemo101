import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin1: resolve(__dirname, 'inspire-rect-admin-sys-1a2b/index.html'),
        admin2: resolve(__dirname, 'inspire-princ-admin-sys-3c4d/index.html'),
        accountant: resolve(__dirname, 'inspire-acc-finance-sys-7g8h/index.html'),
        authenticator: resolve(__dirname, 'inspire-secure-auth-sys-9i0j/index.html'),
      }
    }
  }
})

