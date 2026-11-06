import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { z } from 'zod';
import { getDb } from '../src/db/client';
import { user, account } from '../src/db/schema';
import { sql } from 'drizzle-orm';
const email = z.email().parse(process.env.SEED_ADMIN_EMAIL);
const password = z.string().min(12).max(128).parse(process.env.SEED_ADMIN_PASSWORD);
const hash = await hashPassword(password);
await getDb().transaction(async (tx) => {
  await tx.execute(sql`select pg_advisory_xact_lock(71918203)`);
  const existing = await tx.select({ id: user.id }).from(user).limit(1);
  if (existing.length) throw new Error('Bootstrap refused: an account already exists.');
  const id = randomUUID();
  await tx
    .insert(user)
    .values({ id, name: 'Anas Nasuha', email, emailVerified: true, role: 'admin' });
  await tx
    .insert(account)
    .values({
      id: randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: hash,
    });
});
console.log(
  'Administrator created. Remove SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD from .env now.',
);
process.exit(0);
