import { defineConfig } from 'vite'

export default defineConfig({
  // This project intentionally does not use @vitejs/plugin-react. Tell
  // esbuild to import the JSX runtime so production bundles never expect a
  // global `React` variable in the browser.
  esbuild: {
    jsx: 'automatic',
  },
  // Keep generated asset URLs portable between the custom domain and the
  // repository-scoped github.io URL.
  base: './',
})
