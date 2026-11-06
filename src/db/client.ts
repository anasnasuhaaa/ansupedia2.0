import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { databaseUrl } from '../lib/env';
let instance: ReturnType<typeof createDatabase> | undefined;
function createDatabase() {
  const sql = postgres(databaseUrl(), {
    max: 3,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(sql, { schema });
}
export function getDb() {
  return (instance ??= createDatabase());
}
