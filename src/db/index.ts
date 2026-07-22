import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined) {
  throw new Error("Missing database environment variables");
}

// max: 1 — one connection per serverless function instance avoids pool exhaustion.
// prepare: false — required for Supabase transaction-mode pooler (port 6543),
// which does not support prepared statements. Set DATABASE_URL to the pooler URL
// from Supabase → Settings → Database → Connection pooling (Transaction mode).
const client = postgres(databaseUrl, { max: 1, prepare: false });
export const db = drizzle(client);
