import path from "path"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // 2. Add this alias block
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://chatpulse-backend:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://chatpulse-backend:5000',
        changeOrigin: true,
      },
    },
  },
});