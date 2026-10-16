import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5950, strictPort: true, host: true },
  preview: { port: 5950, strictPort: true },
  test: {},
});
