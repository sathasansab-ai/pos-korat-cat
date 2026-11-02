import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative path so it can run on any web hosting or offline relative directory
  server: {
    port: 3000,
    open: true
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-dexie': ['dexie', 'dexie-react-hooks'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  }
});
