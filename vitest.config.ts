import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Only the pure modules are tested here — matching and API mapping. They import
 * their app types with `import type`, which is erased before the test runs, so
 * nothing in this config has to resolve Expo's asset or native modules.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
