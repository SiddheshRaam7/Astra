import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
if (!process.env.DATABASE_URL)
  throw new Error('Set DATABASE_URL to your Tiger Data PostgreSQL connection URL.');
const client = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
try {
  await client.unsafe(
    await readFile(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8'),
  );
  console.log('Migration applied. Demo data seeds per session on first access.');
} finally {
  await client.end();
}
