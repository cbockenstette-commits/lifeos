// Global test setup. Runs once before any test file.
//
// 1. Load env from the repo-root .env (via the symlinked apps/api/.env)
// 2. Swap DATABASE_URL to point at lifeos_test
// 3. Export a buildTestApp helper that reuses the production buildApp()
//
// Per-test isolation uses TRUNCATE (see resetDb in helpers/reset.ts).

import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL_TEST) {
  throw new Error('DATABASE_URL_TEST is not set in .env — cannot run tests');
}

// Swap BEFORE any module that imports PrismaClient loads.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
