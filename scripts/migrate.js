// Minimal forward-only migration runner. Applies db/migrations/*.sql in order,
// each in a transaction, tracking applied files in a `_migrations` table.
// Works the same in CI (local Postgres) and against Neon. Generate new SQL with
// `npm run db:generate` (drizzle-kit), then `npm run db:migrate` to apply.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');

async function main() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query(
    'create table if not exists _migrations (name text primary key, applied_at timestamptz default now())',
  );
  const applied = new Set((await client.query('select name from _migrations')).rows.map((r) => r.name));
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sqlText = readFileSync(join(dir, file), 'utf8');
    console.log('applying', file);
    await client.query('begin');
    try {
      await client.query(sqlText);
      await client.query('insert into _migrations(name) values($1)', [file]);
      await client.query('commit');
      count++;
    } catch (e) {
      await client.query('rollback');
      console.error('migration failed:', file, '-', e.message);
      await client.end();
      process.exit(1);
    }
  }
  await client.end();
  console.log(count ? `applied ${count} migration(s)` : 'migrations already up to date');
}

main();
