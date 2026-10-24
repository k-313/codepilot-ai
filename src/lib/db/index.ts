import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

// Global singleton caching to avoid multiple instances across Next.js hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __dbInstance: any;
  // eslint-disable-next-line no-var
  var __pgliteClient: PGlite | null;
  // eslint-disable-next-line no-var
  var __postgresClient: postgres.Sql | null;
}

let db: any;
let isEmbedded = false;

function getMigrationSql(): string[] {
  try {
    const migrationDir = path.resolve(process.cwd(), 'drizzle');
    if (!fs.existsSync(migrationDir)) return [];
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'));
    files.sort();

    const statements: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
      const parts = content.split('--> statement-breakpoint');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          statements.push(trimmed);
        }
      }
    }
    return statements;
  } catch (err) {
    console.warn('[DB] Warning loading migrations for embedded DB:', err);
    return [];
  }
}

export async function initDb() {
  if (global.__dbInstance) {
    return { db: global.__dbInstance, isEmbedded };
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl && !databaseUrl.includes('placeholder')) {
    try {
      const client = postgres(databaseUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        onnotice: () => {},
      });
      db = drizzlePostgres(client, { schema });
      global.__dbInstance = db;
      global.__postgresClient = client;
      isEmbedded = false;
      return { db, isEmbedded: false };
    } catch (err) {
      console.warn('[DB] Failed to connect to DATABASE_URL, falling back to embedded PGlite:', err);
    }
  }

  // Fallback to embedded PGlite
  isEmbedded = true;
  // Store pglite data in local .pgdata folder or in-memory
  const dataDir = process.env.NODE_ENV === 'test' 
    ? undefined 
    : path.resolve(process.cwd(), '.pgdata');
  
  if (dataDir && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const pglite = dataDir ? new PGlite(dataDir) : new PGlite();
  await pglite.waitReady;

  // Run initial schema migration statements if tables don't exist
  const statements = getMigrationSql();
  for (const sql of statements) {
    try {
      await pglite.exec(sql);
    } catch (e: any) {
      // Ignore "already exists" errors
      if (!e.message?.includes('already exists')) {
        console.warn('[DB Embedded Init] Notice:', e.message);
      }
    }
  }

  db = drizzlePglite(pglite, { schema });
  global.__dbInstance = db;
  global.__pgliteClient = pglite;

  return { db, isEmbedded: true };
}

// Synchronous getter (returns existing instance or starts initialization)
export function getDb() {
  if (global.__dbInstance) {
    return global.__dbInstance;
  }
  // If not yet initialized, initialize synchronously or throw clear error
  throw new Error('Database not initialized. Call await initDb() before accessing getDb()');
}

export { schema };
export * from './schema';
