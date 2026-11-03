import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { benchmarkData } from './scripts/benchmark-data.ts';
import { firstPaint } from './scripts/first-paint.ts';

export default defineConfig({
  plugins: [benchmarkData(), react(), tailwindcss(), firstPaint()],
  test: { exclude: [...configDefaults.exclude, 'tests/browser/**'] },
});
