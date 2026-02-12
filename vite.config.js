import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/proxy': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, ''),
      }
    },
  },
});