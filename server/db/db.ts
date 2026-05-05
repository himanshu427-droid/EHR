import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// This is crucial for loading your DATABASE_URL from the .env file
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set!');
}

const sql = neon(connectionString);

// This is the 'db' object your storage.ts file needs
export const db = drizzle(sql, { schema });