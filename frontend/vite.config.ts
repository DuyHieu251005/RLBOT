import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/styles': path.resolve(__dirname, './styles'),
    },
  },

  server: {
    port: 3000,
    open: false,  // Disabled - start.bat will open browser instead
    // Cải thiện HMR
    hmr: {
      overlay: true,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Tắt sourcemap cho production để giảm size
    // Tối ưu chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Tách vendor libraries
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', 'framer-motion'],
          'radix-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-toast',
          ],
        },
      },
    },
    // Tối ưu minification
    minify: 'esbuild',
    // Giới hạn chunk size warning
    chunkSizeWarningLimit: 1000,
  },
  // Tối ưu dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
})