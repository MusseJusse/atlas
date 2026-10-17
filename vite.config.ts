import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { benchmarkData } from './scripts/benchmark-data.ts';

export default defineConfig({ plugins: [benchmarkData(), react(), tailwindcss()] });
