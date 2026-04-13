import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const baseConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'chatapp',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    };

const pool = new Pool({
  ...baseConfig,
  max: Number(process.env.DB_POOL_MAX || 20),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
});

pool.on('connect', () => {
  console.log('[OK] Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('[ERROR] Database pool error:', err.message);
});

export default pool;
