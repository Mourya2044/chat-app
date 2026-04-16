import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
