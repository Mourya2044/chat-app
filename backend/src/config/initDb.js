import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const initializeDatabase = async () => {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('[OK] Database schema initialized successfully');
  } catch (error) {
    console.error('[ERROR] Database initialization error:', error.message);
    throw error;
  }
};

export default initializeDatabase;
