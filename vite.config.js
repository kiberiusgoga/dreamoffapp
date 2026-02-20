import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
    },
    server: {
        proxy: {
            // Forward /api requests to Express backend during development
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            }
        }
    }
})
