import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
    // Polling-based file watching. Avoids hitting Linux's
    // fs.inotify.max_user_instances limit (default 128 on many distros)
    // which Node's watcher pattern exhausts quickly. CPU cost is negligible
    // for this project size. Set VITE_NO_POLL=1 to opt out.
    watch: process.env.VITE_NO_POLL
      ? undefined
      : {
          usePolling: true,
          interval: 300,
        },
  },
});
