import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    css: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      // lcov is consumed by SonarQube Cloud; the others are for humans locally.
      reporter: ['text-summary', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['**/*.test.{js,jsx}', 'src/test/**'],
    },
  },
});
