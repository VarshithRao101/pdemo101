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
        student: resolve(__dirname, 'student/index.html'),
        admin1: resolve(__dirname, 'admin1/index.html'),
        admin2: resolve(__dirname, 'admin2/index.html'),
        admin3: resolve(__dirname, 'admin3/index.html'),
        accountant: resolve(__dirname, 'accountant/index.html'),
        authenticator: resolve(__dirname, 'authenticator/index.html'),
      }
    }
  }
})

