import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { metaPolicy } = require('./server/security/csp.cjs') as { metaPolicy: () => string }

/**
 * Writes the Content Security Policy into index.html at build time.
 *
 * The policy has to travel in the document because Hostinger's edge rewrites
 * the CSP header on every proxied response, so the meta copy is the only one
 * a browser ever sees. Injecting it here rather than hand-writing it into
 * index.html means the tag cannot fall out of step with the header the server
 * sends — both come from server/security/csp.cjs.
 *
 * The placeholder must exist. A silently missing policy is exactly the kind
 * of failure this whole arrangement is meant to prevent, so a build without
 * it fails loudly instead.
 */
function cspMetaPlugin(): Plugin {
  const PLACEHOLDER = '<!--CSP-->'
  return {
    name: 'inject-csp-meta',
    transformIndexHtml(html) {
      if (!html.includes(PLACEHOLDER)) {
        throw new Error(
          `index.html is missing the ${PLACEHOLDER} placeholder — the Content Security Policy ` +
          'has nowhere to go, and the header alone does not survive the edge.'
        )
      }
      const tag = `<meta http-equiv="Content-Security-Policy" content="${metaPolicy()}" />`
      return html.replace(PLACEHOLDER, tag)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspMetaPlugin()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000'
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
})
