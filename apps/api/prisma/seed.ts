import { PrismaClient } from '@prisma/client';
import {
  LOCAL_USER_ID,
  LOCAL_USER_EMAIL,
  LOCAL_USER_NAME,
  DEFAULT_TIMEZONE,
} from '../src/config.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Idempotent upsert — running `prisma db seed` repeatedly on the same
  // database leaves the user row in its intended state without duplication
  // errors. This is the acceptance contract: clean DB seed = exactly one
  // row; repeated seed = same exactly one row.
  const user = await prisma.user.upsert({
    where: { id: LOCAL_USER_ID },
    update: {
      email: LOCAL_USER_EMAIL,
      name: LOCAL_USER_NAME,
      timezone: DEFAULT_TIMEZONE,
    },
    create: {
      id: LOCAL_USER_ID,
      email: LOCAL_USER_EMAIL,
      name: LOCAL_USER_NAME,
      timezone: DEFAULT_TIMEZONE,
    },
  });

  console.log(`[seed] upserted user ${user.id} (${user.email}, tz=${user.timezone})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('[seed] failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
