// Drizzle Kit config — generates SQL migrations from db/schema.js.
// `npm run db:generate` writes versioned SQL into db/migrations/.
// `npm run db:migrate` applies them (needs DATABASE_URL).
export default {
  schema: './db/schema.js',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL || '' },
};
