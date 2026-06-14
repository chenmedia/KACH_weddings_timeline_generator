// Neon (serverless HTTP driver) + Drizzle. Lazy singleton so cold starts that
// don't touch the DB pay nothing, and so the module imports cleanly without env.
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../../db/schema.js';

let _db;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

export { schema };
