import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Use environment variable for base path, default to empty for localhost development
// In production, set VITE_BASE_PATH=/stock-management
// For localhost: base is '/' (no subpath needed)
// For production: base is '/stock-management' (set via VITE_BASE_PATH env var)
export default defineConfig(({ mode }) => {
  // In development mode, use root path. In production, use subpath if env var is set
  const basePath = mode === 'development' ? '/' : '/stock-management';
  
  return {
    plugins: [react()],
    base: basePath,
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
})
