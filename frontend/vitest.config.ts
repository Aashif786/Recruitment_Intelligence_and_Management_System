import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['hooks/**', 'modules/**', 'components/**', 'lib/**'],
      exclude: ['**/node_modules/**', '**/.next/**'],
    },
    include: [
      '**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      '**/node_modules/**', 
      '**/dist/**', 
      '**/.next/**', 
      '**/cypress/**', 
      '**/.{idea,git,cache,output,temp}/**',
      '**/tests/**' // Exclude playwright e2e tests folder
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
