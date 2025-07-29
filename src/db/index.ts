import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL

if (databaseUrl === undefined) {
    throw new Error('Missing database environment variables')
}

const client = postgres(databaseUrl)
export const db = drizzle(client)
