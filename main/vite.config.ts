import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  ...(mode === 'preview' ? { define: {
    'import.meta.env.VITE_SERVICE_MODE': '"preview"',
    'import.meta.env.VITE_API_BASE_URL': '""',
  } } : {}),
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
}));
