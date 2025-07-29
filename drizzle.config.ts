import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

const dataBaseUrl = process.env.DATABASE_URL

if (!dataBaseUrl) {
    throw new Error('Missing Database environment variables')
}

export default defineConfig({
  dbCredentials: {
    url: dataBaseUrl,
  },
  dialect: 'postgresql',
  out: './supabase/migrations',
  schema: './src/db/schema.ts',
});
