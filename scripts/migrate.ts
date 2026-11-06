import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { databaseUrl } from '../src/lib/env';
const url = databaseUrl();
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname) &&
  !process.argv.includes('--production-authorized')
)
  throw new Error('Remote migrations require explicit authorization and --production-authorized.');
const sql = postgres(url, { max: 1, prepare: false });
try {
  await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
  console.log('Versioned migrations applied.');
} finally {
  await sql.end();
}
