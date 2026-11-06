import 'dotenv/config';
import { getDb } from '../src/db/client';
import { categories } from '../src/db/schema';
const names = [
  'Software Engineering',
  'Cybersecurity',
  'CTF Writeups',
  'Web Development',
  'DevOps',
  'Learning Notes',
  'Personal',
];
await getDb()
  .insert(categories)
  .values(names.map((name) => ({ name, slug: name.toLowerCase().replaceAll(' ', '-') })))
  .onConflictDoNothing();
console.log('Category seed complete; no articles created.');
process.exit(0);
