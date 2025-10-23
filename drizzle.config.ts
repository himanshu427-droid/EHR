// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql', // 👈 This tells Drizzle it's Postgres
  schema: './server/db/schema.ts', // 👈 Point to your schema.ts file
  out: './drizzle', // 👈 Where to put migration files
  dbCredentials: {
    url: process.env.DATABASE_URL!, // 👈 Your Neon connection string
  },
  verbose: true,
  strict: true,
});