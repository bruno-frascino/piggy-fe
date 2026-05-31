import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/mock-*.ts', 'src/lib/types.ts'],
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 45,
      },
    },
  },
});
