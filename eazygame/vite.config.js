import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensure environment variables are available at build time
    'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production'),
  },
  build: {
    // Ensure environment variables are properly replaced
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
