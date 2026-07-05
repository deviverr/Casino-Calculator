import { defineConfig } from 'vite';

export default defineConfig({
  // relative base so the build works on GitHub Pages project sites and in Docker
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
  },
});
