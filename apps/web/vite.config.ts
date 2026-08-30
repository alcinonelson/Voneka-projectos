import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // O frontend fala sempre com /api; o proxy evita CORS em desenvolvimento e faz o
      // cookie de refresh viajar na mesma origem.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
