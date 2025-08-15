import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    sourcemap: false, // no generar source maps en producción (protege mejor tu código)
  },
})
