import { defineConfig } from 'vite'

export default defineConfig({
  // Keep generated asset URLs portable between the custom domain and the
  // repository-scoped github.io URL.
  base: './',
})
