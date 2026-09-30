import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export function isCloudSqlConfigured(): boolean {
  const host = (process.env.SQL_HOST || '').trim();
  const dbName = (process.env.SQL_DB_NAME || '').trim();
  if (!host || !dbName) return false;
  if (host.includes('instance-connection-name')) return false;
  return true;
}

export const createPool = (): Pool | null => {
  if (!isCloudSqlConfigured()) {
    return null;
  }
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 5000,
    });

    global._postgresPool.on('error', (err) => {
      console.warn('SQL pool client notice:', err.message);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = pool ? drizzle(pool, { schema }) : null;
