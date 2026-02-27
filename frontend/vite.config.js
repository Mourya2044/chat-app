import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://chatpulse-backend:5000',  // ← container name, not localhost
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://chatpulse-backend:5000',  // ← same here
        changeOrigin: true,
      },
    },
  },
});