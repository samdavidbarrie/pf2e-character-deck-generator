import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/pf2e-character-deck-generator/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
