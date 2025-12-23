import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Use environment variable for base path, default to empty for all environments
// For localhost: base is '/' (no subpath needed)
// For production: base is '/' (no subpath needed, using subdomain instead)
export default defineConfig(({ mode }) => {
  // Use root path for all environments (subdomain handles routing)
  const basePath = process.env.VITE_BASE_PATH || '/';
  
  return {
    plugins: [react()],
    base: basePath,
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
})
