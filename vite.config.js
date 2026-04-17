import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    server: {
        port: 5173,
        proxy: {
            // All /api/* requests from the browser are forwarded to FastAPI on :8000
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    optimizeDeps: {
        include: [
            '@splinetool/react-spline',
            '@splinetool/runtime',
        ],
        esbuildOptions: {
            target: 'esnext',
        },
    },
    build: {
        target: 'esnext',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
