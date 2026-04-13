import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const shouldAutoResetSchema = () => {
  if (process.env.DB_FORCE_RESET_ON_MISMATCH === 'true') return true;
  if (process.env.DB_FORCE_RESET_ON_MISMATCH === 'false') return false;
  return process.env.NODE_ENV !== 'production';
};

const getUsersIdType = async () => {
  const result = await pool.query(
    `SELECT data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'`
  );

  return result.rows[0]?.data_type || null;
};

const resetPublicSchema = async () => {
  console.warn('[WARN] Resetting public schema due to incompatible legacy schema types');
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('CREATE SCHEMA public');
};

const initializeDatabase = async () => {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    const usersIdType = await getUsersIdType();
    if (usersIdType && usersIdType !== 'uuid') {
      if (!shouldAutoResetSchema()) {
        throw new Error(
          `Incompatible users.id type found (${usersIdType}). Set DB_FORCE_RESET_ON_MISMATCH=true for lab reset.`
        );
      }
      await resetPublicSchema();
      await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    }

    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('[OK] Database schema initialized successfully');
  } catch (error) {
    console.error('[ERROR] Database initialization error:', error.message);
    throw error;
  }
};

export default initializeDatabase;
