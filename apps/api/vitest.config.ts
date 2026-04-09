import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 30000,
    // setupFiles runs BEFORE any test module loads — used to swap
    // DATABASE_URL to the test DB before Prisma client initializes.
    setupFiles: ['./tests/setup.ts'],
    // Run tests serially so TRUNCATE doesn't stomp on parallel writes.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
